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
      setLoading(false);

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
     * internally, so a student cannot claim a key for somebody else.
     */
    if (!data.session) {
      setLoading(false);

      setServerError(
        'Your account was created, but you must confirm your email before your access key can be activated.'
      );

      return;
    }

    const { error: claimError } = await supabase.rpc('claim_access_key', {
      p_key_code: parsed.data.access_key.trim(),
    });

    setLoading(false);

    if (claimError) {
      await supabase.auth.signOut();

      setServerError(
        claimError.message ||
          'The Product Key or Activation Key is invalid, expired, inactive, or already used.'
      );

      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        Create your account
      </h1>

      <p className="mb-6 text-slate-500">
        Start prepping for JAMB & WAEC today.
      </p>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
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

        <FormField
          label="Product Key / Activation Key"
          name="access_key"
          value={form.access_key}
          onChange={(e) =>
            setForm({ ...form, access_key: e.target.value })
          }
          error={errors.access_key}
        />

        <Button
          type="submit"
          fullWidth
          loading={loading}
          className="mt-2"
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-emerald-700"
        >
          Log in
        </Link>
      </p>
    </div>
  );
          }
