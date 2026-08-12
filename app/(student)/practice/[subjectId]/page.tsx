'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExamRunner } from '@/components/cbt/ExamRunner';
import type { QuestionPublic } from '@/types/database';

export default function PracticePage() {
  const params = useParams<{ subjectId: string }>();
  const [session, setSession] = useState<{ attemptId: string; questions: QuestionPublic[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/exams/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'practice', subject_ids: [params.subjectId], question_count: 20 }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Could not start practice.');
        setSession({ attemptId: data.attempt_id, questions: data.questions });
      })
      .catch((e) => setError(e.message));
  }, [params.subjectId]);

  if (error) {
    return (
      <div className="rounded-xl bg-amber-50 p-6 text-center text-amber-800">
        {error}
      </div>
    );
  }
  if (!session) return <p className="p-8 text-center text-slate-400">Loading practice session...</p>;

  return <ExamRunner attemptId={session.attemptId} mode="practice" questions={session.questions} durationSeconds={null} />;
}
