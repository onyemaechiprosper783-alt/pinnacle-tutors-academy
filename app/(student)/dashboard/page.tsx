import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';

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
    href: '/profile',
    icon: '👤',
    title: 'Profile',
    description: 'Manage your account',
  },
];

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const examTarget = profile?.exam_target || 'JAMB / WAEC';

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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              🎯
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Exam Target
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                {examTarget}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
              ⚡
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Goal
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                Keep learning
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* MAIN LEARNING */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-900">
            Start Learning
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose an activity and start improving your score.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-50 text-2xl transition group-hover:scale-110">
                  {item.icon}
                </div>

                <span className="text-xl text-slate-300 transition group-hover:text-emerald-500">
                  →
                </span>
              </div>

              <h3 className="mt-5 font-black text-slate-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-5 text-slate-500">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIAL PLACEHOLDER */}
      <section className="overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl">
              ⭐
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Pinnacle Success Story
              </p>

              <p className="mt-2 text-base font-bold leading-6 text-slate-800">
                “Your success story could be next.”
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Prepare consistently with Pinnacle Tutors Academy.
              </p>
            </div>
          </div>

          <Link
            href="/community"
            className="shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Join Our Community
          </Link>

        </div>
      </section>

      {/* MORE FEATURES */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-900">
            Explore Pinnacle
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Everything you need in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_FEATURES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl transition group-hover:bg-emerald-50">
                {item.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {item.description}
                </p>
              </div>

              <span className="text-lg text-slate-300 transition group-hover:text-emerald-500">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="rounded-2xl bg-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
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
        <p className="text-sm font-semibold text-slate-400">
          🎓 Practice today. Improve tomorrow. Succeed with Pinnacle.
        </p>
      </section>

    </div>
  );
}
