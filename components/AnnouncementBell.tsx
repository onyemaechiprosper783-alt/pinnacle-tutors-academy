'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export default function AnnouncementBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    const supabase = createClient();

    // Get the currently logged-in student
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Get all active announcements
    const { data: announcements, error: announcementError } =
      await supabase
        .from('announcements')
        .select('id, title, body, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (announcementError) {
      console.error('Announcement error:', announcementError);
      setUnreadCount(0);
      return;
    }

    const items = (announcements || []) as Announcement[];

    if (items.length === 0) {
      setUnreadCount(0);
      return;
    }

    // Get announcements this student has already read
    const { data: reads, error: readsError } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id);

    if (readsError) {
      console.error('Announcement reads error:', readsError);
      return;
    }

    const readIds = new Set(
      (reads || []).map((read) => read.announcement_id)
    );

    const unreadCount = items.filter(
      (announcement) => !readIds.has(announcement.id)
    ).length;

    setUnreadCount(unreadCount);
  };

  useEffect(() => {
    loadUnreadCount();

    // Check for new announcements every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    // Refresh when the student returns to the dashboard
    const handleFocus = () => {
      loadUnreadCount();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const hasUnread = unreadCount > 0;

  return (
    <Link
      href="/announcements"
      aria-label={
        hasUnread
          ? `${unreadCount} unread announcement${
              unreadCount === 1 ? '' : 's'
            }`
          : 'Announcements'
      }
      className="relative inline-flex"
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
          hasUnread
            ? 'animate-pulse border-amber-300 bg-amber-50 shadow-lg shadow-amber-200'
            : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50'
        }`}
      >
        <span className="text-2xl">🔔</span>

        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-black text-white shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}
