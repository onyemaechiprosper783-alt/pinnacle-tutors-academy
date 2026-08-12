'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Subject { id: string; name: string; }

export default function MockSetupPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(40);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/subjects').then((r) => r.json()).then(setSubjects); }, []);

  function toggleSubject(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleStart() {
    if (selected.length === 0) { setError('Select at least one subject.'); return; }
    setError('');
    setLoading(true);

    const res = await fetch('/api/exams/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'mock', subject_ids: selected,
        question_count: questionCount, duration_seconds: durationMinutes * 60,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Could not start mock exam.'); return; }
    router.push(`/mock/${data.attempt_id}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Mock Exam</h1>
      <p className="mb-6 text-slate-500">Simulate real exam conditions with a timer and multiple subjects.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <p className="mb-2 text-sm font-medium text-slate-700">Subjects</p>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {subjects.map((s) => (
          <label key={s.id} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${selected.includes(s.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSubject(s.id)} />
            {s.name}
          </label>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Number of questions</label>
          <input
            type="number" min={10} max={250} value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 10)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Duration (minutes)</label>
          <input
            type="number" min={5} max={240} value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 5)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <Button onClick={handleStart} loading={loading} fullWidth>Start Mock Exam</Button>
    </div>
  );
}
