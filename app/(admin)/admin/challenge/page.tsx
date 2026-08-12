'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Subject { id: string; name: string; }
interface Round { id: string; title: string; question_count: number; duration_seconds: number; subjects: { name: string } | null; }

export default function AdminChallengePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [form, setForm] = useState({ title: '', subject_id: '', question_count: 20, duration_minutes: 15 });
  const [loading, setLoading] = useState(false);

  function load() {
    fetch('/api/challenge/rounds').then((r) => r.json()).then(setRounds);
  }
  useEffect(() => {
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects);
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/challenge/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title, subject_id: form.subject_id || undefined,
        question_count: form.question_count, duration_seconds: form.duration_minutes * 60,
      }),
    });
    setForm({ title: '', subject_id: '', question_count: 20, duration_minutes: 15 });
    setLoading(false);
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">UTME Challenge Rounds</h1>

      <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          required placeholder="Round title (e.g. Weekly Maths Blitz)" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <select
          value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Select subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number" placeholder="Questions" value={form.question_count}
            onChange={(e) => setForm({ ...form, question_count: parseInt(e.target.value, 10) || 10 })}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
          <input
            type="number" placeholder="Minutes" value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value, 10) || 5 })}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <Button type="submit" loading={loading}>Create Round</Button>
      </form>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {rounds.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-slate-800">{r.title}</p>
              <p className="text-xs text-slate-400">{r.subjects?.name} · {r.question_count}q · {Math.round(r.duration_seconds / 60)}min</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
