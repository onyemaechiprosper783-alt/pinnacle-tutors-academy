import { createAdminClient } from '@/lib/supabase/admin';

type Feedback = {
  id: string;
  message: string;
  created_at: string;
};

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const [
    { count: students },
    { count: questions },
    { count: attempts },
    { data: feedbackData },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student'),

    admin
      .from('questions')
      .select('id', { count: 'exact', head: true }),

    admin
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true }),

    admin
      .from('feedback')
      .select('id, message, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const stats = [
    {
      label: 'Total Students',
      value: students ?? 0,
    },
    {
      label: 'Total Questions',
      value: questions ?? 0,
    },
    {
      label: 'Exam Attempts',
      value: attempts ?? 0,
    },
  ];

  const feedback = (feedbackData ?? []) as Feedback[];

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage Pinnacle Tutors Academy and view student activity.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {s.label}
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* FEEDBACK */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Student Feedback 💬
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Recent feedback submitted by students.
            </p>
          </div>

          <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
            {feedback.length} recent
          </div>
        </div>

        {feedback.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">💬</div>

            <h3 className="mt-3 font-bold text-slate-900">
              No feedback yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Student feedback will appear here when submitted.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                    💬
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                      {item.message}
                    </p>

                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
