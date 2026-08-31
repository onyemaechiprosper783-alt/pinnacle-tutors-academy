import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/layout/LogoutButton';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/students', label: 'Students', icon: '👥' },
  { href: '/admin/access-keys', label: 'Access Keys', icon: '🔐' },
  { href: '/admin/class-notes', label: 'Class Notes', icon: '📚' },
  { href: '/admin/questions', label: 'Questions', icon: '❓' },
  { href: '/admin/questions/bulk-import', label: 'Bulk Import', icon: '⬆️' },
  { href: '/admin/subjects', label: 'Subjects', icon: '📖' },
  { href: '/admin/topics', label: 'Topics', icon: '🧩' },
  { href: '/admin/exams', label: 'Exams', icon: '📝' },
  { href: '/admin/challenge', label: 'UTME Challenge', icon: '🔥' },
  { href: '/admin/millionaire', label: 'Millionaire', icon: '💰' },
  { href: '/admin/results', label: 'Results', icon: '🏆' },
  { href: '/admin/testimonials', label: 'Testimonials', icon: '⭐' },
  { href: '/admin/community', label: 'Community', icon: '💬' },
  { href: '/admin/announcements', label: 'Announcements', icon: '📢' },
  { href: '/admin/contact', label: 'Contact Messages', icon: '✉️' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) redirect('/dashboard?error=unauthorized');

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:flex">
      <aside className="w-full shrink-0 border-b border-[var(--border)] bg-gradient-to-b from-slate-950 via-slate-900 to-brand-950 p-4 shadow-xl md:sticky md:top-0 md:h-screen md:w-72 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-lg">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 p-1.5"><img src="/icon-192.png" alt="Pinnacle Tutors Academy" className="h-full w-full rounded-lg object-contain" /></div>
          <div><p className="text-sm font-black text-white">Pinnacle Tutors</p><p className="text-xs font-semibold text-accent-300">ADMIN CENTER</p></div>
        </div>
        <div className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Management</div>
        <nav className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
          {NAV.map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-white/10 hover:bg-white/10 hover:text-white"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm transition group-hover:bg-accent-400/15">{item.icon}</span><span>{item.label}</span></Link>)}
        </nav>
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="rounded-2xl bg-white/5 p-3"><p className="truncate text-sm font-black text-white">{profile.full_name}</p><p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">{profile.role}</p><LogoutButton className="mt-3 rounded-lg text-xs font-bold text-slate-400 transition hover:text-red-400" /></div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
