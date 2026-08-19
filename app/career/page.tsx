import Link from 'next/link';
import UniversityDirectory from '@/components/career/UniversityDirectory';

type University = {
  name: string;
  type: 'Federal' | 'State' | 'Private';
};

const NUC_PAGES = [
  { type: 'Federal' as const, url: 'https://www.nuc.edu.ng/nigerian-univerisities/federal-univeristies/' },
  { type: 'State' as const, url: 'https://www.nuc.edu.ng/nigerian-univerisities/state-univerisity/' },
  { type: 'Private' as const, url: 'https://www.nuc.edu.ng/nigerian-univerisities/private-univeristies/' },
];

async function getUniversities(): Promise<University[]> {
  const universities: University[] = [];
  for (const source of NUC_PAGES) {
    try {
      const response = await fetch(source.url, {
        next: { revalidate: 86400 },
        headers: { 'User-Agent': 'Pinnacle-Tutors-University-Directory/1.0' },
      });
      if (!response.ok) continue;
      const html = await response.text();
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
      for (const row of rows) {
        if (!/<td[^>]*>\s*\d+\s*<\/td>/i.test(row)) continue;
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (!cells || cells.length < 2) continue;
        const name = cells[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&#8217;/gi, '’')
          .replace(/&#39;/gi, "'")
          .replace(/\s+/g, ' ')
          .trim();
        if (!name) continue;
        const lower = name.toLowerCase();
        if (lower.includes('federal universities') || lower.includes('state universities') || lower.includes('private universities')) continue;
        universities.push({ name, type: source.type });
      }
    } catch {
      // Continue when an individual NUC category is temporarily unavailable.
    }
  }
  const unique = new Map<string, University>();
  for (const university of universities) {
    const key = university.name.toLowerCase();
    if (!unique.has(key)) unique.set(key, university);
  }
  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default async function CareerPage() {
  const universities = await getUniversities();
  const federalCount = universities.filter((u) => u.type === 'Federal').length;
  const stateCount = universities.filter((u) => u.type === 'State').length;
  const privateCount = universities.filter((u) => u.type === 'Private').length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="mb-5 inline-flex items-center text-sm font-bold text-cyan-600 hover:text-cyan-500">← Back to Dashboard</Link>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-cyan-600 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">🎓</div>
              <div><h1 className="text-2xl font-black md:text-3xl">Career & Institution</h1><p className="mt-1 text-sm text-indigo-100 md:text-base">Find your career, course and university.</p></div>
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
            <Link href="/career/guidance" className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
              <div className="text-3xl">🎯</div><h2 className="mt-3 text-lg font-black">Career Guidance</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Explore careers and discover possible academic paths.</p><span className="mt-4 inline-block text-sm font-bold text-cyan-600">Explore Careers →</span>
            </Link>
            <Link href="/career/courses" className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
              <div className="text-3xl">📚</div><h2 className="mt-3 text-lg font-black">Courses</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Learn about courses and the careers they can lead to.</p><span className="mt-4 inline-block text-sm font-bold text-cyan-600">Explore Courses →</span>
            </Link>
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-900 dark:bg-cyan-950/40">
              <div className="text-3xl">🏫</div><h2 className="mt-3 text-lg font-black text-cyan-950 dark:text-cyan-100">Nigerian Universities</h2><p className="mt-2 text-sm leading-6 text-cyan-800 dark:text-cyan-200">Browse universities currently listed by the NUC.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div><p className="text-xs font-black uppercase tracking-widest text-cyan-600">Official University Directory</p><h2 className="mt-1 text-2xl font-black">Universities in Nigeria</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">University information is sourced from the National Universities Commission (NUC).</p></div>
            <a href="https://www.nuc.edu.ng/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Visit NUC →</a>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-2xl font-black">{universities.length}</p><p className="mt-1 text-xs font-semibold text-slate-500">Universities loaded</p></div>
            <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30"><p className="text-2xl font-black text-blue-700 dark:text-blue-300">{federalCount}</p><p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">Federal</p></div>
            <div className="rounded-2xl bg-cyan-50 p-4 dark:bg-cyan-950/30"><p className="text-2xl font-black text-cyan-700 dark:text-cyan-300">{stateCount}</p><p className="mt-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400">State</p></div>
            <div className="rounded-2xl bg-purple-50 p-4 dark:bg-purple-950/30"><p className="text-2xl font-black text-purple-700 dark:text-purple-300">{privateCount}</p><p className="mt-1 text-xs font-semibold text-purple-600 dark:text-purple-400">Private</p></div>
          </div>

          <UniversityDirectory universities={universities} />

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Important</p>
            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">University listings and approvals can change. Always confirm current admission requirements, programmes and accreditation with the institution and official JAMB/NUC sources before applying.</p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-cyan-50 p-6 dark:from-indigo-950/40 dark:to-cyan-950/30 md:p-8">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm dark:bg-slate-900">🚀</div><div><h2 className="text-xl font-black">Plan your future</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Your JAMB subjects, course choice and institution should support the career you want. Explore your options before making important academic decisions.</p></div></div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">University directory source: National Universities Commission (NUC). Always verify current information with official sources.</p>
      </div>
    </main>
  );
}
