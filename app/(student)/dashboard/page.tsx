import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';

const QUICK_ACTIONS = [
  {
    href: '/practice',
    icon: '📚',
    title: 'Practice',
    description: 'Sharpen your skills with practice questions.',
  },
  {
    href: '/mock',
    icon: '📝',
    title: 'Mock Exam',
    description: 'Test yourself with a full mock examination.',
  },
  {
    href: '/cbt',
    icon: '💻',
    title: 'CBT',
    description: 'Experience a timed computer-based test.',
  },
  {
    href: '/challenge',
    icon: '🔥',
    title: 'Challenge',
    description: 'Compete and test your speed against others.',
  },
];

const EXPLORE = [
  {
    href: '/millionaire',
    icon: '💰',
    title: 'Millionaire',
    description: 'Answer questions and climb the prize ladder.',
  },
  {
    href: '/leaderboard',
    icon: '🏆',
    title: 'Leaderboard',
    description: 'See how you rank among other students.',
  },
  {
    href: '/community',
    icon: '👥',
    title: 'Community',
    description: 'Connect with the Pinnacle Tutors community.',
  },
  {
    href: '/results',
    icon: '📊',
    title: 'My Results',
    description: 'Review your previous exam performance.',
  },
];

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-emerald-600 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold text-emerald-100">
            PINNACLE TUTORS ACADEMY
          </p>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Welcome back, {firstName}! 👋
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
            Ready to take your preparation to the next level? Practice,
            challenge yourself and keep improving every day.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            >
              Start Practicing →
            </Link>

            <Link
              href="/results"
              className="rounded-xl border border-emerald-400 bg-emerald-500/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
            >
              View Results
            </Link>
          </div>
        </div>

        {/* Decorative shapes */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-20 h-64 w-64 rounded-full bg-white/5" />
      </section>

      {/* Exam Target */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Exam Target
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              {profile?.exam_target || 'Not set yet'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Stay consistent and keep working toward your goal.
            </p>
          </div>

          <Link
            href="/profile"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            Update Profile
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-900">
            Start Learning
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose how you want to prepare today.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl transition group-hover:scale-110">
                {item.icon}
              </div>

              <h3 className="font-black text-slate-900">{item.title}</h3>

              <p className="mt-2 text-sm leading-5 text-slate-500">
                {item.description}
              </p>

              <p className="mt-4 text-sm font-bold text-emerald-600">
                Open →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Explore */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-900">
            Explore Pinnacle
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            More ways to learn, compete and track your progress.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {EXPLORE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-xl">
                  {item.icon}
                </div>

                <span className="text-slate-300 transition group-hover:text-emerald-500">
                  →
                </span>
              </div>

              <h3 className="mt-4 font-black text-slate-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-5 text-slate-500">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Motivation */}
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <div className="text-3xl">🎯</div>

        <h2 className="mt-3 text-lg font-black text-slate-900">
          Small practice sessions create big results.
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Keep practicing consistently, review your mistakes and challenge
          yourself to improve your score every time.
        </p>
      </section>
    </div>
  );
      }
