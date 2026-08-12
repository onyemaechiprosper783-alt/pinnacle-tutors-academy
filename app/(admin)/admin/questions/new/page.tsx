'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionForm, emptyQuestion, type QuestionFormValue } from '@/components/admin/QuestionForm';

export default function NewQuestionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(value: QuestionFormValue) {
    setLoading(true);
    setError('');
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...value,
        topic_id: value.topic_id || null,
        year: value.year ? parseInt(value.year, 10) : undefined,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      setError('Could not save this question. Please check the fields and try again.');
      return;
    }
    router.push('/admin/questions');
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Add Question</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      <QuestionForm initial={emptyQuestion} onSubmit={handleSubmit} submitLabel="Save question" loading={loading} />
    </div>
  );
}
