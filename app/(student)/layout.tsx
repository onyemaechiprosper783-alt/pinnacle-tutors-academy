import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/layout/LogoutButton';

const NAV = [
  { href: '/dashboard', label: 'Home' },
  { href: '/practice', label: 'Practice' },
  { href: '/mock', label: 'Mock' },
  { href: '/cbt', label: 'CBT' },
  { href: '/challenge', label: 'Challenge' },
  { href: '/millionaire', label: 'Millionaire' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/community', label: 'Community' },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:flex md:pb-0">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="mb-6 text-lg font-bold text-emerald-700">Pinnacle Tutors</div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-800">{profile.full_name}</p>
          <LogoutButton className="mt-1 text-sm text-slate-400 hover:text-red-600" />
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="text-lg font-bold text-emerald-700">Pinnacle Tutors</span>
          <LogoutButton />
        </header>

        <main className="p-4 md:p-8">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-slate-200 bg-white py-2 md:hidden">
          {NAV.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 px-1 py-1 text-center text-[11px] font-medium text-slate-500"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
