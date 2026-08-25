import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function configureWebPush() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPushToStudents(payload: PushPayload) {
  if (!configureWebPush()) return { sent: 0, skipped: true };

  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error || !subscriptions?.length) return { sent: 0, skipped: false };

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload)
      ).catch(async (pushError: unknown) => {
        const statusCode = (pushError as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id);
        }
        throw pushError;
      })
    )
  );

  return { sent: results.filter((result) => result.status === 'fulfilled').length, skipped: false };
}
