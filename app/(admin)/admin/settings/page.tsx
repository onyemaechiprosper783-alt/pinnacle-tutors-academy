import Link from 'next/link';

const LINKS = [
  { href: '/admin/community', label: 'Community links', desc: 'WhatsApp/Telegram links shown to students' },
  { href: '/admin/announcements', label: 'Announcements', desc: 'Post updates visible platform-wide' },
  { href: '/admin/students', label: 'Admin access', desc: 'Grant or revoke admin roles' },
];

export default function AdminSettingsPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Site Settings</h1>

      <div className="space-y-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="block rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-800">{l.label}</p>
            <p className="text-sm text-slate-500">{l.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
        Admin accounts are never self-service. The very first admin is created once via a
        server-only bootstrap secret; every admin after that is granted by an existing super admin
        under Admin Access.
      </div>
    </div>
  );
}
