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

function dismissPrompt() {
  localStorage.setItem(DISMISSED_KEY, '1');
}

async function getReadyRegistration() {
  let registration = await navigator.serviceWorker.getRegistration('/');

  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
    });
  }

  if (registration.active) return registration;

  return withTimeout(
    navigator.serviceWorker.ready,
    'The service worker did not become ready. Please reload the app and try again.',
  );
}

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return;

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.');
      return;
    }

    if (Notification.permission !== 'default') {
      dismissPrompt();
      return;
    }

    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    setVisible(true);
  }, []);

  async function enableNotifications() {
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? 'Notifications are blocked for Pinnacle Tutors. Allow notifications in your browser/site settings, then try again.'
            : 'Notification permission was not granted.'
        );
      }

      const registration = await getReadyRegistration();

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
          }),
          'Push subscription timed out. Please reload the app and try again.',
        );
      }

      const response = await withTimeout(
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        }),
        'Saving the notification subscription timed out. Please try again.',
      );

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(
          `Could not save the notification subscription (${response.status})${details ? `: ${details}` : ''}`
        );
      }

      // Give the user an immediate, local confirmation. This also verifies that
      // the active service worker can display notifications on the device.
      await registration.showNotification('Pinnacle Tutors Academy', {
        body: 'Notifications are now enabled successfully. 🎉',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pinnacle-notification-enabled',
        data: { url: '/announcements' },
      });

      dismissPrompt();
      setVisible(false);
    } catch (error) {
      console.error('Notification setup failed:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Could not enable notifications. Please try again.'
      );
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

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={enableNotifications} disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-brand-900/20 transition hover:bg-brand-700 disabled:opacity-60">
              {busy ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button type="button" onClick={() => { dismissPrompt(); setVisible(false); }} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--background)] disabled:opacity-60">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
