'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registerSchema } from '@/lib/validators/auth';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    exam_target: 'jamb',
    access_key: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const parsed = registerSchema.safeParse(form);

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

    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.full_name,
            phone: parsed.data.phone ?? null,
            exam_target: parsed.data.exam_target ?? null,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setServerError(
          error.message.includes('already registered')
            ? 'An account with this email already exists.'
            : 'Registration failed. Please check your details and try again.'
        );
        return;
      }

      /*
       * The access key is claimed only after Supabase creates the
       * authenticated user. The database function uses auth.uid()
       * internally, so the student cannot claim access for another user.
       */
      if (data.session) {
        const { error: accessError } = await supabase.rpc(
          'claim_access_key',
          {
            p_key_code: parsed.data.access_key.trim(),
          }
        );

        if (accessError) {
          setServerError(
            `Your account was created, but the access key could not be activated: ${accessError.message}`
          );
          return;
        }

        router.push('/dashboard');
        return;
      }

      /*
       * If email confirmation is enabled, Supabase may create the
       * account without creating a session immediately.
       */
      router.push('/login?registered=1&confirm=1');
    } catch {
      setServerError(
        'Something went wrong. Your account may have been created. Please try logging in.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">

      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
          Pinnacle Tutors Academy
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-900">
          Create your account
        </h1>

        <p className="mt-2 text-slate-500">
          Start preparing for JAMB & WAEC today.
        </p>
      </div>

      {serverError && (
        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-1">

        <FormField
          label="Full name"
          name="full_name"
          value={form.full_name}
          onChange={(e) =>
            setForm({ ...form, full_name: e.target.value })
          }
          error={errors.full_name}
        />

        <FormField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          error={errors.email}
        />

        <FormField
          label="Phone number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
          error={errors.phone}
        />

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            What are you preparing for?
          </label>

          <select
            value={form.exam_target}
            onChange={(e) =>
              setForm({ ...form, exam_target: e.target.value })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="jamb">JAMB / UTME</option>
            <option value="waec">WAEC</option>
            <option value="both">Both</option>
          </select>

          {errors.exam_target && (
            <p className="mt-1 text-xs text-red-600">
              {errors.exam_target}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Access Key
          </label>

          <input
            type="text"
            name="access_key"
            value={form.access_key}
            onChange={(e) =>
              setForm({
                ...form,
                access_key: e.target.value.toUpperCase(),
              })
            }
            placeholder="Enter your Pinnacle access key"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />

          {errors.access_key && (
            <p className="mt-1 text-xs text-red-600">
              {errors.access_key}
            </p>
          )}

          <p className="mt-1.5 text-xs text-slate-500">
            Enter the Product Key or Activation Key provided by Pinnacle
            Tutors Academy.
          </p>
        </div>

        <FormField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
          error={errors.password}
        />

        <Button
          type="submit"
          fullWidth
          loading={loading}
          className="mt-4"
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
