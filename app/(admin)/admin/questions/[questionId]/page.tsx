'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuestionForm, emptyQuestion, type QuestionFormValue } from '@/components/admin/QuestionForm';

export default function EditQuestionPage() {
  const params = useParams<{ questionId: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<QuestionFormValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/questions/${params.questionId}`)
      .then((r) => r.json())
      .then((q) => {
        setInitial({
          ...emptyQuestion,
          subject_id: q.subject_id ?? '',
          topic_id: q.topic_id ?? '',
          question_text: q.question_text ?? '',
          option_a: q.option_a ?? '',
          option_b: q.option_b ?? '',
          option_c: q.option_c ?? '',
          option_d: q.option_d ?? '',
          correct_answer: q.correct_answer ?? 'A',
          explanation: q.explanation ?? '',
          difficulty: q.difficulty ?? 'medium',
          exam_type: q.exam_type ?? 'general',
          year: q.year ? String(q.year) : '',
        });
      });
  }, [params.questionId]);

  async function handleSubmit(value: QuestionFormValue) {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/questions/${params.questionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...value,
        topic_id: value.topic_id || null,
        year: value.year ? parseInt(value.year, 10) : null,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      setError('Could not save changes. Please try again.');
      return;
    }
    router.push('/admin/questions');
  }

  if (!initial) return <p className="text-slate-400">Loading...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Edit Question</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      <QuestionForm initial={initial} onSubmit={handleSubmit} submitLabel="Save changes" loading={loading} />
    </div>
  );
}
