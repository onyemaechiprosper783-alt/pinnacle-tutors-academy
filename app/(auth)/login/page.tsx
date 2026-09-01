'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loginSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const next = params.get('next');
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          router.replace(next && next.startsWith('/admin') ? next : '/admin/dashboard');
        } else {
          router.replace(next && !next.startsWith('/admin') ? next : '/dashboard');
        }
        return;
      }
      setRestoringSession(false);
    };
    restoreSession();
    return () => { active = false; };
  }, [router, params, supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      const next = params.get('next');
      if (session.user) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data: profile }) => {
          if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            router.replace(next && next.startsWith('/admin') ? next : '/admin/dashboard');
          } else {
            router.replace(next && !next.startsWith('/admin') ? next : '/dashboard');
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [router, params, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setServerError('');
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) { const fieldErrors: Record<string, string> = {}; parsed.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as string] = issue.message; }); setErrors(fieldErrors); return; }
    setErrors({}); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) { setLoading(false); setServerError('Incorrect email or password.'); return; }
    const pendingAccessKey = data.user.user_metadata?.pending_access_key;
    if (pendingAccessKey) {
      const { error: claimError } = await supabase.rpc('claim_access_key', { p_key_code: pendingAccessKey });
      if (claimError) { await supabase.auth.signOut(); setLoading(false); setServerError(claimError.message || 'The Product Key or Activation Key is invalid, expired, inactive, or already used.'); return; }
      const { error: metadataError } = await supabase.auth.updateUser({ data: { pending_access_key: null } });
      if (metadataError) console.error('Access key was claimed, but pending metadata could not be cleared:', metadataError);
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    setLoading(false);
    const next = params.get('next');
    if (profile?.role === 'admin' || profile?.role === 'super_admin') router.push(next && next.startsWith('/admin') ? next : '/admin/dashboard');
    else router.push(next && !next.startsWith('/admin') ? next : '/dashboard');
    router.refresh();
  }

  if (restoringSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
          <p className="mt-4 text-sm font-semibold text-[var(--muted)]">Restoring your session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[90vh] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[var(--card)] shadow-lg ring-1 ring-[var(--border)]">
              <img src="/pinnacle-logo.png" alt="Pinnacle Tutors Academy" className="h-full w-full object-contain" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-[var(--foreground)]">Pinnacle Tutors</h1>
            <p className="mt-1 text-sm font-bold text-[var(--primary)]">Academy</p>
          </Link>
        </div>
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl sm:p-8">
          <div className="mb-6"><h2 className="text-2xl font-black">Welcome back 👋</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Log in to continue your preparation and keep working towards your goals.</p></div>
          {params.get('registered') && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Account created successfully. Check your email to confirm your account, then log in.</div>}
          {params.get('error') === 'unauthorized' && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">That page requires an admin account.</div>}
          {serverError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <FormField label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
            <FormField label="Password" name="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
            <div className="mb-5 text-right"><Link href="/forgot-password" className="text-sm font-bold text-[var(--primary)] transition hover:opacity-80">Forgot password?</Link></div>
            <div className="[&_button]:!bg-[var(--primary)] [&_button:hover]:!bg-[var(--primary-dark)]"><Button type="submit" fullWidth loading={loading}>Log in</Button></div>
          </form>
          <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-[var(--border)]" /><span className="text-xs font-semibold text-[var(--muted)]">OR</span><div className="h-px flex-1 bg-[var(--border)]" /></div>
          <p className="text-center text-sm text-[var(--muted)]">New here? <Link href="/register" className="font-black text-[var(--primary)] hover:opacity-80">Create an account</Link></p>
        </section>
        <p className="mt-6 text-center text-xs font-medium text-[var(--muted)]">© {new Date().getFullYear()} Pinnacle Tutors Academy</p>
      </div>
    </main>
  );
}

export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
