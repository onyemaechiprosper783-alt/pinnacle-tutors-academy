'use client';

import { useEffect, useState } from 'react';

interface Attempt {
  id: string; mode: string; status: string; score: number | null;
  correct_count: number | null; total_questions: number | null;
  started_at: string; profiles: { full_name: string } | null;
}

const MODES = ['', 'practice', 'mock', 'cbt', 'utme_challenge', 'millionaire'];

export default function AdminResultsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [mode, setMode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    fetch(`/api/admin/results?${params}`).then((r) => r.json()).then(setAttempts);
  }, [mode]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Exam Results</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m || 'all'}
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${mode === m ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            {m ? m.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{a.profiles?.full_name ?? '—'}</td>
                <td className="px-4 py-3 capitalize text-slate-500">{a.mode.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-500">{a.score != null ? `${a.score}%` : '—'}</td>
                <td className="px-4 py-3 capitalize text-slate-500">{a.status.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(a.started_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
