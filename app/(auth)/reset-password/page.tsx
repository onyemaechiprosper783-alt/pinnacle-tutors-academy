'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    setLoading(true);

    // Supabase reads the recovery token from the URL fragment automatically
    // and establishes a temporary session, so this just updates the user.
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    setLoading(false);

    if (updateError) {
      setError('This reset link has expired. Request a new one.');
      return;
    }

    router.push('/login?reset=1');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Set a new password</h1>
      <p className="mb-6 text-slate-500">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="New password" name="password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <Button type="submit" fullWidth loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  );
}
