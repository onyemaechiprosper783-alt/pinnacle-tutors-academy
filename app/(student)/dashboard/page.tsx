import { getCurrentProfile } from '@/lib/supabase/server';

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name?.split(' ')[0]} 👋</h1>
      <p className="mt-1 text-slate-500">
        Preparing for: <span className="font-medium">{profile?.exam_target ?? 'not set'}</span>
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {['Practice', 'Mock Exam', 'CBT', 'UTME Challenge'].map((label) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-xs text-slate-400">Coming online in the next phase</p>
          </div>
        ))}
      </div>
    </div>
  );
}
