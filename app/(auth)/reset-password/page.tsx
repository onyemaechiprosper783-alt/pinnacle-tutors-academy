'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setError(
          'This password reset link is invalid or has expired. Please request a new one.'
        );
      }

      setCheckingSession(false);
    }

    checkSession();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError('');

    if (password.length < 6) {
      setError('Your password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setLoading(false);
      setError(
        updateError.message ||
          'Unable to reset your password. Please request a new reset link.'
      );
      return;
    }

    setLoading(false);
    setSuccess(true);

    await supabase.auth.signOut();
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">

          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
              <img
                src="/pinnacle-logo.png"
                alt="Pinnacle Tutors Academy"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

            <p className="mt-4 text-sm font-semibold text-slate-500">
              Checking your reset link...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">

          <div className="mb-8 flex justify-center">
            <Link href="/login">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
                <img
                  src="/pinnacle-logo.png"
                  alt="Pinnacle Tutors Academy"
                  className="h-full w-full object-contain"
                />
              </div>
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-8">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✓
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
              Pinnacle Tutors Academy
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              Password updated!
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Your password has been successfully changed. You can now log in
              with your new password.
            </p>

            <Link
              href="/login"
              className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
            >
              Go to Login →
            </Link>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-slate-400">
            🎓 Practice today. Improve tomorrow. Succeed with Pinnacle.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">

        {/* LOGO */}
        <div className="mb-8 flex justify-center">
          <Link href="/login">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
              <img
                src="/pinnacle-logo.png"
                alt="Pinnacle Tutors Academy"
                className="h-full w-full object-contain"
              />
            </div>
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
            Pinnacle Tutors Academy
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Create a new password
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose a strong password for your Pinnacle Tutors account.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6" noValidate>
            <div className="mb-4">
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-bold text-slate-700"
              >
                New password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter your new password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-bold text-slate-700"
              >
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter your password again"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <p className="mb-5 text-xs font-medium leading-5 text-slate-400">
              Use at least 6 characters. For better security, use a mixture
              of letters, numbers and symbols.
            </p>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              className="mt-1"
            >
              Update Password
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <Link
              href="/login"
              className="text-sm font-black text-emerald-700 transition hover:text-emerald-800"
            >
              ← Back to Login
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-slate-400">
          🎓 Practice today. Improve tomorrow. Succeed with Pinnacle.
        </p>
      </div>
    </main>
  );
}
