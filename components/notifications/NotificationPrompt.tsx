'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'pinnacle-notification-prompt-dismissed';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function dismissPrompt() {
  localStorage.setItem(DISMISSED_KEY, '1');
}

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
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

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismissPrompt();
        setVisible(false);
        return;
      }

      // Register the worker and then wait for the browser to report it as ready.
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      if (!registration.pushManager) {
        throw new Error('Push notifications are not supported by this service worker.');
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(`Subscription persistence failed (${response.status})${details ? `: ${details}` : ''}`);
      }

      dismissPrompt();
      setVisible(false);
    } catch (error) {
      console.error('Notification setup failed:', error);
      // Do not leave the button permanently stuck if setup fails.
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
