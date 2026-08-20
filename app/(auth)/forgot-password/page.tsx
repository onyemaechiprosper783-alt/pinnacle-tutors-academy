'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { forgotPasswordSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
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
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">
          <div className="mb-8 flex justify-center"><Link href="/login"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200"><img src="/pinnacle-logo.png" alt="Pinnacle Tutors Academy" className="h-full w-full object-contain" /></div></Link></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-5 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✉️</div><h1 className="mt-4 text-2xl font-black text-slate-900">Check your email</h1><p className="mt-2 text-sm leading-6 text-slate-500">If an account exists for <span className="font-bold text-slate-700">{email}</span>, we&apos;ve sent a link to reset your password.</p></div>
            <Link href="/login" className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700">← Back to Login</Link>
          </div>
          <p className="mt-6 text-center text-xs font-medium text-slate-400">Pinnacle Tutors Academy</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">
        <div className="mb-8 flex justify-center"><Link href="/login"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200"><img src="/pinnacle-logo.png" alt="Pinnacle Tutors Academy" className="h-full w-full object-contain" /></div></Link></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Pinnacle Tutors Academy</p><h1 className="mt-2 text-2xl font-black text-slate-900">Reset your password</h1><p className="mt-2 text-sm leading-6 text-slate-500">Enter your email and we&apos;ll send you a secure link to reset your password.</p></div>
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} noValidate><FormField label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} /><Button type="submit" fullWidth loading={loading} className="mt-2">Send Reset Link</Button></form>
          <div className="mt-6 border-t border-slate-100 pt-5 text-center"><Link href="/login" className="text-sm font-black text-emerald-700 transition hover:text-emerald-800">← Back to Login</Link></div>
        </div>
        <p className="mt-6 text-center text-xs font-medium text-slate-400">🎓 Practice today. Improve tomorrow. Succeed with Pinnacle.</p>
      </div>
    </main>
  );
}
