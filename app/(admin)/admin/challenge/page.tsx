'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Round {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  duration_seconds: number;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminChallengePage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    opens_at: '',
    closes_at: '',
    is_active: false,
  });

  async function loadRounds() {
    setLoadingRounds(true);

    try {
      const response = await fetch('/api/challenge/rounds', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not load rounds.');
      }

      setRounds(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load challenge rounds.'
      );
    } finally {
      setLoadingRounds(false);
    }
  }

  useEffect(() => {
    loadRounds();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/challenge/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title.trim(),
          difficulty: form.difficulty,
          opens_at: form.opens_at
            ? new Date(form.opens_at).toISOString()
            : null,
          closes_at: form.closes_at
            ? new Date(form.closes_at).toISOString()
            : null,
          is_active: form.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not create round.');
      }

      setMessage('Challenge round created successfully.');

      setForm({
        title: '',
        difficulty: 'medium',
        opens_at: '',
        closes_at: '',
        is_active: false,
      });

      await loadRounds();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create challenge round.'
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return 'Not set';

    return new Date(date).toLocaleString();
  }

  function difficultyLabel(difficulty: Round['difficulty']) {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          UTME Challenge
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Create and manage UTME Challenge rounds.
        </p>
      </div>

      {/* Create Round */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Create Challenge Round
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Questions are automatically selected from the CBT question bank
            when students start the challenge.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Round name */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Round name
            </label>

            <input
              required
              type="text"
              placeholder="e.g. UTME Challenge Round 1"
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Difficulty
            </label>

            <select
              value={form.difficulty}
              onChange={(e) =>
                setForm({
                  ...form,
                  difficulty: e.target.value as
                    | 'easy'
                    | 'medium'
                    | 'hard',
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Fixed challenge information */}
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">
              Challenge format
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              180 questions · 120 minutes
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Score is calculated out of 400.
            </p>
          </div>

          {/* Opens */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Opens at
            </label>

            <input
              type="datetime-local"
              value={form.opens_at}
              onChange={(e) =>
                setForm({
                  ...form,
                  opens_at: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            />
          </div>

          {/* Closes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Closes at
            </label>

            <input
              type="datetime-local"
              value={form.closes_at}
              onChange={(e) =>
                setForm({
                  ...form,
                  closes_at: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Activate */}
        <label className="mt-5 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({
                ...form,
                is_active: e.target.checked,
              })
            }
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />

          <div>
            <p className="text-sm font-medium text-slate-800">
              Activate this round
            </p>

            <p className="text-xs text-slate-500">
              Students can only access active rounds.
            </p>
          </div>
        </label>

        {/* Messages */}
        {message && (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5">
          <Button type="submit" loading={loading}>
            Create Round
          </Button>
        </div>
      </form>

      {/* Existing rounds */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Challenge Rounds
            </h2>

            <p className="text-sm text-slate-500">
              Manage the rounds you have created.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRounds}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loadingRounds ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading rounds...
          </div>
        ) : rounds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-medium text-slate-700">
              No challenge rounds yet.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create your first UTME Challenge round above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rounds.map((round) => (
              <div
                key={round.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {round.title}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          round.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {round.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Difficulty:{' '}
                        <strong className="text-slate-700">
                          {difficultyLabel(round.difficulty)}
                        </strong>
                      </span>

                      <span>180 questions</span>

                      <span>120 minutes</span>

                      <span>Score /400</span>
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
                      Opens: {formatDate(round.opens_at)}
                    </div>

                    <div className="text-xs text-slate-400">
                      Closes: {formatDate(round.closes_at)}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">
                    Created {formatDate(round.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
