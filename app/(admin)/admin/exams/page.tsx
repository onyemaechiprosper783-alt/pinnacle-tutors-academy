import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminExamsPage() {
  const admin = createAdminClient();
  const modes = ['practice', 'mock', 'cbt', 'utme_challenge', 'millionaire'] as const;

  const counts = await Promise.all(
    modes.map((mode) =>
      admin.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('mode', mode)
    )
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Exams Overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {modes.map((mode, i) => (
          <div key={mode} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium capitalize text-slate-500">{mode.replace('_', ' ')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{counts[i].count ?? 0}</p>
            <p className="text-xs text-slate-400">attempts total</p>
          </div>
        ))}
      </div>
      <Link href="/admin/results" className="mt-6 inline-block font-semibold text-emerald-700">
        View all results →
      </Link>
    </div>
  );
}
