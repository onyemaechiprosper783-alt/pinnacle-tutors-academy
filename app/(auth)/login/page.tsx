'use client';

import { useState, Suspense } from 'react';
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
  const [serverError, setServerError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user) {
      setLoading(false);
      setServerError('Incorrect email or password.');
      return;
    }

    // Role comes from the database, not from anything client-supplied.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    const next = params.get('next');
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      router.push(next && next.startsWith('/admin') ? next : '/admin/dashboard');
    } else {
      router.push(next && !next.startsWith('/admin') ? next : '/dashboard');
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mb-6 text-slate-500">Log in to continue your prep.</p>

      {params.get('registered') && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Account created. Check your email to confirm, then log in.
        </div>
      )}
      {params.get('error') === 'unauthorized' && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          That page requires an admin account.
        </div>
      )}
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="Email" name="email" type="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <FormField
          label="Password" name="password" type="password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
        />
        <div className="mb-4 text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-emerald-700">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth loading={loading}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{' '}
        <Link href="/register" className="font-semibold text-emerald-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
