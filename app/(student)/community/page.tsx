'use client';

import { useEffect, useState } from 'react';

interface CommunitySettings {
  whatsapp_group_url: string | null;
  whatsapp_channel_url: string | null;
  telegram_url: string | null;
}

export default function CommunityPage() {
  const [settings, setSettings] = useState<CommunitySettings | null>(null);

  useEffect(() => {
    fetch('/api/community').then((r) => r.json()).then(setSettings);
  }, []);

  const links = [
    { label: 'Join our WhatsApp Group', url: settings?.whatsapp_group_url, color: 'bg-emerald-600' },
    { label: 'Follow our WhatsApp Channel', url: settings?.whatsapp_channel_url, color: 'bg-emerald-700' },
    { label: 'Join our Telegram', url: settings?.telegram_url, color: 'bg-sky-600' },
  ].filter((l) => l.url);

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Join the Community</h1>
      <p className="mb-6 text-slate-500">Connect with fellow students, get study tips, and stay updated.</p>

      {links.length === 0 ? (
        <p className="text-slate-400">Community links are being set up. Please check back soon.</p>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            // Real <a> tags, not onClick handlers — these always work
            // regardless of which browser or in-app webview opened the page.
            <a
              key={link.label}
              href={link.url!}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-xl px-5 py-4 font-semibold text-white ${link.color}`}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
