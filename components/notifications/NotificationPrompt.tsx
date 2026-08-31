'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'pinnacle-notification-prompt-dismissed';
const OPERATION_TIMEOUT_MS = 15000;

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function withTimeout<T>(promise: Promise<T>, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), OPERATION_TIMEOUT_MS);
    }),
  ]);
}

function getPublicVapidKey() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error('Push notifications are not configured on this deployment.');
  return key;
}

async function getReadyRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing?.active) return existing;

  if (!existing) {
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  }

  return withTimeout(
    navigator.serviceWorker.ready,
    'The notification service worker did not become ready. Please reload the app and try again.',
  );
}

async function ensureSubscription() {
  const registration = await getReadyRegistration();
  await registration.update().catch(() => {});

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getPublicVapidKey()),
      }),
      'Push subscription timed out. Please reload the app and try again.',
    );
  }

  const response = await withTimeout(
    fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
      credentials: 'same-origin',
    }),
    'Saving your notification subscription timed out. Please try again.',
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(details || `Could not save notification subscription (${response.status}).`);
  }

  return { registration, subscription };
}

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setError('Push notifications are not configured correctly.');
        setVisible(true);
        return;
      }

      // If permission was already granted during a previous failed attempt,
      // do not hide the prompt. Re-sync the subscription with the server.
      if (Notification.permission === 'granted') {
        try {
          await ensureSubscription();
          if (!cancelled) {
            localStorage.setItem(DISMISSED_KEY, '1');
            setVisible(false);
          }
        } catch (err) {
          if (!cancelled) {
            console.error('Notification resync failed:', err);
            setError(err instanceof Error ? err.message : 'Could not connect notifications.');
            setVisible(true);
          }
        }
        return;
      }

      if (Notification.permission === 'denied') {
        setError('Notifications are blocked for Pinnacle Tutors. Allow notifications in your phone/browser settings, then reload the app.');
        setVisible(true);
        return;
      }

      if (localStorage.getItem(DISMISSED_KEY) !== '1') setVisible(true);
    };

    void initialize();
    return () => { cancelled = true; };
  }, []);

  async function enableNotifications() {
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? 'Notifications are blocked. Open your phone/browser site settings, allow notifications for Pinnacle Tutors, then try again.'
            : 'Notification permission was not granted.'
        );
      }

      const { registration } = await ensureSubscription();

      // This local notification proves the browser + service worker path works
      // before relying on a remote Web Push delivery.
      await registration.showNotification('Pinnacle Tutors Academy', {
        body: 'Notifications are now enabled successfully. 🎉',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pinnacle-notification-enabled',
        data: { url: '/announcements' },
      });

      localStorage.setItem(DISMISSED_KEY, '1');
      setVisible(false);
    } catch (err) {
      console.error('Notification setup failed:', err);
      setError(err instanceof Error ? err.message : 'Could not enable notifications. Please try again.');
      setVisible(true);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-md rounded-3xl border border-accent-200 bg-[var(--card)] p-5 shadow-2xl shadow-brand-900/15 dark:border-accent-700 sm:inset-x-auto sm:right-6 sm:left-auto">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 text-2xl shadow-lg">🔔</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-[var(--foreground)]">Stay up to date</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Get important announcements, exam updates and study reminders from Pinnacle Tutors.</p>
          {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={enableNotifications} disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-brand-900/20 transition hover:bg-brand-700 disabled:opacity-60">
              {busy ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button type="button" onClick={() => { localStorage.setItem(DISMISSED_KEY, '1'); setVisible(false); }} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--background)] disabled:opacity-60">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
