'use client';

import { useEffect, useState } from 'react';

type KeyType = 'product_key' | 'activation_key';

type GeneratedKey = {
  id: string;
  key_code: string;
  key_type: KeyType;
  status: string;
  valid_from: string;
  valid_until: string | null;
};

type AccessKey = {
  id: string;
  key_code: string;
  key_type: KeyType;
  status: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  notes: string | null;
  used_by_student: {
    full_name: string | null;
    phone: string | null;
  } | null;
};

export default function AdminAccessKeysPage() {
  const [generatedKey, setGeneratedKey] =
    useState<GeneratedKey | null>(null);

  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState<KeyType | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function loadKeys() {
    try {
      setLoadingKeys(true);

      const response = await fetch('/api/admin/access-keys', {
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Could not load access keys.');
        return;
      }

      setKeys(result);
    } catch {
      setError('Could not load access keys.');
    } finally {
      setLoadingKeys(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

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

      await loadKeys();
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
    <div className="mx-auto max-w-6xl">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">
          Access Keys
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Generate and manage Product Keys and permanent Activation Keys.
        </p>
      </div>

      {/* GENERATORS */}
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
            Temporary access for August–September 2026.
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
            New{' '}
            {generatedKey.key_type === 'product_key'
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
        </div>
      )}

      {/* KEY HISTORY */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Key History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              See every generated key and the student who claimed it.
            </p>
          </div>

          <button
            type="button"
            onClick={loadKeys}
            disabled={loadingKeys}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {loadingKeys ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loadingKeys ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            Loading keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-lg font-black text-slate-800">
              No keys yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Generate your first Product Key or Activation Key above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-4">Key</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Used By</th>
                  <th className="px-4 py-4">Used At</th>
                  <th className="px-4 py-4">Valid Until</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {keys.map((key) => (
                  <tr key={key.id}>
                    {/* KEY */}
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-black text-slate-800">
                        {key.key_code}
                      </p>
                    </td>

                    {/* TYPE */}
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          key.key_type === 'product_key'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {key.key_type === 'product_key'
                          ? 'Product'
                          : 'Activation'}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          key.status === 'used'
                            ? 'bg-blue-100 text-blue-700'
                            : key.status === 'unused'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {key.status}
                      </span>
                    </td>

                    {/* USED BY */}
                    <td className="px-4 py-4">
                      {key.used_by_student ? (
                        <div>
                          <p className="font-black text-slate-800">
                            {key.used_by_student.full_name ||
                              'Unnamed student'}
                          </p>

                          {key.used_by_student.phone && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {key.used_by_student.phone}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          Not used yet
                        </span>
                      )}
                    </td>

                    {/* USED AT */}
                    <td className="px-4 py-4 text-slate-500">
                      {key.used_at
                        ? new Date(key.used_at).toLocaleString()
                        : '—'}
                    </td>

                    {/* VALID UNTIL */}
                    <td className="px-4 py-4 text-slate-500">
                      {key.valid_until
                        ? new Date(
                            key.valid_until
                          ).toLocaleDateString()
                        : 'Permanent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
