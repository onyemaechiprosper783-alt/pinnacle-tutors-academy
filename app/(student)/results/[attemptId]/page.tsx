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
    option_a: string; option_b: string; option_c: string; option_d: string;
    correct_answer: string; explanation: string | null;
    subjects?: { name: string };
  };
}

export default function ResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, { correct: number; total: number }>>({});
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetch(`/api/exams/${params.attemptId}`)
      .then((r) => r.json())
      .then((data) => {
        setAttempt(data.attempt);
        setQuestions(data.questions);
        setBreakdown(data.subject_breakdown ?? {});
      });
  }, [params.attemptId]);

  if (!attempt) return <p className="p-8 text-center text-slate-400">Loading results...</p>;

  const minutes = attempt.time_used_seconds ? Math.round(attempt.time_used_seconds / 60) : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Your Result</h1>
      <p className="mb-6 capitalize text-slate-500">{attempt.mode} exam · {minutes} min used</p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Score" value={`${attempt.score ?? 0}%`} tone="emerald" />
        <Stat label="Correct" value={attempt.correct_count ?? 0} tone="emerald" />
        <Stat label="Incorrect" value={attempt.incorrect_count ?? 0} tone="red" />
        <Stat label="Unanswered" value={attempt.unanswered_count ?? 0} tone="slate" />
      </div>

      {Object.keys(breakdown).length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Subject Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([subject, s]) => {
              const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={subject}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{subject}</span>
                    <span className="text-slate-500">{s.correct}/{s.total} ({pct}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowReview((s) => !s)}
        className="mb-4 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-emerald-700"
      >
        {showReview ? 'Hide answer review' : 'Review answers'}
      </button>

      {showReview && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.question_id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">
                {i + 1}. {q.question.question_text}
              </p>
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const text = q.question[`option_${letter.toLowerCase()}` as 'option_a'];
                const isCorrectAns = q.question.correct_answer === letter;
                const wasSelected = q.selected_answer === letter;
                return (
                  <div
                    key={letter}
                    className={`mb-1 rounded-lg px-3 py-2 text-sm ${
                      isCorrectAns ? 'bg-emerald-50 text-emerald-800' :
                      wasSelected ? 'bg-red-50 text-red-700' : 'text-slate-600'
                    }`}
                  >
                    {letter}. {text}
                  </div>
                );
              })}
              {q.question.explanation && (
                <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{q.question.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Link href="/dashboard" className="mt-6 block text-center font-semibold text-emerald-700">
        Back to dashboard
      </Link>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: 'emerald' | 'red' | 'slate' }) {
  const colors = { emerald: 'text-emerald-700', red: 'text-red-700', slate: 'text-slate-700' };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
