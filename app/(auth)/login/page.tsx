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

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

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

    const { data, error } =
      await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user) {
      setLoading(false);
      setServerError('Incorrect email or password.');
      return;
    }

    /*
     * If the user registered with an activation/product key,
     * it was stored temporarily in user metadata.
     */
    const pendingAccessKey =
      data.user.user_metadata?.pending_access_key;

    if (pendingAccessKey) {
      const { error: claimError } = await supabase.rpc(
        'claim_access_key',
        {
          p_key_code: pendingAccessKey,
        }
      );

      if (claimError) {
        await supabase.auth.signOut();
        setLoading(false);

        setServerError(
          claimError.message ||
            'The Product Key or Activation Key is invalid, expired, inactive, or already used.'
        );

        return;
      }

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            pending_access_key: null,
          },
        });

      if (metadataError) {
        console.error(
          'Access key was claimed, but pending metadata could not be cleared:',
          metadataError
        );
      }
    }

    /*
     * Role comes from the database.
     */
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    const next = params.get('next');

    if (
      profile?.role === 'admin' ||
      profile?.role === 'super_admin'
    ) {
      router.push(
        next && next.startsWith('/admin')
          ? next
          : '/admin/dashboard'
      );
    } else {
      router.push(
        next && !next.startsWith('/admin')
          ? next
          : '/dashboard'
      );
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[90vh] max-w-md flex-col justify-center">

        {/* LOGO */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex flex-col items-center"
          >
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-100">
              <img
                src="/pinnacle-logo.png"
                alt="Pinnacle Tutors Academy"
                className="h-full w-full object-contain"
              />
            </div>

            <h1 className="mt-4 text-2xl font-black text-slate-900">
              Pinnacle Tutors
            </h1>

            <p className="mt-1 text-sm font-semibold text-orange-600">
              Academy
            </p>
          </Link>
        </div>

        {/* LOGIN CARD */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">

          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">
              Welcome back 👋
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Log in to continue your preparation and keep
              working towards your goals.
            </p>
          </div>

          {params.get('registered') && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Account created successfully. Check your email
              to confirm your account, then log in.
            </div>
          )}

          {params.get('error') === 'unauthorized' && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              That page requires an admin account.
            </div>
          )}

          {serverError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            <FormField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              error={errors.email}
            />

            <FormField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              error={errors.password}
            />

            <div className="mb-5 text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-bold text-orange-600 transition hover:text-orange-700"
              >
                Forgot password?
              </Link>
            </div>

            {/* LOGIN BUTTON */}
            <div className="[&_button]:!bg-orange-600 [&_button:hover]:!bg-orange-700">
              <Button
                type="submit"
                fullWidth
                loading={loading}
              >
                Log in
              </Button>
            </div>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">
              OR
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="text-center text-sm text-slate-500">
            New here?{' '}
            <Link
              href="/register"
              className="font-black text-orange-600 hover:text-orange-700"
            >
              Create an account
            </Link>
          </p>
        </section>

        {/* FOOTER */}
        <p className="mt-6 text-center text-xs font-medium text-slate-400">
          © {new Date().getFullYear()} Pinnacle Tutors Academy
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
