'use client';

import { useEffect, useState } from 'react';

interface Question {
  id: string;
  question_text: string;
  millionaire_tier: number | null;
  modes: string[];
  subjects: { name: string } | null;
}

const TIERS = Array.from({ length: 15 }, (_, i) => i + 1);

export default function AdminMillionairePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');

  function load() {
    const params = new URLSearchParams({ mode: 'millionaire' });
    if (search) params.set('search', search);
    fetch(`/api/questions?${params}`).then((r) => r.json()).then((d) => setQuestions(d.questions ?? []));
  }
  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function assignTier(id: string, tier: number | null) {
    await fetch(`/api/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ millionaire_tier: tier }),
    });
    load();
  }

  const byTier = new Map(questions.map((q) => [q.millionaire_tier, q]));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Millionaire Mode</h1>
      <p className="mb-6 text-slate-500">
        Assign one question per prize tier. Tag a question with the &quot;millionaire&quot; mode on the
        Questions page (or via bulk import) before it will appear here.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-2 md:grid-cols-3">
        {TIERS.map((tier) => {
          const assigned = byTier.get(tier);
          return (
            <div key={tier} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Tier {tier}</p>
              {assigned ? (
                <>
                  <p className="mb-2 truncate text-sm text-slate-800">{assigned.question_text}</p>
                  <button onClick={() => assignTier(assigned.id, null)} className="text-xs font-medium text-red-600">
                    Remove
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-300">Empty</p>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mb-2 font-semibold text-slate-800">Unassigned millionaire-tagged questions</h2>
      <input
        value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
        className="mb-3 w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-500"
      />
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {questions.filter((q) => !q.millionaire_tier).map((q) => (
          <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex-1 truncate text-sm text-slate-800">{q.question_text}</span>
            <select
              onChange={(e) => e.target.value && assignTier(q.id, parseInt(e.target.value, 10))}
              defaultValue=""
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Assign tier...</option>
              {TIERS.filter((t) => !byTier.has(t)).map((t) => <option key={t} value={t}>Tier {t}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
