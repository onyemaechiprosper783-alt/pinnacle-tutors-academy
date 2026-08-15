import Link from 'next/link';

type University = {
  name: string;
  type: 'Federal' | 'State' | 'Private';
};

const NUC_PAGES = [
  {
    type: 'Federal' as const,
    url: 'https://www.nuc.edu.ng/nigerian-univerisities/federal-univeristies/',
  },
  {
    type: 'State' as const,
    url: 'https://www.nuc.edu.ng/nigerian-univerisities/state-univerisity/',
  },
  {
    type: 'Private' as const,
    url: 'https://www.nuc.edu.ng/nigerian-univerisities/private-univeristies/',
  },
];

async function getUniversities(): Promise<University[]> {
  const universities: University[] = [];

  for (const source of NUC_PAGES) {
    try {
      const response = await fetch(source.url, {
        next: { revalidate: 86400 },
        headers: {
          'User-Agent': 'Pinnacle-Tutors-University-Directory/1.0',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();

      /*
       * The NUC pages contain university names inside HTML table rows.
       * We extract the first useful table cell from each numbered row.
       */
      const rowMatches = html.match(
        /<tr[^>]*>[\s\S]*?<\/tr>/gi
      );

      if (!rowMatches) continue;

      for (const row of rowMatches) {
        const numberMatch = row.match(
          /<td[^>]*>\s*(\d+)\s*<\/td>/i
        );

        if (!numberMatch) continue;

        const cells = row.match(
          /<td[^>]*>([\s\S]*?)<\/td>/gi
        );

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

        if (
          name.toLowerCase().includes('federal universities') ||
          name.toLowerCase().includes('state universities') ||
          name.toLowerCase().includes('private universities')
        ) {
          continue;
        }

        universities.push({
          name,
          type: source.type,
        });
      }
    } catch {
      // If one NUC page fails, continue with the other categories.
    }
  }

  /*
   * Remove duplicates while keeping the university category.
   */
  const unique = new Map<string, University>();

  for (const university of universities) {
    const key = university.name.toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, university);
    }
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export default async function CareerPage() {
  const universities = await getUniversities();

  const federalCount = universities.filter(
    (u) => u.type === 'Federal'
  ).length;

  const stateCount = universities.filter(
    (u) => u.type === 'State'
  ).length;

  const privateCount = universities.filter(
    (u) => u.type === 'Private'
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">

        {/* BACK */}
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Dashboard
        </Link>

        {/* HEADER */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                🎓
              </div>

              <div>
                <h1 className="text-2xl font-black md:text-3xl">
                  Career & Institution
                </h1>

                <p className="mt-1 text-sm text-emerald-50 md:text-base">
                  Find your career, course and university.
                </p>
              </div>
            </div>
          </div>

          {/* QUICK OPTIONS */}
          <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-3xl">🎯</div>

              <h2 className="mt-3 text-lg font-black text-slate-900">
                Career Guidance
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Explore careers and discover possible academic paths.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-3xl">📚</div>

              <h2 className="mt-3 text-lg font-black text-slate-900">
                Courses
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Learn about courses and the careers they can lead to.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-3xl">🏫</div>

              <h2 className="mt-3 text-lg font-black text-emerald-900">
                Nigerian Universities
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-700">
                Browse universities currently listed by the NUC.
              </p>
            </div>

          </div>
        </section>

        {/* UNIVERSITY DIRECTORY */}
        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-7">

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                Official University Directory
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Universities in Nigeria
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                University information is sourced from the National
                Universities Commission (NUC).
              </p>
            </div>

            <a
              href="https://www.nuc.edu.ng/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Visit NUC →
            </a>

          </div>

          {/* STATS */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-black text-slate-900">
                {universities.length}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Universities loaded
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-2xl font-black text-blue-700">
                {federalCount}
              </p>
              <p className="mt-1 text-xs font-semibold text-blue-600">
                Federal
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-2xl font-black text-emerald-700">
                {stateCount}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-600">
                State
              </p>
            </div>

            <div className="rounded-2xl bg-purple-50 p-4">
              <p className="text-2xl font-black text-purple-700">
                {privateCount}
              </p>
              <p className="mt-1 text-xs font-semibold text-purple-600">
                Private
              </p>
            </div>

          </div>

          {/* SEARCH */}
          <div className="mt-7">
            <label
              htmlFor="university-search"
              className="mb-2 block text-sm font-black text-slate-700"
            >
              Search universities
            </label>

            <input
              id="university-search"
              type="text"
              placeholder="Search by university name..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* NOTE */}
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              Important
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              University listings and approvals can change. Always confirm
              current admission requirements, available programmes and
              accreditation information with the institution and official
              JAMB/NUC sources before making an application.
            </p>
          </div>

          {/* LIST */}
          <div className="mt-7">

            {universities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="text-4xl">🏫</div>

                <h3 className="mt-3 text-lg font-black text-slate-900">
                  University list temporarily unavailable
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Please try again shortly or visit the NUC website.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">

                {universities.map((university, index) => (
                  <div
                    key={`${university.type}-${university.name}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30"
                  >
                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        🏫
                      </div>

                      <div className="min-w-0 flex-1">

                        <h3 className="font-bold leading-5 text-slate-900">
                          {university.name}
                        </h3>

                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            university.type === 'Federal'
                              ? 'bg-blue-100 text-blue-700'
                              : university.type === 'State'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {university.type} University
                        </span>

                      </div>
                    </div>
                  </div>
                ))}

              </div>
            )}

          </div>

        </section>

        {/* CAREER SECTION */}
        <section className="mt-6 rounded-3xl bg-emerald-50 p-6 md:p-8">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
              🚀
            </div>

            <div>
              <h2 className="text-xl font-black text-emerald-950">
                Plan your future
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Your JAMB subjects, course choice and institution should
                support the career you want. Use this section to explore
                your options before making important academic decisions.
              </p>
            </div>

          </div>

        </section>

        {/* SOURCE */}
        <p className="mt-6 text-center text-xs text-slate-400">
          University directory source: National Universities Commission
          (NUC). Always verify current information with official sources.
        </p>

      </div>
    </main>
  );
}
