'use client';

import { useEffect, useState } from 'react';

interface Entry {
  rank: number;
  score: number;
  time_used_seconds: number | null;
  name: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    fetch('/api/leaderboard?category=utme_challenge').then((r) => r.json()).then(setEntries);
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Leaderboard</h1>
      <p className="mb-6 text-slate-500">Top UTME Challenge scores.</p>

      {entries.length === 0 ? (
        <p className="text-slate-400">No entries yet — be the first!</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {entries.map((e) => (
            <div key={e.rank} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  e.rank === 1 ? 'bg-amber-100 text-amber-700' :
                  e.rank === 2 ? 'bg-slate-200 text-slate-700' :
                  e.rank === 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-50 text-slate-400'
                }`}>
                  {e.rank}
                </span>
                <span className="font-medium text-slate-800">{e.name}</span>
              </div>
              <span className="font-semibold text-emerald-700">{e.score}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
