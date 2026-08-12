'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Subject { id: string; name: string; }

export default function CbtSetupPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [questionCount, setQuestionCount] = useState(50);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => { fetch('/api/subjects').then((r) => r.json()).then(setSubjects); }, []);

  async function handleStart() {
    if (!subjectId) { setError('Select a subject.'); return; }
    setError('');
    setLoading(true);

    const res = await fetch('/api/exams/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'cbt', subject_ids: [subjectId],
        question_count: questionCount, duration_seconds: durationMinutes * 60,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Could not start CBT exam.'); return; }
    router.push(`/cbt/${data.attempt_id}`);
  }

  if (!started) {
    return (
      <div className="max-w-xl">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">CBT Exam</h1>
        <p className="mb-6 text-slate-500">A strict, timed computer-based test experience — just like the real thing.</p>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}

        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
          <select
            value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500"
          >
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Questions</label>
            <input
              type="number" min={10} max={100} value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 10)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Duration (min)</label>
            <input
              type="number" min={5} max={180} value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 5)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Once started, the timer cannot be paused. The exam auto-submits when time runs out.
        </div>

        <Button onClick={() => setStarted(true)} fullWidth disabled={!subjectId}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Ready to begin?</h1>
      <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>{questionCount} questions, {durationMinutes} minutes</li>
        <li>Use the question grid to jump between questions</li>
        <li>Your progress is saved automatically as you answer</li>
      </ul>
      <Button onClick={handleStart} loading={loading} fullWidth>Start Exam</Button>
    </div>
  );
}
