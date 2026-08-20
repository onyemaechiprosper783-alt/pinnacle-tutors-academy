import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Attempt = { id: string; mode: string; status: string; started_at: string; submitted_at: string | null; score: number | null; correct_count: number | null; total_questions: number | null };
type AttemptQuestion = { attempt_id: string; question_id: string; is_correct: boolean | null };
type Question = { id: string; subject_id: string | null };
type Subject = { id: string; name: string };
type SubjectStat = { correct: number; total: number };
const COUNTED_MODES = ['practice', 'mock', 'cbt'];

function scoreAsPercent(attempt: Attempt) {
  if (!attempt.total_questions) return Number(attempt.score ?? 0);
  if (attempt.mode === 'cbt' && Number(attempt.score ?? 0) > 100) return Math.min(100, (Number(attempt.score) / 400) * 100);
  return Number(attempt.score ?? 0);
}
function labelMode(mode: string) { if (mode === 'cbt') return 'CBT'; if (mode === 'mock') return 'Mock Exam'; if (mode === 'practice') return 'Practice'; return mode; }

export default async function ProgressPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const admin = createAdminClient();
  const { data: attemptData } = await admin.from('exam_attempts').select('id, mode, status, started_at, submitted_at, score, correct_count, total_questions').eq('student_id', profile.id).in('mode', COUNTED_MODES).in('status', ['submitted', 'auto_submitted']).order('started_at', { ascending: true });
  const attempts = (attemptData ?? []) as Attempt[];
  const attemptIds = attempts.map((attempt) => attempt.id);
  let subjectStats = new Map<string, SubjectStat>();

  if (attemptIds.length) {
    const { data: aqData } = await admin.from('attempt_questions').select('attempt_id, question_id, is_correct').in('attempt_id', attemptIds);
    const attemptQuestions = (aqData ?? []) as AttemptQuestion[];
    const questionIds = [...new Set(attemptQuestions.map((item) => item.question_id))];
    if (questionIds.length) {
      // Resolve subjects by their IDs in a separate query instead of relying on
      // Supabase's inferred relationship shape. This keeps production builds
      // from collapsing valid subjects into "Unknown Subject".
      const { data: questionData } = await admin.from('questions').select('id, subject_id').in('id', questionIds);
      const questions = (questionData ?? []) as Question[];
      const subjectIds = [...new Set(questions.map((question) => question.subject_id).filter((id): id is string => Boolean(id)))];
      const { data: subjectData } = subjectIds.length
        ? await admin.from('subjects').select('id, name').in('id', subjectIds)
        : { data: [] as Subject[] };
      const subjectMap = new Map(((subjectData ?? []) as Subject[]).map((subject) => [subject.id, subject.name]));
      const questionMap = new Map(questions.map((question) => [question.id, question]));

      for (const item of attemptQuestions) {
        const question = questionMap.get(item.question_id);
        const subject = question?.subject_id ? subjectMap.get(question.subject_id) : null;
        const subjectName = subject?.trim() || 'Unknown Subject';
        const stat = subjectStats.get(subjectName) ?? { correct: 0, total: 0 };
        stat.total += 1;
        if (item.is_correct === true) stat.correct += 1;
        subjectStats.set(subjectName, stat);
      }
    }
  }

  const subjectRows = [...subjectStats.entries()].map(([name, stat]) => ({ name, ...stat, accuracy: stat.total ? Math.round((stat.correct / stat.total) * 100) : 0 })).sort((a, b) => b.accuracy - a.accuracy);
  const strongest = subjectRows[0] ?? null;
  const weakest = subjectRows[subjectRows.length - 1] ?? null;
  const average = attempts.length ? Math.round((attempts.reduce((sum, attempt) => sum + scoreAsPercent(attempt), 0) / attempts.length) * 10) / 10 : 0;
  const firstScore = attempts.length ? scoreAsPercent(attempts[0]) : 0;
  const latestScore = attempts.length ? scoreAsPercent(attempts[attempts.length - 1]) : 0;
  const improvement = Math.round((latestScore - firstScore) * 10) / 10;

  return <div className="mx-auto max-w-5xl space-y-7 pb-10">
    <section className="rounded-[30px] bg-gradient-to-br from-brand-800 via-brand-700 to-accent-600 p-6 text-white shadow-xl sm:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-accent-200">Pinnacle Tutors Academy</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">📈 Your Progress</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-brand-100">See how your performance has developed from your first completed exam to your latest one, including your strongest and weakest subjects.</p></section>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat title="Exams completed" value={attempts.length} icon="📝" /><Stat title="Average score" value={`${average}%`} icon="📊" /><Stat title="Latest score" value={`${Math.round(latestScore * 10) / 10}%`} icon="🎯" /><Stat title="Overall change" value={`${improvement >= 0 ? '+' : ''}${improvement}%`} icon={improvement >= 0 ? '🚀' : '📚'} /></section>
    <section className="grid gap-5 md:grid-cols-2"><div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-800 dark:bg-brand-950/30"><p className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">Strongest subject 💪</p>{strongest ? <><h2 className="mt-2 text-2xl font-black text-brand-900 dark:text-brand-100">{strongest.name}</h2><p className="mt-1 text-sm text-brand-700 dark:text-brand-300">{strongest.accuracy}% accuracy · {strongest.correct}/{strongest.total} correct</p></> : <p className="mt-3 text-sm text-brand-700 dark:text-brand-300">Complete an exam to discover your strongest subject.</p>}</div><div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 dark:border-accent-800 dark:bg-accent-950/30"><p className="text-xs font-black uppercase tracking-wider text-accent-700 dark:text-accent-300">Weakest subject 📚</p>{weakest ? <><h2 className="mt-2 text-2xl font-black text-accent-900 dark:text-accent-100">{weakest.name}</h2><p className="mt-1 text-sm text-accent-700 dark:text-accent-300">{weakest.accuracy}% accuracy · {weakest.correct}/{weakest.total} correct</p></> : <p className="mt-3 text-sm text-accent-700 dark:text-accent-300">Complete an exam to discover where you need the most improvement.</p>}</div></section>
    <section className="pta-card p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-black">Performance over time</h2><p className="mt-1 text-sm text-[var(--muted)]">Your completed practice, mock and CBT exams from oldest to newest.</p></div>{attempts.length > 1 && <p className={`text-sm font-black ${improvement >= 0 ? 'text-brand-600' : 'text-red-600'}`}>{improvement >= 0 ? '↗ Improving' : '↘ Needs attention'}</p>}</div>{attempts.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-8 text-center"><div className="text-4xl">📚</div><h3 className="mt-3 font-black">Your progress starts here</h3><p className="mt-1 text-sm text-[var(--muted)]">Complete your first practice, mock or CBT exam and your progress will appear here.</p><Link href="/practice" className="mt-5 inline-flex rounded-xl bg-brand-700 px-5 py-3 text-sm font-black text-white">Start Practicing →</Link></div> : <div className="mt-6 space-y-4">{attempts.map((attempt, index) => { const percent = scoreAsPercent(attempt); const displayScore = attempt.mode === 'cbt' && Number(attempt.score ?? 0) > 100 ? `${attempt.score}/400` : `${Math.round(Number(attempt.score ?? 0) * 10) / 10}%`; return <div key={attempt.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{index + 1}. {labelMode(attempt.mode)}</p><p className="text-xs text-[var(--muted)]">{new Date(attempt.started_at).toLocaleDateString()}</p></div><span className="font-black text-brand-700 dark:text-brand-300">{displayScore}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]"><div className="h-full rounded-full bg-gradient-to-r from-brand-700 to-accent-500" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div><p className="mt-2 text-xs text-[var(--muted)]">{attempt.correct_count ?? 0} correct out of {attempt.total_questions ?? 0}</p></div>; })}</div>}</section>
    <section className="pta-card p-6"><h2 className="text-xl font-black">Subject performance</h2><p className="mt-1 text-sm text-[var(--muted)]">Your strengths and weaknesses are calculated from every answered question in your completed exams.</p><div className="mt-5 space-y-4">{subjectRows.map((subject) => <div key={subject.name}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="font-black">{subject.name}</span><span className="font-bold text-[var(--muted)]">{subject.accuracy}%</span></div><div className="h-3 overflow-hidden rounded-full bg-[var(--surface-strong)]"><div className="h-full rounded-full bg-gradient-to-r from-brand-700 to-accent-500" style={{ width: `${subject.accuracy}%` }} /></div><p className="mt-1 text-xs text-[var(--muted)]">{subject.correct}/{subject.total} correct</p></div>)}{subjectRows.length === 0 && <p className="rounded-xl bg-[var(--background)] p-5 text-center text-sm text-[var(--muted)]">No subject data yet.</p>}</div></section>
    <Link href="/dashboard" className="block text-center text-sm font-black text-brand-700 dark:text-brand-300">← Back to Dashboard</Link>
  </div>;
}
function Stat({ title, value, icon }: { title: string; value: string | number; icon: string }) { return <div className="pta-card p-5"><div className="flex items-center justify-between"><span className="text-2xl">{icon}</span><span className="text-2xl font-black">{value}</span></div><p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{title}</p></div>; }
