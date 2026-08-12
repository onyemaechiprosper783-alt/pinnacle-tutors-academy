'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Subject { id: string; name: string; }
interface Topic { id: string; name: string; }

export default function TopicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch('/api/subjects').then((r) => r.json()).then(setSubjects); }, []);

  function loadTopics(id: string) {
    if (!id) { setTopics([]); return; }
    fetch(`/api/topics?subject_id=${id}`).then((r) => r.json()).then(setTopics);
  }
  useEffect(() => { loadTopics(subjectId); }, [subjectId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: subjectId, name }),
    });
    setName('');
    setLoading(false);
    loadTopics(subjectId);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Topics</h1>

      <select
        value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
      >
        <option value="">Select a subject</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {subjectId && (
        <>
          <form onSubmit={handleAdd} className="mb-6 flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Topic name</label>
              <input
                required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Algebra"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <Button type="submit" loading={loading}>Add Topic</Button>
          </form>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {topics.length === 0 && <p className="p-4 text-sm text-slate-400">No topics yet.</p>}
            {topics.map((t) => (
              <div key={t.id} className="px-4 py-3 font-medium text-slate-800">{t.name}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
