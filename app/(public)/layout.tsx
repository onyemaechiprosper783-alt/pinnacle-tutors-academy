import Link from 'next/link';

const NAV = [
  { href: '/about', label: 'About' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/jamb', label: 'JAMB' },
  { href: '/waec', label: 'WAEC' },
  { href: '/contact', label: 'Contact' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-emerald-700">Pinnacle Tutors Academy</Link>
          <nav className="hidden gap-6 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-600 hover:text-emerald-700">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700">Log in</Link>
            <Link href="/register" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Sign up</Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-100 bg-slate-50 py-10">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500">
          <p className="mb-2 font-semibold text-slate-700">Pinnacle Tutors Academy</p>
          <p>Your Ultimate JAMB & WAEC Success Partner</p>
          <div className="mt-4 flex justify-center gap-4">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-emerald-700">{item.label}</Link>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-400">© {new Date().getFullYear()} Pinnacle Tutors Academy</p>
        </div>
      </footer>
    </div>
  );
}
