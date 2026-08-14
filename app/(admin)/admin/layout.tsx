import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/layout/LogoutButton';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/class-notes', label: 'Class Notes' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/admin/questions/bulk-import', label: 'Bulk Import' },
  { href: '/admin/subjects', label: 'Subjects' },
  { href: '/admin/topics', label: 'Topics' },
  { href: '/admin/exams', label: 'Exams' },
  { href: '/admin/challenge', label: 'UTME Challenge' },
  { href: '/admin/millionaire', label: 'Millionaire' },
  { href: '/admin/results', label: 'Results' },
  { href: '/admin/leaderboard', label: 'Leaderboard' },
  { href: '/admin/testimonials', label: 'Testimonials' },
  { href: '/admin/community', label: 'Community' },
  { href: '/admin/announcements', label: 'Announcements' },
  { href: '/admin/contact', label: 'Contact Messages' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already blocks non-admins from reaching here; this second
  // check just prevents a flash of admin UI if middleware is ever bypassed
  // in a future refactor — defense in depth, not the primary guard.
  const profile = await getCurrentProfile();

  if (
    !profile ||
    (profile.role !== 'admin' && profile.role !== 'super_admin')
  ) {
    redirect('/dashboard?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-900 p-4 md:h-screen md:w-60 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="mb-6 text-lg font-bold text-white">
          Pinnacle Admin
        </div>

        <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-700 pt-4">
          <p className="text-sm font-medium text-white">
            {profile.full_name}
          </p>

          <p className="text-xs uppercase tracking-wide text-emerald-400">
            {profile.role}
          </p>

          <LogoutButton className="mt-2 text-sm text-slate-400 hover:text-red-400" />
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
