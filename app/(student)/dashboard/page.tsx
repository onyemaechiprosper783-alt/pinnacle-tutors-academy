import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const QUICK_ACTIONS = [
  { href: '/practice', icon: '📚', title: 'Practice', description: 'Practice JAMB & WAEC questions' },
  { href: '/mock', icon: '📝', title: 'Mock Exam', description: 'Take a full mock examination' },
  { href: '/cbt', icon: '💻', title: 'CBT', description: 'Experience a real CBT simulation' },
  { href: '/challenge', icon: '🔥', title: 'Challenge', description: 'Compete and test your knowledge' },
];

const MORE_FEATURES = [
  { href: '/millionaire', icon: '💰', title: 'Millionaire', description: 'Climb the prize ladder', protected: true },
  { href: '/leaderboard', icon: '🏆', title: 'Leaderboard', description: 'See your ranking' },
  { href: '/results', icon: '📊', title: 'My Results', description: 'Review your performance' },
  { href: '/progress', icon: '📈', title: 'Progress', description: 'Track your improvement' },
  { href: '/community', icon: '👥', title: 'Community', description: 'Connect with other students' },
  { href: '/subjects', icon: '📖', title: 'Subjects', description: 'Explore your subjects', protected: true },
  { href: '/class-notes', icon: '📚', title: 'Class Notes', description: 'Access your Pinnacle study notes', protected: true },
  { href: '/profile', icon: '👤', title: 'Profile', description: 'Manage your account' },
];

const PROTECTED_QUICK_ACTIONS = new Set(QUICK_ACTIONS.map((item) => item.href));
const ACTIVATION_ONLY_AT = new Date('2026-10-01T00:00:00+01:00');
const WHATSAPP_NUMBER = '2347051101464';

type Testimonial = { id: string; student_name: string; exam_type: 'jamb' | 'waec'; score: string; year: number; message: string; photo_url: string | null };
type AttemptSummary = { score: number | null; submitted_at: string | null; mode: string | null };

function getProgressMessage(attempts: AttemptSummary[]) {
  if (attempts.length === 0) return { title: 'Your journey starts here 🚀', text: 'Complete your first exam and your progress will appear here.' };
  if (attempts.length === 1) return { title: 'Well done — keep going! 🌟', text: `You scored ${attempts[0].score ?? 0}. Your next attempt gives you a new chance to improve.` };
  const latest = Number(attempts[0].score ?? 0); const previous = Number(attempts[1].score ?? 0);
  if (latest > previous) return { title: 'Well done! You did better than your previous attempt. 🎉', text: `You improved from ${previous} to ${latest}. Keep that momentum going.` };
  if (latest < previous) return { title: 'Keep going — you can bounce back. 💪', text: `Your latest score was ${latest}. Review your weak areas and try again.` };
  return { title: 'You are building consistency. 🔥', text: `You matched your previous score of ${latest}. One more focused session can push you higher.` };
}

