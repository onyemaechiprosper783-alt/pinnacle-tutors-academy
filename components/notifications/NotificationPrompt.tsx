'use client';

import { useEffect, useState } from 'react';

const REMINDER_KEY = 'pinnacle-notification-reminders';
const REMINDER_LIMIT = 3;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function readReminders() {
  try {
    const value = JSON.parse(localStorage.getItem(REMINDER_KEY) ?? '{}') as { weekStart?: number; count?: number };
    const now = Date.now();
    if (!value.weekStart || now - value.weekStart >= WEEK_MS) return { weekStart: now, count: 0 };
    return { weekStart: value.weekStart, count: value.count ?? 0 };
  } catch { return { weekStart: Date.now(), count: 0 }; }
}

function saveReminders(value: { weekStart: number; count: number }) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(value));
}

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const openPrompt = () => setVisible(true);
    window.addEventListener('pinnacle:open-notification-prompt', openPrompt);
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || Notification.permission !== 'default') return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);

    const reminders = readReminders();
    if (reminders.count < REMINDER_LIMIT) {
      reminders.count += 1;
      saveReminders(reminders);
      setVisible(true);
    }
    return () => window.removeEventListener('pinnacle:open-notification-prompt', openPrompt);
  }, []);

  async function enableNotifications() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setVisible(false); return; }
      setVisible(false);
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
      const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error('Subscription failed');
    } catch (error) {
      console.error('Notification setup failed:', error);
    } finally { setBusy(false); }
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
            <button type="button" onClick={() => setVisible(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--background)]">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
