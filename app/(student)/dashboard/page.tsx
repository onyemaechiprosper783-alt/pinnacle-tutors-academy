import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';

const QUICK_ACTIONS = [
  {
    href: '/practice',
    icon: '📚',
    title: 'Practice',
    description: 'Practice questions and improve your weak areas.',
    style: 'bg-blue-50 text-blue-700',
  },
  {
    href: '/mock',
    icon: '📝',
    title: 'Mock Exam',
    description: 'Take a realistic full-length examination.',
    style: 'bg-indigo-50 text-indigo-700',
  },
  {
    href: '/cbt',
    icon: '💻',
    title: 'CBT',
    description: 'Experience a timed computer-based test.',
    style: 'bg-violet-50 text-violet-700',
  },
  {
    href: '/challenge',
    icon: '🔥',
    title: 'UTME Challenge',
    description: 'Challenge yourself and climb the rankings.',
    style: 'bg-orange-50 text-orange-700',
  },
];

const MORE_FEATURES = [
  {
    href: '/leaderboard',
    icon: '🏆',
    title: 'Leaderboard',
    description: 'See how you rank against other students.',
  },
  {
    href: '/millionaire',
    icon: '💰',
    title: 'Millionaire',
    description: 'Test your knowledge and play to win.',
  },
  {
    href: '/community',
    icon: '👥',
    title: 'Community',
    description: 'Connect and learn with other students.',
  },
  {
    href: '/results',
    icon: '📊',
    title: 'Results',
    description: 'Review your performance and progress.',
  },
];

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student';
  const examTarget = profile?.exam_target ?? 'Not set';

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Welcome */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-5 py-10 text-white sm:px-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 left-20 h-64 w-64 rounded-full bg-indigo-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-blue-100">
                Welcome back 👋
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                {firstName}
              </h1>

              <p className="mt-2 text-sm text-blue-100 sm:text-base">
                Keep learning, keep practicing, and reach your pinnacle.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium text-blue-100">
                Preparing for
              </p>
              <p className="mt-1 font-bold">{examTarget}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Quick actions */}
        <div className="mb-8">
          <div className="mb-5">
            <h2 className="text-2xl font-black text-slate-900">
              What do you want to do?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Jump straight into your preparation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${action.style} transition group-hover:scale-110`}
                >
                  {action.icon}
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {action.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {action.description}
                </p>

                <p className="mt-4 text-sm font-bold text-blue-600">
                  Open →
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* More features */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-black text-slate-900">
              Your Pinnacle Hub
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Explore more ways to learn, compete and track your progress.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MORE_FEATURES.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl transition group-hover:scale-110">
                  {feature.icon}
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Motivation */}
        <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-7 text-white sm:p-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
                Keep going
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Every question brings you closer.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Stay consistent with your preparation. Practice today,
                understand your mistakes, and come back stronger tomorrow.
              </p>
            </div>

            <Link
              href="/practice"
              className="shrink-0 rounded-2xl bg-blue-600 px-6 py-3.5 text-center font-bold text-white transition hover:bg-blue-500"
            >
              Start Practicing →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
            }
