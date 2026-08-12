'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Subject { id: string; name: string; exam_types: string[]; }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => { fetch('/api/subjects').then((r) => r.json()).then(setSubjects); }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Subjects</h1>
      <p className="mb-8 text-slate-500">Practice questions across JAMB and WAEC subjects.</p>

      {subjects.length === 0 ? (
        <p className="text-slate-400">Subjects are being prepared. Please check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {subjects.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 p-4 text-center">
              <p className="font-medium text-slate-800">{s.name}</p>
              <p className="text-xs uppercase text-slate-400">{s.exam_types.join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      <Link href="/register" className="mt-8 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white">
        Sign up to start practicing
      </Link>
    </div>
  );
}
