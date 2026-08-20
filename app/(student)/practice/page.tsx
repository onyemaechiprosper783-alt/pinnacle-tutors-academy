'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Subject { id: string; name: string; }

export default function PracticeIndexPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/subjects', { cache: 'force-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load subjects');
        return r.json();
      })
      .then((data) => { if (active) setSubjects(data); })
      .catch(() => { if (active) setSubjects([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Practice</h1>
      <p className="mb-6 text-slate-500">Pick a subject — answer at your own pace with instant feedback.</p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Loading subjects">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />)}
        </div>
      ) : subjects.length === 0 ? (
        <p className="text-slate-400">Subjects are being prepared. Please check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/practice/${s.id}`}
              prefetch
              className="rounded-xl border border-slate-200 bg-white p-4 text-center font-medium text-slate-800 shadow-sm active:bg-slate-50"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
