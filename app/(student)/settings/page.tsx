'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/components/ThemeProvider';

export default function SettingsPage() {
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setSuccess(true);
    setPassword('');
  }

  const themes = [
    { value: 'light' as const, label: 'Light', icon: '☀️', description: 'Always use light mode' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙', description: 'Always use dark mode' },
    { value: 'system' as const, label: 'System', icon: '⚙️', description: 'Follow your phone settings' },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Personalize your Pinnacle experience.</p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="mb-1 font-bold text-[var(--foreground)]">Appearance</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">Choose how Pinnacle should look.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((item) => {
            const selected = theme === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTheme(item.value)}
                aria-pressed={selected}
                className={`rounded-2xl border-2 p-4 text-left transition ${selected ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'border-[var(--border)] bg-[var(--background)] hover:border-orange-300'}`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="mt-2 block font-black text-[var(--foreground)]">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-[var(--foreground)]">Change Password</h2>
        {success && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700">Password updated.</div>}
        <form onSubmit={handleChangePassword}>
          <FormField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
          <Button type="submit" loading={loading}>Update password</Button>
        </form>
      </section>
    </div>
  );
}