function requestActivationUrl() {
  const message = encodeURIComponent('Hello Pinnacle Tutors Academy, I would like to request an Activation Key for my student account.');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const examTarget = profile?.exam_target || 'JAMB / WAEC';
  let testimonials: Testimonial[] = []; let attempts: AttemptSummary[] = [];
  let hasLearningAccess = false;

  try {
    const admin = createAdminClient();
    const [{ data: testimonialData }, { data: attemptData }, { data: accessData }] = await Promise.all([
      admin.from('testimonials').select('id, student_name, exam_type, score, year, message, photo_url').eq('is_published', true).order('year', { ascending: false }).order('created_at', { ascending: false }).limit(10),
      profile?.id ? admin.from('exam_attempts').select('score, submitted_at, mode').eq('student_id', profile.id).neq('status', 'in_progress').order('submitted_at', { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
      profile?.id ? admin.from('student_access').select('access_type, expires_at, access_keys!inner(status, is_active)').eq('profile_id', profile.id).eq('access_keys.status', 'used').eq('access_keys.is_active', true) : Promise.resolve({ data: [], error: null }),
    ]);
    testimonials = (testimonialData ?? []) as Testimonial[]; attempts = (attemptData ?? []) as AttemptSummary[];
    const now = new Date();
    hasLearningAccess = (accessData ?? []).some((access: any) => {
      if (now >= ACTIVATION_ONLY_AT) return access.access_type === 'activation_key';
      return access.access_type === 'activation_key' || (access.access_type === 'product_key' && (!access.expires_at || new Date(access.expires_at) > now));
    });
  } catch { testimonials = []; attempts = []; }

  const progress = getProgressMessage(attempts); const latestScore = attempts.length ? Number(attempts[0].score ?? 0) : null;
  const activationUrl = requestActivationUrl();
  const renderCard = (item: any) => {
    const locked = Boolean(item.protected || PROTECTED_QUICK_ACTIONS.has(item.href)) && !hasLearningAccess;
    if (locked) return <a key={item.href} href={activationUrl} target="_blank" rel="noopener noreferrer" className="pta-card group relative p-4 sm:p-5"><div className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">🔒 Activation Required</div><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl dark:bg-brand-950/40 sm:h-12 sm:w-12 sm:text-2xl">{item.icon}</div><h3 className="mt-4 text-sm font-black text-[var(--foreground)] sm:text-base">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-[var(--muted)] sm:text-sm">{item.description}</p><span className="mt-3 inline-flex rounded-xl bg-brand-700 px-3 py-2 text-xs font-black text-white">Request Activation Key</span></a>;
    return <Link key={item.href} href={item.href} className="pta-card group p-4 sm:p-5"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl transition group-hover:scale-110 dark:bg-brand-950/40 sm:h-12 sm:w-12 sm:text-2xl">{item.icon}</div><span className="text-lg text-slate-300 transition group-hover:text-brand-500">→</span></div><h3 className="mt-4 text-sm font-black text-[var(--foreground)] sm:text-base">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-[var(--muted)] sm:text-sm">{item.description}</p></Link>;
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <section className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-gradient-to-br from-brand-800 via-brand-700 to-accent-600 px-5 py-5 text-white shadow-xl sm:px-7 sm:py-6"><div className="relative z-10 max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-200">Pinnacle Tutors Academy</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Welcome back, {firstName}! 👋</h1><p className="mt-1.5 max-w-xl text-sm leading-5 text-brand-100">Practice smarter, improve your score and stay ahead.</p><div className="mt-3.5 flex flex-wrap gap-2.5"><Link href="/practice" className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-brand-800 shadow-md transition hover:-translate-y-0.5">Start Practicing →</Link><Link href="/results" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">View Results</Link></div></div><div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-white/10" /><div className="absolute right-8 top-1/2 hidden -translate-y-1/2 text-[78px] opacity-15 lg:block">🎓</div></section>
    <section className="pta-card rounded-[24px] border-accent-200 bg-gradient-to-br from-accent-50 to-brand-50 p-5 dark:border-accent-800 dark:from-accent-950/30 dark:to-brand-950/30 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-700 dark:text-accent-300">Your progress</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">{progress.title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{progress.text}</p></div><div className="flex shrink-0 items-center gap-3"><div className="rounded-2xl bg-[var(--card)] px-4 py-3 text-center shadow-sm"><p className="text-[10px] font-bold uppercase text-[var(--muted)]">Latest score</p><p className="mt-1 text-2xl font-black text-brand-700 dark:text-brand-300">{latestScore === null ? '—' : latestScore}</p></div><Link href="/progress" className="rounded-xl bg-brand-700 px-4 py-3 text-sm font-black text-white shadow-md transition hover:bg-brand-800">View Progress</Link></div></div></section>
    <section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">Real Results</p><h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">Pinnacle Success Stories ⭐</h2><p className="mt-1 text-sm text-[var(--muted)]">Real students. Real preparation. Real results.</p></div><span className="hidden shrink-0 text-xs font-bold text-[var(--muted)] sm:block">Swipe to explore →</span></div>{testimonials.length === 0 ? <div className="pta-card rounded-[24px] border-dashed p-7 text-center"><div className="text-4xl">🏆</div><h3 className="mt-3 font-black text-[var(--foreground)]">Your success story could be next!</h3><Link href="/practice" className="mt-4 inline-flex rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-brand-800">Start Practicing →</Link></div> : <div className="testimonial-rail">{testimonials.map((item) => <article key={item.id} className="pta-card overflow-hidden rounded-[24px]"><div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-950/50 dark:to-accent-950/40">{item.photo_url ? <img src={item.photo_url} alt={item.student_name} className="h-full w-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-accent-500 text-3xl font-black text-white">{item.student_name.charAt(0).toUpperCase()}</div>}<span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase text-brand-700 shadow">{item.exam_type}</span><span className="absolute bottom-3 left-3 rounded-lg bg-brand-700 px-3 py-1 text-sm font-black text-white shadow">{item.score}</span></div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-black text-[var(--foreground)]">{item.student_name}</h3><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{item.year} • Pinnacle Student</p></div><span>🏆</span></div><p className="mt-3 line-clamp-3 text-sm leading-5 text-[var(--muted)]">“{item.message}”</p><div className="mt-3 text-sm text-accent-500">★★★★★</div></div></article>)}</div>}</section>
    <section className="grid grid-cols-2 gap-3 sm:gap-4"><div className="pta-card p-4 sm:p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl dark:bg-brand-950/40">🎯</div><div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Exam Target</p><p className="mt-1 text-sm font-black text-[var(--foreground)] sm:text-lg">{examTarget}</p></div></div></div><div className="pta-card p-4 sm:p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-xl dark:bg-accent-950/40">⚡</div><div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Today's Goal</p><p className="mt-1 text-sm font-black text-[var(--foreground)] sm:text-lg">Keep learning</p></div></div></div></section>
    <section><div className="mb-4"><h2 className="text-xl font-black text-[var(--foreground)]">Start Learning</h2><p className="mt-1 text-sm text-[var(--muted)]">Choose an activity and start improving your score.</p></div><div className="grid grid-cols-2 gap-3 sm:gap-4">{QUICK_ACTIONS.map(renderCard)}</div></section>
    <section><div className="mb-4"><h2 className="text-xl font-black text-[var(--foreground)]">Explore Pinnacle</h2><p className="mt-1 text-sm text-[var(--muted)]">Everything you need in one place.</p></div><div className="grid grid-cols-2 gap-3 sm:gap-4">{MORE_FEATURES.map(renderCard)}</div></section>
    <section className="rounded-[24px] bg-gradient-to-r from-brand-800 to-accent-600 px-5 py-6 text-white shadow-xl sm:px-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-accent-200">Join the Pinnacle Family</p><h2 className="mt-1 text-xl font-black">Don't prepare alone. 🚀</h2><p className="mt-1 text-sm text-brand-100">Get updates, study motivation and connect with other students.</p></div><Link href="/community" className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-brand-800 transition hover:-translate-y-0.5">Join Community →</Link></div></section>
    <section className="py-2 text-center"><p className="text-sm font-semibold text-[var(--muted)]">🎓 Practice today. Improve tomorrow. Succeed with Pinnacle.</p></section>
  </div>;
}
