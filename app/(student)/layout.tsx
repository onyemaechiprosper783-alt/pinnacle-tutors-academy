import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { MobileStudentMenu } from '@/components/layout/MobileStudentMenu';

const NAV_GROUPS = [
  {
    title: 'Home & Learning',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
      { href: '/practice', label: 'Practice', icon: '📚' },
      { href: '/mock', label: 'Mock Exam', icon: '📝' },
      { href: '/cbt', label: 'CBT', icon: '💻' },
      { href: '/challenge', label: 'UTME Challenge', icon: '🔥' },
      { href: '/millionaire', label: 'Millionaire', icon: '💰' },
    ],
  },
  {
    title: 'Progress & Community',
    items: [
      { href: '/results', label: 'My Results', icon: '📊' },
      { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
      { href: '/bookmarks', label: 'Bookmarks', icon: '🔖' },
      { href: '/community', label: 'Community', icon: '👥' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/profile', label: 'Profile', icon: '👤' },
      { href: '/settings', label: 'Settings', icon: '⚙️' },
      { href: '/product-key', label: 'Product Key', icon: '🔑' },
      { href: '/activation-key', label: 'Activation Key', icon: '🔐' },
    ],
  },
  {
    title: 'Information',
    items: [
      { href: '/career', label: 'Career & Institution', icon: '🎓' },
      { href: '/announcements', label: 'Announcements', icon: '📢' },
      { href: '/feedback', label: 'Feedback', icon: '💬' },
      { href: '/about', label: 'About Pinnacle Tutors', icon: 'ℹ️' },
      { href: '/help', label: 'Help & Contact', icon: '❓' },
    ],
  },
];

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/practice', label: 'Practice', icon: '📚' },
  { href: '/cbt', label: 'CBT', icon: '💻' },
  { href: '/results', label: 'Results', icon: '📊' },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  const firstName =
    profile.full_name?.split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:flex md:pb-0">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-100 px-5 py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white shadow-sm">
              P
            </div>

            <div>
              <p className="text-base font-black text-slate-900">
                Pinnacle Tutors
              </p>

              <p className="text-xs font-medium text-emerald-600">
                Learn • Practice • Succeed
              </p>
            </div>
          </Link>
        </div>

        {/* DESKTOP NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div
              key={group.title}
              className="mb-6"
            >
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-base transition group-hover:bg-white">
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* COMMUNITY CTA */}
          <div className="mt-2 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-900">
              Join the Pinnacle Family 🚀
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Get announcements, motivation and study updates.
            </p>

            <Link
              href="/community"
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700"
            >
              Join Community →
            </Link>
          </div>
        </nav>

        {/* DESKTOP USER */}
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              {firstName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">
                {profile.full_name}
              </p>

              <p className="text-xs text-slate-400">
                Student
              </p>
            </div>
          </div>

          <LogoutButton
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="min-w-0 flex-1">
        {/* MOBILE HEADER */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-sm">
              P
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">
                Pinnacle Tutors
              </p>

              <p className="text-[10px] font-medium text-emerald-600">
                Academy
              </p>
            </div>
          </Link>

          {/* MOBILE MENU */}
          <MobileStudentMenu
            firstName={firstName}
            fullName={profile.full_name || 'Student'}
          />
        </header>

        {/* PAGE CONTENT */}
        <main className="min-h-[calc(100vh-64px)] p-4 sm:p-6 md:p-8">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-1 pb-safe backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg justify-around">
            {MOBILE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-slate-500 transition hover:text-emerald-600"
              >
                <span className="text-lg">
                  {item.icon}
                </span>

                <span className="truncate text-[10px] font-semibold">
                  {item.label}
                </span>
              </Link>
            ))}

            {/* Menu is opened from the top-right button */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-slate-400">
              <span className="text-lg">☰</span>

              <span className="truncate text-[10px] font-semibold">
                Menu
              </span>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
