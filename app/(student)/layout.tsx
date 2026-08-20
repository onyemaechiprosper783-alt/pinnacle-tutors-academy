import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { MobileMenuProvider, MobileMenuTrigger, MobileStudentMenu } from '@/components/layout/MobileStudentMenu';
import ThemeProvider from '@/components/ThemeProvider';
import AnnouncementBell from '@/components/AnnouncementBell';
import AITutorSideButton from '@/components/ai-tutor/AITutorSideButton';
import NotificationPrompt from '@/components/notifications/NotificationPrompt';
import StudentBackButton from '@/components/layout/StudentBackButton';

const NAV_GROUPS = [
  { title: 'Home & Learning', items: [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' }, { href: '/practice', label: 'Practice', icon: '📚' }, { href: '/mock', label: 'Mock Exam', icon: '📝' }, { href: '/cbt', label: 'CBT', icon: '💻' }, { href: '/challenge', label: 'UTME Challenge', icon: '🔥' }, { href: '/millionaire', label: 'Millionaire', icon: '💰' },
  ] },
  { title: 'Progress & Community', items: [
    { href: '/progress', label: 'Progress', icon: '📈' }, { href: '/results', label: 'My Results', icon: '📊' }, { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' }, { href: '/bookmarks', label: 'Bookmarks', icon: '🔖' }, { href: '/community', label: 'Community', icon: '👥' },
  ] },
  { title: 'Account', items: [
    { href: '/profile', label: 'Profile', icon: '👤' }, { href: '/settings', label: 'Settings', icon: '⚙️' }, { href: '/product-key', label: 'Product Key', icon: '🔑' }, { href: '/activation-key', label: 'Activation Key', icon: '🔐' },
  ] },
  { title: 'Information', items: [
    { href: '/career', label: 'Career & Institution', icon: '🎓' }, { href: '/announcements', label: 'Announcements', icon: '📢' }, { href: '/feedback', label: 'Feedback', icon: '💬' }, { href: '/about', label: 'About Pinnacle Tutors', icon: 'ℹ️' }, { href: '/help', label: 'Help & Contact', icon: '❓' },
  ] },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  const firstName = profile.full_name?.split(' ')[0] || 'Student';

  return (
    <ThemeProvider>
      <MobileMenuProvider>
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200 md:flex">
          <aside className="hidden w-72 shrink-0 border-r border-[var(--border)] bg-[var(--card)] shadow-[4px_0_24px_rgba(15,23,42,0.03)] transition-colors duration-200 dark:shadow-none md:flex md:flex-col">
            <div className="border-b border-[var(--border)] bg-gradient-to-r from-brand-50/70 to-accent-50/50 px-5 py-5 dark:from-brand-950/30 dark:to-accent-950/20">
              <Link href="/dashboard" className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5"><img src="/pinnacle-logo.png" alt="Pinnacle Tutors Academy" className="h-full w-full object-contain" /></div><div><p className="text-base font-black text-[var(--foreground)]">Pinnacle Tutors</p><p className="text-xs font-semibold text-brand-600 dark:text-brand-400">Learn • Practice • Succeed</p></div></Link>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-5">
              {NAV_GROUPS.map((group) => <div key={group.title} className="mb-6"><p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">{group.title}</p><div className="space-y-1">{group.items.map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-all hover:-translate-y-px hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--background)] text-base ring-1 ring-[var(--border)] transition group-hover:bg-white group-hover:ring-brand-100 dark:group-hover:bg-brand-950/50">{item.icon}</span><span>{item.label}</span></Link>)}</div></div>)}
              <div className="mt-2 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-accent-50 p-4 dark:border-brand-900/50 dark:from-brand-950/40 dark:to-accent-950/30"><p className="text-sm font-black text-brand-900 dark:text-brand-100">Join the Pinnacle Family 🚀</p><p className="mt-1 text-xs leading-5 text-brand-700 dark:text-brand-300">Get announcements, motivation and study updates.</p><Link href="/community" className="mt-3 flex w-full items-center justify-center rounded-xl bg-brand-600 px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-700">Join Community →</Link></div>
            </nav>
            <div className="border-t border-[var(--border)] p-4"><div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600 font-black text-white">{firstName.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--foreground)]">{profile.full_name}</p><p className="text-xs text-[var(--muted)]">Student</p></div></div><LogoutButton className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--muted)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400" /></div>
          </aside>
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/95 px-4 py-3 shadow-sm backdrop-blur-xl transition-colors duration-200 md:hidden"><Link href="/dashboard" className="flex items-center gap-2.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5"><img src="/pinnacle-logo.png" alt="Pinnacle Tutors Academy" className="h-full w-full object-contain" /></div><div><p className="text-sm font-black text-[var(--foreground)]">Pinnacle Tutors</p><p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">Academy</p></div></Link><div className="flex items-center gap-2"><AnnouncementBell /><MobileMenuTrigger /></div></header>
            <div className="hidden h-16 items-center justify-end border-b border-[var(--border)] bg-[var(--card)]/95 px-6 shadow-sm backdrop-blur-xl md:flex"><AnnouncementBell /></div>
            <main className="min-h-[calc(100vh-64px)] p-4 sm:p-6 md:p-8"><StudentBackButton />{children}</main>
          </div>
          <MobileStudentMenu firstName={firstName} fullName={profile.full_name || 'Student'} />
          <AITutorSideButton />
          <NotificationPrompt />
        </div>
      </MobileMenuProvider>
    </ThemeProvider>
  );
}
