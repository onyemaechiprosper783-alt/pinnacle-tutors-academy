'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'pinnacle-notifications-dismissed';

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
    const openPrompt = () => setVisible(true);
    window.addEventListener('pinnacle:open-notification-prompt', openPrompt);

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);
    }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);
    }

    // Once the browser permission has been decided, never keep showing the prompt.
    if (Notification.permission !== 'default') {
      dismissPrompt();
      return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);
    }
    if (localStorage.getItem(DISMISSED_KEY) === '1') {
      return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);
    }

    setVisible(true);
    return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);
  }, []);

  async function enableNotifications() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismissPrompt();
        setVisible(false);
        return;
      }

      // Hide immediately after permission is granted; subscription can finish in the background.
      dismissPrompt();
      setVisible(false);

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error('Subscription failed');
    } catch (error) {
      console.error('Notification setup failed:', error);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        dismissPrompt();
        setVisible(false);
      }
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
            <button type="button" onClick={enableNotifications} disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-brand-900/20 transition hover:bg-brand-700 disabled:opacity-60">{busy ? 'Enabling…' : 'Enable notifications'}</button>
            <button type="button" onClick={() => { dismissPrompt(); setVisible(false); }} className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--background)]">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
