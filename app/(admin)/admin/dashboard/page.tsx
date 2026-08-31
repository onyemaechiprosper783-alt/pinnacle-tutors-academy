import { createAdminClient } from '@/lib/supabase/admin';

type Feedback = { id: string; message: string; created_at: string };

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const [{ count: students }, { count: questions }, { count: attempts }, { data: feedbackData }] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    admin.from('questions').select('id', { count: 'exact', head: true }),
    admin.from('exam_attempts').select('id', { count: 'exact', head: true }),
    admin.from('feedback').select('id, message, created_at').order('created_at', { ascending: false }).limit(20),
  ]);
  const stats = [
    { label: 'Total Students', value: students ?? 0, icon: '👥', tone: 'from-blue-600 to-brand-700' },
    { label: 'Total Questions', value: questions ?? 0, icon: '❓', tone: 'from-brand-700 to-indigo-700' },
    { label: 'Exam Attempts', value: attempts ?? 0, icon: '📝', tone: 'from-accent-500 to-amber-600' },
  ];
  const feedback = (feedbackData ?? []) as Feedback[];

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 px-6 py-7 text-white shadow-2xl sm:px-8 sm:py-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent-400/15 blur-2xl" />
        <div className="absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent-300">Pinnacle Tutors Academy</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Admin Command Center</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Monitor students, content and examination activity from one place.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">System</p><p className="mt-1 text-sm font-black text-emerald-300">● Operational</p></div>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => <div key={s.label} className="group overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tone} text-xl text-white shadow-lg`}>{s.icon}</div><span className="text-xs font-bold text-emerald-500">LIVE</span></div><p className="mt-5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{s.label}</p><p className="mt-1 text-3xl font-black text-[var(--foreground)]">{s.value.toLocaleString()}</p></div>)}
      </section>
      <section>
        <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-600 dark:text-accent-300">Student voice</p><h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">Recent Feedback 💬</h2><p className="mt-1 text-sm text-[var(--muted)]">Keep an eye on what students are saying.</p></div><div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{feedback.length} recent</div></div>
        {feedback.length === 0 ? <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl dark:bg-brand-950/40">💬</div><h3 className="mt-4 font-black text-[var(--foreground)]">No feedback yet</h3><p className="mt-1 text-sm text-[var(--muted)]">Student feedback will appear here when submitted.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{feedback.map((item) => <article key={item.id} className="group rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-xl dark:from-brand-950/50 dark:to-accent-950/30">💬</div><div className="min-w-0 flex-1"><p className="whitespace-pre-line text-sm leading-6 text-[var(--foreground)]">{item.message}</p><div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]"><span>Student feedback</span><span>•</span><span>{new Date(item.created_at).toLocaleString()}</span></div></div></div></article>)}</div>}
      </section>
      <section className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">Quick overview</p><h2 className="mt-1 text-lg font-black text-[var(--foreground)]">Keep building Pinnacle 🚀</h2><p className="mt-1 text-sm text-[var(--muted)]">Use the navigation to manage questions, students, access keys, notes, exams and challenges.</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-2xl dark:bg-accent-950/30">🏆</div></div></section>
    </div>
  );
}
