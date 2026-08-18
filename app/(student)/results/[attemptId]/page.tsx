'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { ExamAttempt } from '@/types/database';

interface ReviewQuestion {
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  question: {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string | null;
    subjects?: { name: string };
  };
}

interface ResultsResponse {
  attempt?: ExamAttempt;
  questions?: ReviewQuestion[];
  subject_breakdown?: Record<
    string,
    {
      correct: number;
      total: number;
    }
  >;
  challenge?: boolean;
  results_hidden?: boolean;
  message?: string;
}

export default function ResultsPage() {
  const params =
    useParams<{ attemptId: string }>();

  const [data, setData] =
    useState<ResultsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [showReview, setShowReview] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      try {
        const response = await fetch(
          `/api/exams/${params.attemptId}`,
          {
            cache: 'no-store',
          }
        );

        const result =
          await response.json();

        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        console.error(
          'Results loading error:',
          error
        );

        if (!cancelled) {
          setData({
            message:
              'Could not load this result.',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [params.attemptId]);

  if (loading) {
    return (
      <p className="p-8 text-center text-slate-400">
        Loading results...
      </p>
    );
  }

  const attempt =
    data?.attempt;

  if (!attempt) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">
          {data?.message ??
            'Result not found.'}
        </p>

        <Link
          href="/dashboard"
          className="mt-4 inline-block font-semibold text-emerald-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  /*
   * =====================================================
   * IDENTIFY UTME CHALLENGE
   * =====================================================
   *
   * The challenge system may identify a challenge by:
   *
   * 1. mode = "utme_challenge"
   *
   * OR
   *
   * 2. mode = "cbt" + config.round_id
   *
   * We support BOTH so the results page matches the
   * existing challenge records in the database.
   */

  const config =
    attempt.config &&
    typeof attempt.config === 'object'
      ? (attempt.config as {
          round_id?: string;
          results_released?: boolean;
        })
      : {};

  const isUtmeChallenge =
    attempt.mode === 'utme_challenge' ||
    (
      attempt.mode === 'cbt' &&
      !!config.round_id
    );

  /*
   * =====================================================
   * RESULTS RELEASE STATUS
   * =====================================================
   */

  const resultsReleased =
    Boolean(
      config.results_released
    );

  /*
   * =====================================================
   * HIDDEN UTME CHALLENGE RESULTS
   * =====================================================
   *
   * IMPORTANT:
   *
   * A hidden challenge result is NOT a zero result.
   *
   * We return a completely separate screen and never
   * render score, percentage, correct count, incorrect
   * count, subject breakdown, answers or ranking.
   */

  if (
    isUtmeChallenge &&
    !resultsReleased
  ) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✓
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Challenge Submitted
          </h1>

          <p className="mt-4 leading-relaxed text-slate-600">
            Your UTME Challenge has been
            submitted successfully.
          </p>

          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            🏆 Your results are currently
            hidden.
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            The administrator will release
            the official challenge results.
            Your score, subject breakdown and
            ranking will appear here after
            the results are released.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 block rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * NORMAL EXAM OR RELEASED UTME CHALLENGE
   * =====================================================
   */

  const questions =
    data?.questions ?? [];

  const breakdown =
    data?.subject_breakdown ?? {};

  const minutes =
    attempt.time_used_seconds
      ? Math.round(
          attempt.time_used_seconds / 60
        )
      : 0;

  /*
   * Challenge results are normally scored out
   * of 400, while the regular result page can
   * continue using the existing score field.
   */

  const challengeCorrect =
    attempt.correct_count ?? 0;

  const challengeTotal =
    questions.length > 0
      ? questions.length
      : 180;

  const challengePercentage =
    isUtmeChallenge
      ? Math.round(
          (challengeCorrect /
            challengeTotal) *
            100
        )
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">

      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        {isUtmeChallenge
          ? 'UTME Challenge Result'
          : 'Your Result'}
      </h1>

      <p className="mb-6 capitalize text-slate-500">
        {isUtmeChallenge
          ? 'UTME Challenge'
          : `${attempt.mode} exam`}
        {' · '}
        {minutes} min used
      </p>

      {/* =====================================================
          SCORE CARDS
          ===================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">

        <Stat
          label="Score"
          value={
            isUtmeChallenge
              ? `${challengePercentage ?? 0}%`
              : `${attempt.score ?? 0}%`
          }
          tone="emerald"
        />

        <Stat
          label="Correct"
          value={
            attempt.correct_count ?? 0
          }
          tone="emerald"
        />

        <Stat
          label="Incorrect"
          value={
            attempt.incorrect_count ?? 0
          }
          tone="red"
        />

        <Stat
          label="Unanswered"
          value={
            attempt.unanswered_count ?? 0
          }
          tone="slate"
        />

      </div>

      {/* =====================================================
          SUBJECT BREAKDOWN
          ===================================================== */}

      {Object.keys(breakdown).length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">

          <h2 className="mb-3 font-semibold text-slate-800">
            Subject Breakdown
          </h2>

          <div className="space-y-3">

            {Object.entries(
              breakdown
            ).map(
              ([
                subject,
                section,
              ]) => {

                const pct =
                  section.total
                    ? Math.round(
                        (section.correct /
                          section.total) *
                          100
                      )
                    : 0;

                return (
                  <div key={subject}>

                    <div className="mb-1 flex justify-between text-sm">

                      <span className="font-medium text-slate-700">
                        {subject}
                      </span>

                      <span className="text-slate-500">
                        {section.correct}/
                        {section.total} (
                        {pct}%)
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${pct}%`,
                        }}
                      />

                    </div>

                  </div>
                );
              }
            )}

          </div>
        </div>
      )}

      {/* =====================================================
          ANSWER REVIEW
          ===================================================== */}

      {questions.length > 0 && (
        <>
          <button
            type="button"
            onClick={() =>
              setShowReview(
                (value) => !value
              )
            }
            className="mb-4 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-emerald-700"
          >
            {showReview
              ? 'Hide answer review'
              : 'Review answers'}
          </button>

          {showReview && (
            <div className="space-y-4">

              {questions.map(
                (
                  question,
                  index
                ) => (

                  <div
                    key={
                      question.question_id
                    }
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >

                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      {index + 1}.{' '}
                      {
                        question
                          .question
                          .question_text
                      }
                    </p>

                    {(
                      [
                        'A',
                        'B',
                        'C',
                        'D',
                      ] as const
                    ).map(
                      (letter) => {

                        const text =
                          question
                            .question[
                            `option_${letter.toLowerCase()}` as
                              | 'option_a'
                              | 'option_b'
                              | 'option_c'
                              | 'option_d'
                          ];

                        const isCorrectAns =
                          question
                            .question
                            .correct_answer ===
                          letter;

                        const wasSelected =
                          question.selected_answer ===
                          letter;

                        return (
                          <div
                            key={letter}
                            className={`mb-1 rounded-lg px-3 py-2 text-sm ${
                              isCorrectAns
                                ? 'bg-emerald-50 text-emerald-800'
                                : wasSelected
                                ? 'bg-red-50 text-red-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {letter}.{' '}
                            {text}
                          </div>
                        );
                      }
                    )}

                    {question.question
                      .explanation && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                        {
                          question
                            .question
                            .explanation
                        }
                      </p>
                    )}

                  </div>
                )
              )}

            </div>
          )}
        </>
      )}

      <Link
        href="/dashboard"
        className="mt-6 block text-center font-semibold text-emerald-700"
      >
        Back to Dashboard
      </Link>

    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone:
    | 'emerald'
    | 'red'
    | 'slate';
}) {

  const colors = {
    emerald: 'text-emerald-700',
    red: 'text-red-700',
    slate: 'text-slate-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">

      <p
        className={`text-2xl font-bold ${colors[tone]}`}
      >
        {value}
      </p>

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

    </div>
  );
}
