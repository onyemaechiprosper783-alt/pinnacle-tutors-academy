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

interface Breakdown { correct: number; total: number }
interface WeakTopic extends Breakdown { topic: string; percentage: number }
interface ResultsResponse {
  attempt?: ExamAttempt;
  questions?: ReviewQuestion[];
  subject_breakdown?: Record<string, Breakdown>;
  topic_breakdown?: Record<string, Breakdown>;
  weak_topics?: WeakTopic[];
  results_hidden?: boolean;
  message?: string;
}

export default function ResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/exams/${params.attemptId}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData({ message: 'Could not load this result.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.attemptId]);

  if (loading) return <p className="p-8 text-center text-[var(--muted)]">Loading results...</p>;

  const attempt = data?.attempt;
  if (!attempt) return <div className="p-8 text-center"><p className="text-[var(--muted)]">{data?.message ?? 'Result not found.'}</p><Link href="/dashboard" className="mt-4 inline-block font-semibold text-brand-700 dark:text-brand-300">Back to Dashboard</Link></div>;

  const config = attempt.config && typeof attempt.config === 'object'
    ? attempt.config as { round_id?: string; results_released?: boolean; challenge?: { round_id?: string; results_released?: boolean } }
    : {};
  const isUtmeChallenge = attempt.mode === 'utme_challenge' || (attempt.mode === 'cbt' && !!(config.round_id ?? config.challenge?.round_id));
  const resultsReleased = Boolean(config.results_released || config.challenge?.results_released) || data?.results_hidden === false;

  if (isUtmeChallenge && data?.results_hidden === true && !resultsReleased) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="pta-card p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-3xl dark:bg-accent-950/50">✓</div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Challenge Submitted</h1>
          <p className="mt-4 leading-relaxed text-[var(--muted)]">Your UTME Challenge has been submitted successfully.</p>
          <div className="mt-5 rounded-xl bg-accent-50 p-4 text-sm font-semibold text-accent-800 dark:bg-accent-950/40 dark:text-accent-200">🏆 Your results are currently hidden.</div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">The administrator will release the official challenge results. Your score and ranking will appear here after release.</p>
          <Link href="/dashboard" className="mt-6 block rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const questions = data?.questions ?? [];
  const breakdown = data?.subject_breakdown ?? {};
  const weakTopics = data?.weak_topics ?? [];
  const minutes = attempt.time_used_seconds ? Math.round(attempt.time_used_seconds / 60) : 0;
  const score = isUtmeChallenge ? `${attempt.score ?? 0}/400` : `${attempt.score ?? 0}%`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-accent-600 dark:text-accent-300">Performance report</p><h1 className="mt-1 text-2xl font-black text-[var(--foreground)]">{isUtmeChallenge ? 'UTME Challenge Result' : 'Your Result'}</h1><p className="mt-1 capitalize text-sm text-[var(--muted)]">{isUtmeChallenge ? 'UTME Challenge' : `${attempt.mode} exam`} · {minutes} min used</p></div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Score" value={score} tone="brand" />
        <Stat label="Correct" value={attempt.correct_count ?? 0} tone="brand" />
        <Stat label="Incorrect" value={attempt.incorrect_count ?? 0} tone="red" />
        <Stat label="Unanswered" value={attempt.unanswered_count ?? 0} tone="slate" />
      </div>

      {Object.keys(breakdown).length > 0 && <div className="pta-card mb-6 p-5 sm:p-6"><h2 className="mb-4 font-black text-[var(--foreground)]">Subject Performance</h2><div className="space-y-4">{Object.entries(breakdown).map(([subject, section]) => { const pct = section.total ? Math.round((section.correct / section.total) * 100) : 0; return <div key={subject}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-bold text-[var(--foreground)]">{subject}</span><span className="text-[var(--muted)]">{section.correct}/{section.total} ({pct}%)</span></div><div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-strong)]"><div className="h-full rounded-full bg-gradient-to-r from-brand-700 to-accent-500" style={{ width: `${pct}%` }} /></div></div>; })}</div></div>}

      {weakTopics.length > 0 && <div className="pta-card mb-6 border-accent-200 p-5 dark:border-accent-800 sm:p-6"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-600 dark:text-accent-300">Focus next</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Topics you need to improve</h2><p className="mt-1 text-sm text-[var(--muted)]">These topics had the lowest accuracy in this exam.</p></div><div className="space-y-3">{weakTopics.map((item) => <div key={item.topic} className="rounded-2xl bg-[var(--surface)] p-4"><div className="flex items-center justify-between gap-3"><span className="font-bold text-[var(--foreground)]">{item.topic}</span><span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700 dark:bg-red-950/40 dark:text-red-300">{item.percentage}%</span></div><p className="mt-1 text-xs text-[var(--muted)]">{item.correct} correct out of {item.total}</p></div>)}</div></div>}

      {questions.length > 0 && <><button type="button" onClick={() => setShowReview((value) => !value)} className="mb-4 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 text-sm font-semibold text-brand-700 shadow-sm dark:text-brand-300">{showReview ? 'Hide answer review' : 'Review answers'}</button>{showReview && <div className="space-y-4">{questions.map((question, index) => <div key={question.question_id} className="pta-card p-4"><p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{index + 1}. {question.question.question_text}</p>{(['A','B','C','D'] as const).map((letter) => { const text = question.question[`option_${letter.toLowerCase()}` as 'option_a'|'option_b'|'option_c'|'option_d']; const isCorrectAns = question.question.correct_answer === letter; const wasSelected = question.selected_answer === letter; return <div key={letter} className={`mb-1 rounded-lg px-3 py-2 text-sm ${isCorrectAns ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300' : wasSelected ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'text-[var(--muted)]'}`}>{letter}. {text}</div>; })}{question.question.explanation && <p className="mt-2 rounded-lg bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">{question.question.explanation}</p>}</div>)}</div>}</>}

      <Link href="/dashboard" className="mt-6 block text-center font-semibold text-brand-700 dark:text-brand-300">Back to Dashboard</Link>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: 'brand' | 'red' | 'slate' }) {
  const colors = { brand: 'text-brand-700 dark:text-brand-300', red: 'text-red-700 dark:text-red-300', slate: 'text-slate-700 dark:text-slate-300' };
  return <div className="pta-card p-4 text-center"><p className={`text-2xl font-black ${colors[tone]}`}>{value}</p><p className="text-xs font-medium text-[var(--muted)]">{label}</p></div>;
}
