'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ExamAttempt } from '@/types/database';

export default function ResultsHistoryPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/exams/history')
      .then((response) => response.json())
      .then((data) => {
        setAttempts(data.attempts ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-72 rounded bg-slate-200" />
          <div className="mt-8 h-32 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  const completedAttempts = attempts.filter(
    (attempt) => attempt.status !== 'in_progress'
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-black text-slate-900">
            My Results
          </h1>

          <p className="mt-2 text-slate-500">
            Review your previous practice sessions, mock exams and CBT results.
          </p>
        </div>

        {completedAttempts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl">
              📊
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No results yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Complete a practice session, mock exam or CBT and your results
              will appear here.
            </p>

            <Link
              href="/practice"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              Start Practicing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {completedAttempts.map((attempt) => {
              const score = attempt.score ?? 0;
              const date = new Date(
                attempt.submitted_at ?? attempt.started_at
              );

              const modeName = attempt.mode
                .replaceAll('_', ' ')
                .replace(/\b\w/g, (letter) => letter.toUpperCase());

              return (
                <div
                  key={attempt.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                        {attempt.mode === 'practice'
                          ? '📚'
                          : attempt.mode === 'mock'
                            ? '📝'
                            : attempt.mode === 'cbt'
                              ? '💻'
                              : '🔥'}
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          {modeName}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {date.toLocaleDateString()} ·{' '}
                          {date.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          {attempt.correct_count ?? 0} correct ·{' '}
                          {attempt.incorrect_count ?? 0} incorrect ·{' '}
                          {attempt.unanswered_count ?? 0} unanswered
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-2xl font-black ${
                            score >= 70
                              ? 'text-emerald-600'
                              : score >= 50
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {score}%
                        </p>

                        <p className="text-xs font-medium text-slate-400">
                          Score
                        </p>
                      </div>

                      <Link
                        href={`/results/${attempt.id}`}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        View Result
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
