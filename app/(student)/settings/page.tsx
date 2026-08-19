'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/components/ThemeProvider';

const DISMISSED_KEY = 'pinnacle-notification-prompt-dismissed';

export default function SettingsPage() {
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'checking' | 'enabled' | 'available' | 'blocked' | 'unsupported'>('checking');
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setNotificationStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setNotificationStatus('blocked'); return; }
    navigator.serviceWorker.register('/sw.js').then((registration) =>
      registration.pushManager.getSubscription().then((subscription) => setNotificationStatus(subscription ? 'enabled' : 'available'))
    ).catch(() => setNotificationStatus('available'));
  }, []);

  async function enableNotifications() {
    if (!('Notification' in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    setNotificationBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setNotificationStatus('blocked'); return; }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(atob(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0)),
      });
      const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error('Could not save subscription');
      localStorage.setItem(DISMISSED_KEY, '1');
      setNotificationStatus('enabled');
    } catch (notificationError) {
      console.error('Notification setup failed:', notificationError);
    } finally { setNotificationBusy(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    const parsed = resetPasswordSchema.safeParse({ password });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError('');
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (updateError) { setError('Could not update password.'); return; }
    setSuccess(true); setPassword('');
  }

  const themes = [
    { value: 'light' as const, label: 'Light', icon: '☀️', description: 'Always use light mode' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙', description: 'Always use dark mode' },
    { value: 'system' as const, label: 'System', icon: '⚙️', description: 'Follow your phone settings' },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <div><h1 className="text-2xl font-black text-[var(--foreground)]">Settings</h1><p className="mt-1 text-sm text-[var(--muted)]">Personalize your Pinnacle experience.</p></div>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-[var(--foreground)]">Notifications</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">Get important announcements and study updates even when Pinnacle is closed.</p>
        {notificationStatus === 'enabled' && <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">🔔 Notifications are enabled on this device.</div>}
        {notificationStatus === 'available' && <button type="button" onClick={enableNotifications} disabled={notificationBusy} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60">{notificationBusy ? 'Enabling…' : 'Enable Notifications'}</button>}
        {notificationStatus === 'blocked' && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Notifications are blocked by your browser. Open your browser/site settings and allow notifications, then return here.</p>}
        {notificationStatus === 'unsupported' && <p className="rounded-xl bg-[var(--background)] px-4 py-3 text-sm leading-5 text-[var(--muted)]">Push notifications are not available in this browser or the app is missing its notification configuration.</p>}
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-[var(--foreground)]">Appearance</h2><p className="mb-4 text-sm text-[var(--muted)]">Choose how Pinnacle should look.</p>
        <div className="grid gap-3 sm:grid-cols-3">{themes.map((item) => { const selected = theme === item.value; return <button key={item.value} type="button" onClick={() => setTheme(item.value)} aria-pressed={selected} className={`rounded-2xl border-2 p-4 text-left transition ${selected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-[var(--border)] bg-[var(--background)] hover:border-indigo-300'}`}><span className="text-2xl">{item.icon}</span><span className="mt-2 block font-black text-[var(--foreground)]">{item.label}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{item.description}</span></button>; })}</div>
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-[var(--foreground)]">Change Password</h2>
        {success && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700">Password updated.</div>}
        <form onSubmit={handleChangePassword}><FormField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} /><Button type="submit" loading={loading}>Update password</Button></form>
      </section>
    </div>
  );
}
