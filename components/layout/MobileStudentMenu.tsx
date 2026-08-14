'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/layout/LogoutButton';

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

export function MobileStudentMenu({
  firstName,
  fullName,
}: {
  firstName: string;
  fullName: string;
}) {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      {/* MENU BUTTON */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open student menu"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm active:scale-95"
      >
        ☰
      </button>

      {/* FULL SCREEN MOBILE MENU */}
      {open && (
        <div className="fixed inset-0 z-[99999] md:hidden">

          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full bg-slate-950/50"
          />

          {/* FULL MENU PANEL */}
          <aside className="absolute inset-0 flex h-full w-full flex-col bg-slate-50">

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

            {/* MENU CONTENT */}
            <div className="flex-1 overflow-y-auto px-5 py-5">

              {MENU_GROUPS.map((group) => (
                <section
                  key={group.title}
                  className="mb-7"
                >

                  <h2 className="mb-3 px-1 text-xs font-black uppercase tracking-widest text-slate-400">
                    {group.title}
                  </h2>

                  <div className="space-y-2">

                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className="flex min-h-[58px] items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-base font-bold text-slate-700 shadow-sm transition active:scale-[0.99] active:bg-emerald-50"
                      >

                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl">
                          {item.icon}
                        </span>

                        <span className="flex-1">
                          {item.label}
                        </span>

                        <span className="text-lg text-slate-300">
                          →
                        </span>

                      </Link>
                    ))}

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

              <LogoutButton
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-500 active:bg-red-50 active:text-red-600"
              />

            </div>

          </aside>
        </div>
      )}
    </>
  );
}
