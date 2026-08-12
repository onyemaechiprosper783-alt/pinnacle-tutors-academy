'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { forgotPasswordSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    setLoading(true);

    // Always show the same success state whether or not the email exists,
    // so this endpoint can't be used to enumerate registered accounts.
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Check your email</h1>
        <p className="text-slate-500">
          If an account exists for {email}, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/login" className="mt-6 font-semibold text-emerald-700">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mb-6 text-slate-500">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="Email" name="email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" fullWidth loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-emerald-700">
          Back to login
        </Link>
      </p>
    </div>
  );
}
