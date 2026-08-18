'use client';

import { useEffect, useState } from 'react';

interface Attempt {
  id: string;
  student_id: string;
  mode: string;
  status: string;
  score: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  unanswered_count: number | null;
  total_questions: number | null;
  started_at: string;
  submitted_at: string | null;
  time_used_seconds: number | null;

  student_name: string;

  is_challenge: boolean;
  round_id: string | null;
  challenge_title: string | null;
  results_released: boolean;
}

const MODES = [
  '',
  'practice',
  'mock',
  'cbt',
];

export default function AdminResultsPage() {
  const [attempts, setAttempts] =
    useState<Attempt[]>([]);

  const [mode, setMode] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  async function loadResults() {
    setLoading(true);
    setMessage(null);

    try {
      const params =
        new URLSearchParams();

      if (mode) {
        params.set(
          'mode',
          mode
        );
      }

      const response =
        await fetch(
          `/api/admin/results?${params.toString()}`,
          {
            cache: 'no-store',
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            'Could not load results.'
        );
      }

      setAttempts(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        'Results load error:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load results.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, [mode]);

  /*
   * =====================================================
   * RELEASE CHALLENGE RESULTS
   * =====================================================
   */

  async function releaseResults(
    roundId: string
  ) {
    if (actionLoading) {
      return;
    }

    const confirmed =
      window.confirm(
        'Release the results for this challenge? Students will be able to see their results and leaderboard position.'
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(
      roundId
    );

    setMessage(null);

    try {
      const response =
        await fetch(
          '/api/admin/challenge-results/release',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              round_id:
                roundId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            'Could not release results.'
        );
      }

      setMessage(
        'Challenge results released successfully.'
      );

      await loadResults();
    } catch (error) {
      console.error(
        'Release results error:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not release results.'
      );
    } finally {
      setActionLoading(
        null
      );
    }
  }

  /*
   * =====================================================
   * MODE LABEL
   * =====================================================
   */

  function getModeLabel(
    attempt: Attempt
  ) {
    if (attempt.is_challenge) {
      return 'UTME Challenge';
    }

    return attempt.mode
      .replaceAll(
        '_',
        ' '
      );
  }

  /*
   * =====================================================
   * STATUS LABEL
   * =====================================================
   */

  function getStatusLabel(
    attempt: Attempt
  ) {
    if (
      attempt.is_challenge &&
      attempt.results_released
    ) {
      return 'Results released';
    }

    return attempt.status
      .replaceAll(
        '_',
        ' '
      );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Exam Results
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View exam submissions and manage UTME Challenge results.
          </p>
        </div>

        <button
          type="button"
          onClick={loadResults}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {loading
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}

      {/* FILTERS */}

      <div className="mb-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={
              m || 'all'
            }
            type="button"
            onClick={() =>
              setMode(m)
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
              mode === m
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {m
              ? m.replaceAll(
                  '_',
                  ' '
                )
              : 'All'}
          </button>
        ))}
      </div>

      {/* RESULTS */}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">
                Student
              </th>

              <th className="px-4 py-3">
                Mode
              </th>

              <th className="px-4 py-3">
                Score
              </th>

              <th className="px-4 py-3">
                Correct
              </th>

              <th className="px-4 py-3">
                Status
              </th>

              <th className="px-4 py-3">
                Date
              </th>

              <th className="px-4 py-3">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Loading results...
                </td>
              </tr>
            ) : attempts.length ===
              0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              attempts.map(
                (attempt) => (
                  <tr
                    key={
                      attempt.id
                    }
                    className="hover:bg-slate-50"
                  >
                    {/* STUDENT */}

                    <td className="px-4 py-3 font-medium text-slate-800">
                      {
                        attempt.student_name
                      }
                    </td>

                    {/* MODE */}

                    <td className="px-4 py-3">
                      {attempt.is_challenge ? (
                        <div>
                          <div className="font-semibold text-purple-700">
                            UTME Challenge
                          </div>

                          {attempt.challenge_title && (
                            <div className="text-xs text-slate-400">
                              {
                                attempt.challenge_title
                              }
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="capitalize text-slate-500">
                          {getModeLabel(
                            attempt
                          )}
                        </span>
                      )}
                    </td>

                    {/* SCORE */}

                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {attempt.score !=
                      null
                        ? `${attempt.score}%`
                        : '—'}
                    </td>

                    {/* CORRECT */}

                    <td className="px-4 py-3 text-slate-500">
                      {attempt.correct_count ??
                        0}
                      /
                      {attempt.total_questions ??
                        0}
                    </td>

                    {/* STATUS */}

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          attempt.is_challenge &&
                          !attempt.results_released
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {getStatusLabel(
                          attempt
                        )}
                      </span>
                    </td>

                    {/* DATE */}

                    <td className="px-4 py-3 text-slate-400">
                      {new Date(
                        attempt.started_at
                      ).toLocaleDateString()}
                    </td>

                    {/* ACTION */}

                    <td className="px-4 py-3">
                      {attempt.is_challenge ? (
                        attempt.results_released ? (
                          <span className="text-xs font-semibold text-emerald-600">
                            Released
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              attempt.round_id &&
                              releaseResults(
                                attempt.round_id
                              )
                            }
                            disabled={
                              !attempt.round_id ||
                              actionLoading ===
                                attempt.round_id
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading ===
                            attempt.round_id
                              ? 'Releasing...'
                              : 'Show Results'}
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
