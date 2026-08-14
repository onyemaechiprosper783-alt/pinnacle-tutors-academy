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

  // TEMPORARY TEST DATE
  // This simulates September 17, 2026.
  // It lets us verify that both request buttons appear.

  const now = new Date('2026-09-17T12:00:00+01:00');

  const activationRequestStart = new Date(
    '2026-09-17T00:00:00+01:00'
  );

  const octoberFirst = new Date(
    '2026-10-01T00:00:00+01:00'
  );

  const showProductKeyRequest = now < octoberFirst;
  const showActivationKeyRequest = now >= activationRequestStart;

  const whatsappNumber = '2347051101464';

  function requestProductKey() {
    const message = encodeURIComponent(
      'Hello Pinnacle Tutors Academy, I would like to request a Product Key for my student account.'
    );

    window.open(
      `https://wa.me/${whatsappNumber}?text=${message}`,
      '_blank'
    );
  }

  function requestActivationKey() {
    const message = encodeURIComponent(
      'Hello Pinnacle Tutors Academy, I would like to request an Activation Key for my student account.'
    );

    window.open(
      `https://wa.me/${whatsappNumber}?text=${message}`,
      '_blank'
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
          pending_access_key: parsed.data.access_key.trim(),
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

    if (!data.session) {
      setLoading(false);

      router.push('/login?registered=1');
      return;
    }

    const { error: claimError } = await supabase.rpc(
      'claim_access_key',
      {
        p_key_code: parsed.data.access_key.trim(),
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

    const { error: metadataError } = await supabase.auth.updateUser({
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

    setLoading(false);
    router.push('/dashboard');
    router.refresh();
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
            setForm({
              ...form,
              full_name: e.target.value,
            })
          }
          error={errors.full_name}
        />

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
          label="Phone number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={(e) =>
            setForm({
              ...form,
              phone: e.target.value,
            })
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
              setForm({
                ...form,
                exam_target: e.target.value,
              })
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
            setForm({
              ...form,
              password: e.target.value,
            })
          }
          error={errors.password}
        />

        <div className="mb-4">
          <FormField
            label="Product Key / Activation Key"
            name="access_key"
            value={form.access_key}
            onChange={(e) =>
              setForm({
                ...form,
                access_key: e.target.value,
              })
            }
            error={errors.access_key}
          />

          <div className="mt-3 space-y-2">
            {showProductKeyRequest && (
              <button
                type="button"
                onClick={requestProductKey}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                🔑 Request Product Key
              </button>
            )}

            {showActivationKeyRequest && (
              <button
                type="button"
                onClick={requestActivationKey}
                className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100"
              >
                🔐 Request Activation Key
              </button>
            )}
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Enter the Product Key or Activation Key you received from
            Pinnacle Tutors Academy.
          </p>
        </div>

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
