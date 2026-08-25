'use client';

import { useMemo, useState } from 'react';

type University = {
  name: string;
  type: 'Federal' | 'State' | 'Private';
};

export default function UniversityDirectory({ universities }: { universities: University[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'All' | University['type']>('All');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return universities.filter((university) => {
      const matchesQuery = !normalized || university.name.toLowerCase().includes(normalized);
      const matchesType = type === 'All' || university.type === type;
      return matchesQuery && matchesType;
    });
  }, [query, type, universities]);

  return (
    <>
      <div className="mt-7 grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="university-search" className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
            Search universities
          </label>
          <input
            id="university-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Search by university name..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-cyan-950"
          />
        </div>
        <div>
          <label htmlFor="university-type" className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
            Type
          </label>
          <select
            id="university-type"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option>All</option>
            <option>Federal</option>
            <option>State</option>
            <option>Private</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{filtered.length} {filtered.length === 1 ? 'university' : 'universities'} found</span>
        {(query || type !== 'All') && (
          <button type="button" onClick={() => { setQuery(''); setType('All'); }} className="font-black text-cyan-600 hover:text-cyan-500">
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <div className="text-4xl">🔎</div>
            <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">No universities found</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a different name or clear the filters.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((university, index) => (
              <div key={`${university.type}-${university.name}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/50">🏫</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold leading-5 text-slate-900 dark:text-white">{university.name}</h3>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${university.type === 'Federal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : university.type === 'State' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'}`}>
                      {university.type} University
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
