'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'pinnacle-notification-prompt-dismissed';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    setVisible(true);
  }, []);

  async function enableNotifications() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        localStorage.setItem(DISMISSED_KEY, '1');
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) throw new Error('Subscription failed');
      localStorage.setItem(DISMISSED_KEY, '1');
      setVisible(false);
    } catch (error) {
      console.error('Notification setup failed:', error);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-md rounded-3xl border border-indigo-200 bg-[var(--card)] p-5 shadow-2xl shadow-indigo-950/20 dark:border-indigo-800 sm:inset-x-auto sm:right-6 sm:left-auto">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-2xl shadow-lg">🔔</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-[var(--foreground)]">Stay up to date</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Get important announcements, exam updates and study reminders from Pinnacle Tutors.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={enableNotifications} disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60">
              {busy ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button type="button" onClick={() => { localStorage.setItem(DISMISSED_KEY, '1'); setVisible(false); }} className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--background)]">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
