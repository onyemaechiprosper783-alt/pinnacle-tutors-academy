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

const READ_KEY = 'pinnacle_read_announcements';

export default function AnnouncementBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = (items: Announcement[]) => {
    try {
      const stored = localStorage.getItem(READ_KEY);
      const readIds: string[] = stored ? JSON.parse(stored) : [];

      const unread = items.filter(
        (announcement) => !readIds.includes(announcement.id)
      );

      setUnreadCount(unread.length);
    } catch {
      setUnreadCount(items.length);
    }
  };

  const loadAnnouncements = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Announcement error:', error);
      return;
    }

    const items = (data || []) as Announcement[];

    setAnnouncements(items);
    updateUnreadCount(items);
  };

  useEffect(() => {
    loadAnnouncements();

    // Check for new announcements every 30 seconds.
    const interval = setInterval(() => {
      loadAnnouncements();
    }, 30000);

    return () => clearInterval(interval);
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
