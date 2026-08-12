'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Subject { id: string; name: string; exam_types: string[]; }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState('');
  const [examTypes, setExamTypes] = useState<string[]>(['jamb']);
  const [loading, setLoading] = useState(false);

  function load() {
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects);
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, exam_types: examTypes }),
    });
    setName('');
    setLoading(false);
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Subjects</h1>

      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject name</label>
          <input
            required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mathematics"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          {['jamb', 'waec'].map((type) => (
            <label key={type} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={examTypes.includes(type)}
                onChange={(e) =>
                  setExamTypes(e.target.checked ? [...examTypes, type] : examTypes.filter((t) => t !== type))
                }
              />
              {type.toUpperCase()}
            </label>
          ))}
        </div>
        <Button type="submit" loading={loading}>Add Subject</Button>
      </form>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {subjects.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium text-slate-800">{s.name}</span>
            <span className="text-xs uppercase text-slate-400">{s.exam_types.join(', ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
