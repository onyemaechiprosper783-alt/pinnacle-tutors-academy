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
    <div className="mx-auto max-w-7xl space-y-7 pb-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-100">
            Pinnacle Tutors Academy
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Welcome back, {firstName}! 👋
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-orange-50 sm:text-base">
            Your journey to academic success starts here. Practice smarter,
            improve your score and stay ahead.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-orange-600 shadow-lg transition hover:scale-[1.02]"
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl dark:bg-orange-950/40">
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

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl dark:bg-red-950/40">
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
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg dark:hover:border-orange-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-orange-50 text-2xl transition group-hover:scale-110 dark:bg-orange-950/40">
                  {item.icon}
                </div>

                <span className="text-xl text-slate-300 transition group-hover:text-orange-500 dark:text-slate-600">
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
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            Real Results
          </p>

          <h2 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
            Pinnacle Success Stories ⭐
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            See the students who prepared, stayed consistent and achieved
            their academic goals.
          </p>
        </div>

        {testimonials.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 p-10 text-center dark:border-orange-900 dark:from-orange-950/30 dark:to-red-950/30">
            <div className="text-5xl">🏆</div>

            <h3 className="mt-4 text-xl font-black text-[var(--foreground)]">
              Your success story could be next!
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Keep practicing, stay consistent and work towards becoming our
              next JAMB or WAEC success story.
            </p>

            <Link
              href="/practice"
              className="mt-6 inline-flex rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-700"
            >
              Start Practicing →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-md transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl dark:hover:border-orange-800"
              >
                {/* TOP PHOTO AREA */}
                <div className="relative flex h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-orange-100 via-orange-50 to-red-100 dark:from-orange-950/50 dark:via-slate-900 dark:to-red-950/50">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.student_name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-orange-500 text-5xl font-black text-white shadow-xl">
                      {item.student_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* PHOTO OVERLAY */}
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* EXAM BADGE */}
                  <span className="absolute right-4 top-4 rounded-full bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-wide text-orange-700 shadow-lg">
                    {item.exam_type}
                  </span>

                  {/* SCORE */}
                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-xl bg-orange-600 px-4 py-2 text-lg font-black text-white shadow-lg">
                      {item.score}
                    </span>
                  </div>
                </div>

                {/* TESTIMONIAL CONTENT */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-[var(--foreground)]">
                        {item.student_name}
                      </h3>

                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        {item.year} • Pinnacle Student
                      </p>
                    </div>

                    <div className="text-2xl">🏆</div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/30">
                    <span className="text-4xl font-black leading-none text-orange-300">
                      “
                    </span>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--foreground)]">
                      {item.message}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex gap-1 text-lg text-orange-400">
                      ★★★★★
                    </div>

                    <span className="text-xs font-black uppercase tracking-wider text-orange-600">
                      Success Story
                    </span>
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
              className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md dark:hover:border-orange-800"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-xl transition group-hover:bg-orange-50 dark:group-hover:bg-orange-950/40">
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

              <span className="text-lg text-slate-300 transition group-hover:text-orange-500 dark:text-slate-600">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* WHATSAPP / COMMUNITY CTA */}
      <section className="rounded-[28px] bg-gradient-to-r from-orange-600 to-red-600 px-6 py-8 text-white shadow-lg sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-100">
              Join the Pinnacle Family
            </p>

            <h2 className="mt-2 text-xl font-black sm:text-2xl">
              Don't prepare alone. 🚀
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-orange-50">
              Get updates, study motivation, announcements and connect with
              other students in our community.
            </p>
          </div>

          <Link
            href="/community"
            className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-orange-600 shadow-md transition hover:bg-orange-50"
          >
            Join Community →
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
