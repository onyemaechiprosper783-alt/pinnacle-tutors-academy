'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExamRunner } from '@/components/cbt/ExamRunner';
import type { QuestionPublic } from '@/types/database';

interface AttemptQuestionRow {
  question_id: string;
  position: number;
  question: Record<string, unknown> & { id: string };
}

interface AttemptData {
  attempt: {
    status: string;
    duration_seconds: number | null;
    started_at: string;
  };
  questions: AttemptQuestionRow[];
  challenge_global_deadline?: string | null;
}

export function AttemptRunnerLoader({ attemptId, mode }: { attemptId: string; mode: 'mock' | 'cbt' }) {
  const router = useRouter();
  const [state, setState] = useState<{ questions: QuestionPublic[]; durationSeconds: number | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/exams/${attemptId}`, { cache: 'no-store' });
        const data = (await res.json()) as AttemptData & { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Could not load exam.');

        if (data.attempt.status !== 'in_progress') {
          router.replace(`/results/${attemptId}`);
          return;
        }

        const questions: QuestionPublic[] = data.questions
          .sort((a, b) => a.position - b.position)
          .map((aq) => aq.question as unknown as QuestionPublic);

        const attemptRemaining = data.attempt.duration_seconds
          ? Math.max(
              0,
              data.attempt.duration_seconds -
                Math.round((Date.now() - new Date(data.attempt.started_at).getTime()) / 1000)
            )
          : null;

        const globalDeadline = mode === 'cbt' ? data.challenge_global_deadline : null;
        const globalRemaining = globalDeadline
          ? Math.max(0, Math.ceil((new Date(globalDeadline).getTime() - Date.now()) / 1000))
          : null;

        const remainingSeconds =
          globalRemaining === null
            ? attemptRemaining
            : attemptRemaining === null
              ? globalRemaining
              : Math.min(attemptRemaining, globalRemaining);

        if (remainingSeconds !== null && remainingSeconds <= 0 && mode === 'cbt') {
          const submit = await fetch(`/api/exams/${attemptId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto_submitted: true }),
          });

          if (!submit.ok) {
            const submitData = await submit.json().catch(() => null);
            throw new Error(submitData?.error ?? 'The challenge has ended and could not be submitted automatically.');
          }

          if (!cancelled) router.replace(`/results/${attemptId}`);
          return;
        }

        if (!cancelled) setState({ questions, durationSeconds: remainingSeconds });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load exam.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, mode, router]);

  if (error) return <div className="rounded-xl bg-amber-50 p-6 text-center text-amber-800">{error}</div>;
  if (!state) return <p className="p-8 text-center text-slate-400">Loading exam...</p>;

  return <ExamRunner attemptId={attemptId} mode={mode} questions={state.questions} durationSeconds={state.durationSeconds} />;
}
