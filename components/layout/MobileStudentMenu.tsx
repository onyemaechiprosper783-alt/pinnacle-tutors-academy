'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { useTheme } from '@/components/ThemeProvider';

type MobileMenuContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <MobileMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

function useMobileMenuContext() {
  const ctx = useContext(MobileMenuContext);

  if (!ctx) {
    throw new Error(
      'MobileStudentMenu components must be rendered inside <MobileMenuProvider>.'
    );
  }

  return ctx;
}

export function MobileMenuTrigger() {
  const { setOpen } = useMobileMenuContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open student menu"
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-xl text-[var(--foreground)] shadow-sm active:scale-95"
    >
      ☰
    </button>
  );
}

export function MobileMenuBottomButton() {
  const { open, setOpen } = useMobileMenuContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open student menu"
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 transition ${
        open ? 'text-orange-600' : 'text-[var(--muted)]'
      }`}
    >
      <span className="text-lg">☰</span>
      <span className="truncate text-[10px] font-semibold">Menu</span>
    </button>
  );
}

const MENU_GROUPS = [
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

type StudentKey = {
  access_type: 'product_key' | 'activation_key';
  key_code: string;
  granted_at: string;
  expires_at: string | null;
};

export function MobileStudentMenu({
  firstName,
  fullName,
}: {
  firstName: string;
  fullName: string;
}) {
  const { open, setOpen } = useMobileMenuContext();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [productKeyOpen, setProductKeyOpen] = useState(false);
  const [activationKeyOpen, setActivationKeyOpen] = useState(false);

  const [productKey, setProductKey] = useState<StudentKey | null>(null);
  const [activationKey, setActivationKey] =
    useState<StudentKey | null>(null);

  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadKeys() {
      setLoadingKeys(true);
      setKeyError('');

      try {
        const response = await fetch('/api/student/access-keys', {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setKeyError(
              result.error || 'Could not load your access keys.'
            );
          }
          return;
        }

        if (cancelled) return;

        const keys: StudentKey[] = Array.isArray(result.keys)
          ? result.keys
          : [];

        const now = Date.now();

        const activeProductKey =
          keys.find(
            (key) =>
              key.access_type === 'product_key' &&
              key.expires_at &&
              new Date(key.expires_at).getTime() > now
          ) ?? null;

        const activeActivationKey =
          keys.find(
            (key) => key.access_type === 'activation_key'
          ) ?? null;

        setProductKey(activeProductKey);
        setActivationKey(activeActivationKey);
      } catch (error) {
        console.error('Could not load student access keys:', error);

        if (!cancelled) {
          setKeyError('Could not load your access keys.');
        }
      } finally {
        if (!cancelled) {
          setLoadingKeys(false);
        }
      }
    }

    loadKeys();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  function toggleProductKey() {
    setProductKeyOpen((value) => !value);
    setActivationKeyOpen(false);
  }

  function toggleActivationKey() {
    setActivationKeyOpen((value) => !value);
    setProductKeyOpen(false);
  }

  function formatExpiry(date: string | null) {
    if (!date) return 'No expiry';

    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={closeMenu}
        className="absolute inset-0 h-full w-full bg-slate-950/50"
      />

      <aside className="absolute inset-y-0 left-0 flex h-full w-[92%] max-w-sm flex-col bg-[var(--background)] shadow-xl">
        {/* HEADER */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <img
                src="/pinnacle-logo.png"
                alt="Pinnacle Tutors Academy"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-lg font-black text-[var(--foreground)]">
                Pinnacle Tutors
              </p>

              <p className="text-xs font-semibold text-orange-600">
                Student Menu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--background)] text-2xl font-medium text-[var(--foreground)] active:scale-95"
          >
            ×
          </button>
        </header>

        {/* STUDENT PROFILE */}
        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--card)] px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--background)] p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-black text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
              {firstName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black text-[var(--foreground)]">
                {fullName}
              </p>

              <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">
                Student
              </p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE NAV */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {MENU_GROUPS.map((group) => (
            <section key={group.title} className="mb-7">
              <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-[var(--muted)]">
                {group.title}
              </h2>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-[56px] items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-base font-bold text-[var(--foreground)] shadow-sm transition active:scale-[0.99] active:bg-orange-50 dark:active:bg-orange-950/30"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-xl">
                      {item.icon}
                    </span>

                    <span className="flex-1">{item.label}</span>

                    <span className="text-lg text-[var(--muted)]">
                      →
                    </span>
                  </Link>
                ))}

                {/* ACCESS KEYS */}
                {group.title === 'Account' && (
                  <>
                    {/* PRODUCT KEY */}
                    <button
                      type="button"
                      onClick={toggleProductKey}
                      className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-left text-base font-bold text-[var(--foreground)] shadow-sm active:bg-orange-50 dark:active:bg-orange-950/30"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl dark:bg-orange-950/40">
                        🔑
                      </span>

                      <span className="flex-1">Product Key</span>

                      <span
                        className={`text-lg text-[var(--muted)] transition ${
                          productKeyOpen ? 'rotate-90' : ''
                        }`}
                      >
                        →
                      </span>
                    </button>

                    {productKeyOpen && (
                      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
                        {loadingKeys ? (
                          <p className="text-sm font-semibold text-[var(--muted)]">
                            Checking Product Key...
                          </p>
                        ) : keyError ? (
                          <p className="text-sm font-semibold text-red-600">
                            {keyError}
                          </p>
                        ) : productKey ? (
                          <>
                            <p className="text-xs font-black uppercase tracking-wider text-orange-700 dark:text-orange-300">
                              Your Product Key
                            </p>

                            <div className="mt-2 rounded-xl border border-orange-200 bg-white p-3 dark:border-orange-900 dark:bg-slate-900">
                              <p className="break-all font-mono text-sm font-black tracking-wide text-slate-900 dark:text-white">
                                {productKey.key_code}
                              </p>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-orange-700 dark:text-orange-300">
                              Valid until:{' '}
                              {formatExpiry(productKey.expires_at)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-[var(--muted)]">
                            No Product Key assigned.
                          </p>
                        )}
                      </div>
                    )}

                    {/* ACTIVATION KEY */}
                    <button
                      type="button"
                      onClick={toggleActivationKey}
                      className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-left text-base font-bold text-[var(--foreground)] shadow-sm active:bg-red-50 dark:active:bg-red-950/30"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xl dark:bg-red-950/40">
                        🔐
                      </span>

                      <span className="flex-1">Activation Key</span>

                      <span
                        className={`text-lg text-[var(--muted)] transition ${
                          activationKeyOpen ? 'rotate-90' : ''
                        }`}
                      >
                        →
                      </span>
                    </button>

                    {activationKeyOpen && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                        {loadingKeys ? (
                          <p className="text-sm font-semibold text-[var(--muted)]">
                            Checking Activation Key...
                          </p>
                        ) : keyError ? (
                          <p className="text-sm font-semibold text-red-600">
                            {keyError}
                          </p>
                        ) : activationKey ? (
                          <>
                            <p className="text-xs font-black uppercase tracking-wider text-red-700 dark:text-red-300">
                              Your Activation Key
                            </p>

                            <div className="mt-2 rounded-xl border border-red-200 bg-white p-3 dark:border-red-900 dark:bg-slate-900">
                              <p className="break-all font-mono text-sm font-black tracking-wide text-slate-900 dark:text-white">
                                {activationKey.key_code}
                              </p>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">
                              Permanent access — no expiry
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-[var(--muted)]">
                              No Activation Key assigned.
                            </p>

                            <a
                              href="https://wa.me/2347051101464?text=Hello%20Pinnacle%20Tutors%2C%20I%20want%20to%20request%20an%20Activation%20Key."
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white active:bg-red-700"
                            >
                              Request Activation Key →
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          ))}

          {/* APPEARANCE */}
          <section className="mb-7">
            <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-[var(--muted)]">
              Appearance
            </h2>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl dark:bg-orange-950/40">
                  🎨
                </span>

                <div>
                  <p className="text-base font-black text-[var(--foreground)]">
                    Theme
                  </p>

                  <p className="text-xs font-medium text-[var(--muted)]">
                    Choose how Pinnacle Tutors looks
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`rounded-xl px-2 py-3 text-center text-xs font-bold transition ${
                    theme === 'light'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-[var(--background)] text-[var(--muted)] active:bg-orange-50 dark:active:bg-orange-950/30'
                  }`}
                >
                  <span className="block text-lg">☀️</span>
                  <span className="mt-1 block">Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`rounded-xl px-2 py-3 text-center text-xs font-bold transition ${
                    theme === 'dark'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-[var(--background)] text-[var(--muted)] active:bg-slate-200'
                  }`}
                >
                  <span className="block text-lg">🌙</span>
                  <span className="mt-1 block">Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`rounded-xl px-2 py-3 text-center text-xs font-bold transition ${
                    theme === 'system'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-[var(--background)] text-[var(--muted)] active:bg-red-50 dark:active:bg-red-950/30'
                  }`}
                >
                  <span className="block text-lg">⚙️</span>
                  <span className="mt-1 block">System</span>
                </button>
              </div>
            </div>
          </section>

          {/* COMMUNITY CTA */}
          <div className="mb-6 rounded-2xl bg-orange-50 p-5 dark:bg-orange-950/30">
            <p className="text-base font-black text-orange-950 dark:text-orange-100">
              Join the Pinnacle Family 🚀
            </p>

            <p className="mt-1 text-sm leading-6 text-orange-800 dark:text-orange-200">
              Get announcements, motivation and study updates.
            </p>

            <Link
              href="/community"
              onClick={closeMenu}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white active:bg-orange-700"
            >
              Join Community →
            </Link>
          </div>
        </div>

        {/* LOGOUT */}
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--card)] p-4">
          <LogoutButton
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-[var(--muted)] active:bg-red-50 active:text-red-600 dark:active:bg-red-950/30"
          />
        </div>
      </aside>
    </div>,
    document.body
  );
}
