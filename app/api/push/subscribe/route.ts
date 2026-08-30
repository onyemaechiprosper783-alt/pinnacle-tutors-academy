import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    console.error('Push subscription persistence error:', error);
    return NextResponse.json({ error: 'Could not save notification subscription.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  if (!endpoint) return NextResponse.json({ error: 'Endpoint is required.' }, { status: 400 });

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
