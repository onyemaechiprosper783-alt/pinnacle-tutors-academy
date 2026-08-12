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

export function AttemptRunnerLoader({ attemptId, mode }: { attemptId: string; mode: 'mock' | 'cbt' }) {
  const router = useRouter();
  const [state, setState] = useState<{ questions: QuestionPublic[]; durationSeconds: number | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/exams/${attemptId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Could not load exam.');

        if (data.attempt.status !== 'in_progress') {
          router.replace(`/results/${attemptId}`);
          return;
        }

        const questions: QuestionPublic[] = (data.questions as AttemptQuestionRow[])
          .sort((a, b) => a.position - b.position)
          .map((aq) => aq.question as unknown as QuestionPublic);

        const remainingSeconds = data.attempt.duration_seconds
          ? Math.max(
              0,
              data.attempt.duration_seconds -
                Math.round((Date.now() - new Date(data.attempt.started_at).getTime()) / 1000)
            )
          : null;

        setState({ questions, durationSeconds: remainingSeconds });
      })
      .catch((e) => setError(e.message));
  }, [attemptId, router]);

  if (error) return <div className="rounded-xl bg-amber-50 p-6 text-center text-amber-800">{error}</div>;
  if (!state) return <p className="p-8 text-center text-slate-400">Loading exam...</p>;

  return <ExamRunner attemptId={attemptId} mode={mode} questions={state.questions} durationSeconds={state.durationSeconds} />;
}
