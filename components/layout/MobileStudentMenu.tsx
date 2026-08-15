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

/* ------------------------------------------------------------------ */
/* SHARED OPEN/CLOSE STATE                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* TOP-RIGHT MENU TRIGGER                                              */
/* ------------------------------------------------------------------ */

export function MobileMenuTrigger() {
  const { setOpen } = useMobileMenuContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open student menu"
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm active:scale-95"
    >
      ☰
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* BOTTOM NAV MENU BUTTON                                              */
/* ------------------------------------------------------------------ */

export function MobileMenuBottomButton() {
  const { open, setOpen } = useMobileMenuContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open student menu"
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 transition ${
        open ? 'text-emerald-600' : 'text-slate-500'
      }`}
    >
      <span className="text-lg">☰</span>
      <span className="truncate text-[10px] font-semibold">Menu</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* NAV CONFIG                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* ACCESS TYPES                                                        */
/* ------------------------------------------------------------------ */

type StudentKey = {
  access_type: 'product_key' | 'activation_key';
  key_code: string;
  expires_at: string | null;
};

/* ------------------------------------------------------------------ */
/* THE DRAWER                                                         */
/* ------------------------------------------------------------------ */

export function MobileStudentMenu({
  firstName,
  fullName,
}: {
  firstName: string;
  fullName: string;
}) {
  const { open, setOpen } = useMobileMenuContext();

  const [mounted, setMounted] = useState(false);
  const [productKeyOpen, setProductKeyOpen] = useState(false);
  const [activationKeyOpen, setActivationKeyOpen] = useState(false);

  const [productKey, setProductKey] = useState<StudentKey | null>(null);
  const [activationKey, setActivationKey] = useState<StudentKey | null>(null);

  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  /* -------------------------------------------------------------- */
  /* LOAD THE CURRENT STUDENT'S KEYS                                */
  /* -------------------------------------------------------------- */

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
            setKeyError(result.error || 'Could not load your access keys.');
          }
          return;
        }

        if (cancelled) return;

        setProductKey(result.product_key ?? null);
        setActivationKey(result.activation_key ?? null);
      } catch {
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

  /* -------------------------------------------------------------- */
  /* LOCK BACKGROUND SCROLL                                          */
  /* -------------------------------------------------------------- */

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
      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={closeMenu}
        className="absolute inset-0 h-full w-full bg-slate-950/50"
      />

      {/* DRAWER */}
      <aside className="absolute inset-y-0 left-0 flex h-full w-[92%] max-w-sm flex-col bg-slate-50 shadow-xl">
        {/* HEADER */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white shadow-sm">
              P
            </div>

            <div>
              <p className="text-lg font-black text-slate-900">
                Pinnacle Tutors
              </p>

              <p className="text-xs font-semibold text-emerald-600">
                Student Menu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-2xl font-medium text-slate-700 active:scale-95"
          >
            ×
          </button>
        </header>

        {/* STUDENT PROFILE */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
              {firstName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black text-slate-900">
                {fullName}
              </p>

              <p className="mt-0.5 text-xs font-medium text-slate-400">
                Student
              </p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE NAV */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {MENU_GROUPS.map((group) => (
            <section key={group.title} className="mb-7">
              <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-slate-400">
                {group.title}
              </h2>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-[56px] items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-base font-bold text-slate-700 shadow-sm transition active:scale-[0.99] active:bg-emerald-50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl">
                      {item.icon}
                    </span>

                    <span className="flex-1">{item.label}</span>

                    <span className="text-lg text-slate-300">
                      →
                    </span>
                  </Link>
                ))}

                {/* PRODUCT KEY */}
                {group.title === 'Account' && (
                  <>
                    <button
                      type="button"
                      onClick={toggleProductKey}
                      className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-left text-base font-bold text-slate-700 shadow-sm active:bg-emerald-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                        🔑
                      </span>

                      <span className="flex-1">Product Key</span>

                      <span
                        className={`text-lg text-slate-300 transition ${
                          productKeyOpen ? 'rotate-90' : ''
                        }`}
                      >
                        →
                      </span>
                    </button>

                    {productKeyOpen && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        {loadingKeys ? (
                          <p className="text-sm font-semibold text-slate-500">
                            Checking Product Key...
                          </p>
                        ) : productKey ? (
                          <>
                            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                              Your Product Key
                            </p>

                            <div className="mt-2 rounded-xl border border-emerald-200 bg-white p-3">
                              <p className="break-all font-mono text-sm font-black tracking-wide text-slate-900">
                                {productKey.key_code}
                              </p>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-emerald-700">
                              Valid until:{' '}
                              {formatExpiry(productKey.expires_at)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-slate-600">
                            No Product Key assigned.
                          </p>
                        )}
                      </div>
                    )}

                    {/* ACTIVATION KEY */}
                    <button
                      type="button"
                      onClick={toggleActivationKey}
                      className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-left text-base font-bold text-slate-700 shadow-sm active:bg-purple-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl">
                        🔐
                      </span>

                      <span className="flex-1">Activation Key</span>

                      <span
                        className={`text-lg text-slate-300 transition ${
                          activationKeyOpen ? 'rotate-90' : ''
                        }`}
                      >
                        →
                      </span>
                    </button>

                    {activationKeyOpen && (
                      <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                        {loadingKeys ? (
                          <p className="text-sm font-semibold text-slate-500">
                            Checking Activation Key...
                          </p>
                        ) : activationKey ? (
                          <>
                            <p className="text-xs font-black uppercase tracking-wider text-purple-700">
                              Your Activation Key
                            </p>

                            <div className="mt-2 rounded-xl border border-purple-200 bg-white p-3">
                              <p className="break-all font-mono text-sm font-black tracking-wide text-slate-900">
                                {activationKey.key_code}
                              </p>
                            </div>

                            <p className="mt-2 text-xs font-semibold text-purple-700">
                              Permanent access — no expiry
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-600">
                              No Activation Key assigned.
                            </p>

                            <a
                              href="https://wa.me/2347051101464?text=Hello%20Pinnacle%20Tutors%2C%20I%20want%20to%20request%20an%20Activation%20Key."
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-purple-600 px-4 py-3 text-sm font-black text-white active:bg-purple-700"
                            >
                              Request Activation Key →
                            </a>
                          </>
                        )}
                      </div>
                    )}

                    {keyError && (
                      <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-600">
                        {keyError}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          ))}

          {/* COMMUNITY CTA */}
          <div className="mb-6 rounded-2xl bg-emerald-50 p-5">
            <p className="text-base font-black text-emerald-900">
              Join the Pinnacle Family 🚀
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-700">
              Get announcements, motivation and study updates.
            </p>

            <Link
              href="/community"
              onClick={closeMenu}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white active:bg-emerald-700"
            >
              Join Community →
            </Link>
          </div>
        </div>

        {/* LOGOUT */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-4">
          <LogoutButton className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-500 active:bg-red-50 active:text-red-600" />
        </div>
      </aside>
    </div>,
    document.body
  );
}
