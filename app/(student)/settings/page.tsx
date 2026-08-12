'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const supabase = createClient();
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

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Settings</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Change Password</h2>
        {success && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700">Password updated.</div>}
        <form onSubmit={handleChangePassword}>
          <FormField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
          <Button type="submit" loading={loading}>Update password</Button>
        </form>
      </section>
    </div>
  );
}
