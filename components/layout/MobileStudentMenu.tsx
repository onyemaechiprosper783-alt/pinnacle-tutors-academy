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
      {/* TOP MENU BUTTON */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open student menu"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm active:scale-95"
      >
        ☰
      </button>

      {/* FULL MOBILE MENU */}
      {open && (
        <div className="fixed inset-0 z-[9999] md:hidden">

          {/* DARK BACKDROP */}
          <div
            className="absolute inset-0 bg-slate-950/50"
            onClick={closeMenu}
          />

          {/* SLIDE-IN MENU */}
          <aside className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-hidden bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white">
                  P
                </div>

                <div>
                  <p className="text-base font-black text-slate-900">
                    Pinnacle Tutors
                  </p>

                  <p className="text-xs font-medium text-emerald-600">
                    Student Menu
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close student menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl text-slate-600 active:scale-95"
              >
                ×
              </button>

            </div>

            {/* STUDENT INFORMATION */}
            <div className="shrink-0 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">
                  {firstName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {fullName}
                  </p>

                  <p className="text-xs font-medium text-slate-400">
                    Student
                  </p>
                </div>

              </div>
            </div>

            {/* MENU ITEMS */}
            <nav className="flex-1 overflow-y-auto px-4 py-5">

              {MENU_GROUPS.map((group) => (
                <div
                  key={group.title}
                  className="mb-6"
                >

                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {group.title}
                  </p>

                  <div className="space-y-1">

                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 active:bg-emerald-50"
                      >

                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-lg">
                          {item.icon}
                        </span>

                        <span>
                          {item.label}
                        </span>

                        <span className="ml-auto text-slate-300">
                          →
                        </span>

                      </Link>
                    ))}

                  </div>
                </div>
              ))}

              {/* COMMUNITY */}
              <div className="rounded-2xl bg-emerald-50 p-4">

                <p className="text-sm font-black text-emerald-900">
                  Join the Pinnacle Family 🚀
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Get announcements, motivation and study updates.
                </p>

                <Link
                  href="/community"
                  onClick={closeMenu}
                  className="mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-3 text-xs font-black text-white"
                >
                  Join Community →
                </Link>

              </div>

            </nav>

            {/* LOGOUT */}
            <div className="shrink-0 border-t border-slate-100 bg-white p-4">
              <LogoutButton
                className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-500 active:bg-red-50 active:text-red-600"
              />
            </div>

          </aside>
        </div>
      )}
    </>
  );
}
