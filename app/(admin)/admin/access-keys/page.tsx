'use client';

import { useState } from 'react';

type KeyType = 'product_key' | 'activation_key';

type GeneratedKey = {
  id: string;
  key_code: string;
  key_type: KeyType;
  status: string;
  valid_from: string;
  valid_until: string | null;
};

export default function AdminAccessKeysPage() {
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [loading, setLoading] = useState<KeyType | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generateKey(keyType: KeyType) {
    setLoading(keyType);
    setError('');
    setGeneratedKey(null);
    setCopied(false);

    try {
      const response = await fetch('/api/admin/access-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key_type: keyType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Could not generate key.');
        return;
      }

      setGeneratedKey(result.key);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function copyKey() {
    if (!generatedKey) return;

    await navigator.clipboard.writeText(generatedKey.key_code);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">
          Access Keys
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Generate Product Keys and permanent Activation Keys for students.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* PRODUCT KEY */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl">
            🔑
          </div>

          <h2 className="text-lg font-black text-slate-900">
            Product Key
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Temporary access for the August–September 2026 period.
            Product Keys automatically expire on September 30, 2026.
          </p>

          <button
            type="button"
            onClick={() => generateKey('product_key')}
            disabled={loading !== null}
            className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'product_key'
              ? 'Generating...'
              : 'Generate Product Key'}
          </button>
        </div>

        {/* ACTIVATION KEY */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">
            🔐
          </div>

          <h2 className="text-lg font-black text-slate-900">
            Activation Key
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Permanent access. Activation Keys do not expire.
          </p>

          <button
            type="button"
            onClick={() => generateKey('activation_key')}
            disabled={loading !== null}
            className="mt-5 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'activation_key'
              ? 'Generating...'
              : 'Generate Activation Key'}
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* GENERATED KEY */}
      {generatedKey && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
            New {generatedKey.key_type === 'product_key'
              ? 'Product Key'
              : 'Activation Key'}
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-4">
              <p className="break-all font-mono text-lg font-black tracking-wide text-slate-900">
                {generatedKey.key_code}
              </p>
            </div>

            <button
              type="button"
              onClick={copyKey}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
            >
              {copied ? 'Copied ✓' : 'Copy Key'}
            </button>
          </div>

          <div className="mt-4 text-sm text-emerald-800">
            <p>
              Status:{' '}
              <strong className="uppercase">
                {generatedKey.status}
              </strong>
            </p>

            {generatedKey.valid_until && (
              <p className="mt-1">
                Valid until:{' '}
                <strong>
                  {new Date(
                    generatedKey.valid_until
                  ).toLocaleDateString()}
                </strong>
              </p>
            )}

            {!generatedKey.valid_until && (
              <p className="mt-1">
                <strong>Permanent access</strong>
              </p>
            )}
          </div>

          <p className="mt-4 text-xs font-medium text-emerald-700">
            Give this key to the intended student. Once claimed,
            it is permanently tied to that student's account and
            cannot be reused by another student.
          </p>
        </div>
      )}
    </div>
  );
}
