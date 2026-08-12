import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const [{ count: students }, { count: questions }, { count: attempts }] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    admin.from('questions').select('id', { count: 'exact', head: true }),
    admin.from('exam_attempts').select('id', { count: 'exact', head: true }),
  ]);

  const stats = [
    { label: 'Total Students', value: students ?? 0 },
    { label: 'Total Questions', value: questions ?? 0 },
    { label: 'Exam Attempts', value: attempts ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{s.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
