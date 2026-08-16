import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const QUICK_ACTIONS = [
  {
    href: '/practice',
    icon: '📚',
    title: 'Practice',
    description: 'Practice JAMB & WAEC questions',
  },
  {
    href: '/mock',
    icon: '📝',
    title: 'Mock Exam',
    description: 'Take a full mock examination',
  },
  {
    href: '/cbt',
    icon: '💻',
    title: 'CBT',
    description: 'Experience a real CBT simulation',
  },
  {
    href: '/challenge',
    icon: '🔥',
    title: 'Challenge',
    description: 'Compete and test your knowledge',
  },
];

const MORE_FEATURES = [
  {
    href: '/millionaire',
    icon: '💰',
    title: 'Millionaire',
    description: 'Climb the prize ladder',
  },
  {
    href: '/leaderboard',
    icon: '🏆',
    title: 'Leaderboard',
    description: 'See your ranking',
  },
  {
    href: '/results',
    icon: '📊',
    title: 'My Results',
    description: 'Review your performance',
  },
  {
    href: '/community',
    icon: '👥',
    title: 'Community',
    description: 'Connect with other students',
  },
  {
    href: '/subjects',
    icon: '📖',
    title: 'Subjects',
    description: 'Explore your subjects',
  },
  {
    href: '/class-notes',
    icon: '📚',
    title: 'Class Notes',
    description: 'Access your Pinnacle study notes',
  },
  {
    href: '/profile',
    icon: '👤',
    title: 'Profile',
    description: 'Manage your account',
  },
];

type Testimonial = {
  id: string;
  student_name: string;
  exam_type: 'jamb' | 'waec';
  score: string;
  year: number;
  message: string;
  photo_url: string | null;
};

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const examTarget = profile?.exam_target || 'JAMB / WAEC';

  let testimonials: Testimonial[] = [];

  try {
    const admin = createAdminClient();

    const { data } = await admin
      .from('testimonials')
      .select(
        'id, student_name, exam_type, score, year, message, photo_url'
      )
      .eq('is_published', true)
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6);

    testimonials = (data ?? []) as Testimonial[];
  } catch {
    testimonials = [];
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-6">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
            Pinnacle Tutors Academy
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Welcome back, {firstName}! 👋
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
            Your journey to academic success starts here. Practice smarter,
            improve your score and stay ahead.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-700 shadow-lg transition hover:scale-[1.02]"
            >
              Start Practicing →
            </Link>

            <Link
              href="/results"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              View Results
            </Link>
          </div>
        </div>

        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-16 h-64 w-64 rounded-full bg-white/5" />

        <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 text-[110px] opacity-20 lg:block">
          🎓
        </div>
      </section>

      {/* EXAM TARGET */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl dark:bg-emerald-950/40">
              🎯
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Exam Target
              </p>

              <p className="mt-1 text-lg font-black text-[var(--foreground)]">
                {examTarget}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl dark:bg-amber-950/40">
              ⚡
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Today's Goal
              </p>

              <p className="mt-1 text-lg font-black text-[var(--foreground)]">
                Keep learning
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN LEARNING */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-[var(--foreground)]">
            Start Learning
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose an activity and start improving your score.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg dark:hover:border-emerald-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-50 text-2xl transition group-hover:scale-110 dark:bg-emerald-950/40">
                  {item.icon}
                </div>

                <span className="text-xl text-slate-300 transition group-hover:text-emerald-500 dark:text-slate-600">
                  →
                </span>
              </div>

              <h3 className="mt-5 font-black text-[var(--foreground)]">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* SUCCESS STORIES */}
      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
              Real Results
            </p>

            <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">
              Pinnacle Success Stories ⭐
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Students who prepared, stayed consistent and achieved their goals.
            </p>
          </div>

          <Link
            href="/community"
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
          >
            Join Pinnacle →
          </Link>
        </div>

        {testimonials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center dark:border-amber-900 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="text-4xl">🏆</div>

            <h3 className="mt-3 font-black text-[var(--foreground)]">
              Your success story could be next!
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Keep practicing, stay consistent and work towards becoming our
              next JAMB or WAEC success story.
            </p>

            <Link
              href="/practice"
              className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
            >
              Start Practicing →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg dark:hover:border-emerald-800"
              >
                <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-emerald-50 dark:bg-emerald-950/40" />

                <div className="relative">
                  {/* STUDENT PHOTO */}
                  <div className="flex items-center justify-between gap-3">
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.student_name}
                        className="h-14 w-14 rounded-full object-cover ring-4 ring-emerald-50 dark:ring-emerald-950"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.student_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {item.exam_type}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h3 className="font-black text-[var(--foreground)]">
                      {item.student_name}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        {item.score}
                      </span>

                      <span className="text-xs font-semibold text-[var(--muted)]">
                        {item.year}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <span className="text-3xl leading-none text-emerald-200 dark:text-emerald-800">
                      “
                    </span>

                    <p className="mt-1 text-sm leading-6 text-[var(--foreground)]/80">
                      {item.message}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-1 text-amber-400">
                    {'★★★★★'}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* MORE FEATURES */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-[var(--foreground)]">
            Explore Pinnacle
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Everything you need in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_FEATURES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:hover:border-emerald-800"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-xl transition group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40">
                {item.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[var(--foreground)]">
                  {item.title}
                </h3>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  {item.description}
                </p>
              </div>

              <span className="text-lg text-slate-300 transition group-hover:text-emerald-500 dark:text-slate-600">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="rounded-2xl bg-slate-900 px-6 py-7 text-white shadow-lg dark:bg-slate-950 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Join the Pinnacle Family
            </p>

            <h2 className="mt-2 text-xl font-black sm:text-2xl">
              Don't prepare alone. 🚀
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Get updates, study motivation, announcements and connect with
              other students in our community.
            </p>
          </div>

          <Link
            href="/community"
            className="shrink-0 rounded-xl bg-emerald-500 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-emerald-400"
          >
            Join WhatsApp →
          </Link>
        </div>
      </section>

      {/* MOTIVATION */}
      <section className="py-3 text-center">
        <p className="text-sm font-semibold text-[var(--muted)]">
          🎓 Practice today. Improve tomorrow. Succeed with Pinnacle.
        </p>
      </section>

    </div>
  );
}
