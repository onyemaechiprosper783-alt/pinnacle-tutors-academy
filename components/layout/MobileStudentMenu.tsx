'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { useTheme } from '@/components/ThemeProvider';

type MobileMenuContextValue = { open: boolean; setOpen: (value: boolean) => void };
const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);
export function MobileMenuProvider({ children }: { children: ReactNode }) { const [open, setOpen] = useState(false); return <MobileMenuContext.Provider value={{ open, setOpen }}>{children}</MobileMenuContext.Provider>; }
function useMobileMenuContext() { const ctx = useContext(MobileMenuContext); if (!ctx) throw new Error('MobileStudentMenu components must be rendered inside <MobileMenuProvider>.'); return ctx; }
export function MobileMenuTrigger() { const { setOpen } = useMobileMenuContext(); return <button type="button" onClick={() => setOpen(true)} aria-label="Open student menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-xl text-[var(--foreground)] shadow-sm active:scale-95">☰</button>; }

const MENU_GROUPS = [
  { title: 'Home & Learning', items: [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' }, { href: '/practice', label: 'Practice', icon: '📚' }, { href: '/mock', label: 'Mock Exam', icon: '📝' }, { href: '/cbt', label: 'CBT', icon: '💻' }, { href: '/challenge', label: 'UTME Challenge', icon: '🔥' }, { href: '/millionaire', label: 'Millionaire', icon: '💰' },
  ] },
  { title: 'Progress & Community', items: [
    { href: '/progress', label: 'Progress', icon: '📈' }, { href: '/results', label: 'My Results', icon: '📊' }, { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' }, { href: '/bookmarks', label: 'Bookmarks', icon: '🔖' }, { href: '/community', label: 'Community', icon: '👥' },
  ] },
  { title: 'Account', items: [{ href: '/profile', label: 'Profile', icon: '👤' }, { href: '/settings', label: 'Settings', icon: '⚙️' }] },
  { title: 'Information', items: [{ href: '/career', label: 'Career & Institution', icon: '🎓' }, { href: '/announcements', label: 'Announcements', icon: '📢' }, { href: '/feedback', label: 'Feedback', icon: '💬' }, { href: '/about', label: 'About Pinnacle Tutors', icon: 'ℹ️' }, { href: '/help', label: 'Help & Contact', icon: '❓' }] },
];

type StudentKey = { access_type: 'product_key' | 'activation_key'; key_code: string; granted_at: string; expires_at: string | null };

export function MobileStudentMenu({ firstName }: { firstName: string; fullName: string }) {
  const { open, setOpen } = useMobileMenuContext(); const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false); const [productKeyOpen, setProductKeyOpen] = useState(false); const [activationKeyOpen, setActivationKeyOpen] = useState(false);
  const [productKey, setProductKey] = useState<StudentKey | null>(null); const [activationKey, setActivationKey] = useState<StudentKey | null>(null); const [loadingKeys, setLoadingKeys] = useState(false); const [keyError, setKeyError] = useState('');
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!open) return; let cancelled = false; async function loadKeys() { setLoadingKeys(true); setKeyError(''); try { const response = await fetch('/api/student/access-keys', { method: 'GET', cache: 'no-store' }); const result = await response.json(); if (!response.ok) { if (!cancelled) setKeyError(result.error || 'Could not load your access keys.'); return; } if (cancelled) return; const keys: StudentKey[] = Array.isArray(result.keys) ? result.keys : []; const now = Date.now(); setProductKey(keys.find((key) => key.access_type === 'product_key' && key.expires_at && new Date(key.expires_at).getTime() > now) ?? null); setActivationKey(keys.find((key) => key.access_type === 'activation_key') ?? null); } catch (error) { console.error('Could not load student access keys:', error); if (!cancelled) setKeyError('Could not load your access keys.'); } finally { if (!cancelled) setLoadingKeys(false); } } loadKeys(); return () => { cancelled = true; }; }, [open]);
  useEffect(() => { if (!open) return; const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previousOverflow; }; }, [open]);
  function closeMenu() { setOpen(false); }
  function toggleProductKey() { setProductKeyOpen((value) => !value); setActivationKeyOpen(false); }
  function toggleActivationKey() { setActivationKeyOpen((value) => !value); setProductKeyOpen(false); }
  function formatExpiry(date: string | null) { if (!date) return 'No expiry'; return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }); }
  async function shareApp() {
    const shareData = { title: 'Pinnacle Tutors Academy', text: 'Join me on Pinnacle Tutors Academy for practice, CBT exams and learning.', url: window.location.origin };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.origin);
      alert('App link copied. You can paste it anywhere to share.');
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(window.location.origin); alert('App link copied.'); } catch { alert(window.location.origin); }
    }
  }
  if (!mounted || !open) return null;
  return createPortal(<div className="fixed inset-0 z-[99999] md:hidden">
    <button type="button" onClick={closeMenu} aria-label="Close menu" className="absolute inset-0 bg-black/50" />
    <aside className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-[var(--card)] p-5 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-black">Menu</p><p className="text-xs text-[var(--muted)]">Hi, {firstName}</p></div><button type="button" onClick={closeMenu} className="h-10 w-10 rounded-xl bg-[var(--background)] text-xl">×</button></div>
      {MENU_GROUPS.map((group) => <div key={group.title} className="mb-6"><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{group.title}</p><div className="space-y-1">{group.items.map((item) => <Link key={item.href} href={item.href} onClick={closeMenu} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--background)]">{item.icon}</span><span>{item.label}</span></Link>)}</div></div>)}
      <div className="border-t border-[var(--border)] pt-5">
        <button type="button" onClick={shareApp} className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--background)]">📤 Share App</button>
        <button type="button" onClick={toggleProductKey} className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--background)]">🔑 Product Key</button>{productKeyOpen && <div className="px-3 pb-3 text-xs text-[var(--muted)]">{loadingKeys ? 'Loading…' : keyError || (productKey ? `${productKey.key_code} · Expires ${formatExpiry(productKey.expires_at)}` : 'No active product key.')}</div>}
        <button type="button" onClick={toggleActivationKey} className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--background)]">🔐 Activation Key</button>{activationKeyOpen && <div className="px-3 pb-3 text-xs text-[var(--muted)]">{loadingKeys ? 'Loading…' : keyError || (activationKey ? activationKey.key_code : 'No activation key.')}</div>}
        <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--background)]">{theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}</button><LogoutButton className="mt-2 w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" />
      </div>
    </aside>
  </div>, document.body);
}
