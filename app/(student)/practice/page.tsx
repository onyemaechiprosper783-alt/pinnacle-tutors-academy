'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Subject { id: string; name: string; }

export default function PracticeIndexPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects);
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Practice</h1>
      <p className="mb-6 text-slate-500">Pick a subject — answer at your own pace with instant feedback.</p>

      {subjects.length === 0 ? (
        <p className="text-slate-400">Subjects are being prepared. Please check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/practice/${s.id}`}
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
