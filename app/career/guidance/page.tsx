import Link from 'next/link';

const careers = [
  {
    slug: 'medicine-healthcare',
    title: 'Medicine & Healthcare',
    icon: '🩺',
    description:
      'Explore careers such as medicine, nursing, pharmacy, medical laboratory science and other health-related fields.',
  },
  {
    slug: 'engineering-technology',
    title: 'Engineering & Technology',
    icon: '💻',
    description:
      'Explore engineering, software development, computer science, cybersecurity and other technology careers.',
  },
  {
    slug: 'business-finance',
    title: 'Business & Finance',
    icon: '💼',
    description:
      'Explore accounting, banking, economics, business administration, finance and entrepreneurship.',
  },
  {
    slug: 'law-government',
    title: 'Law & Government',
    icon: '⚖️',
    description:
      'Explore law, political science, public administration, international relations and related careers.',
  },
  {
    slug: 'education',
    title: 'Education',
    icon: '📚',
    description:
      'Explore teaching, educational administration, guidance and counselling and other education careers.',
  },
  {
    slug: 'science-research',
    title: 'Science & Research',
    icon: '🔬',
    description:
      'Explore biology, chemistry, physics, mathematics and careers involving scientific research.',
  },
  {
    slug: 'media-communication',
    title: 'Media & Communication',
    icon: '🎤',
    description:
      'Explore journalism, mass communication, broadcasting, public relations and digital media.',
  },
  {
    slug: 'creative-arts-design',
    title: 'Creative Arts & Design',
    icon: '🎨',
    description:
      'Explore graphic design, architecture, fashion, fine arts, animation and other creative careers.',
  },
];

export default function CareerGuidancePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/career"
          className="mb-5 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Career & Institution
        </Link>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                🎯
              </div>

              <div>
                <h1 className="text-2xl font-black md:text-3xl">
                  Career Guidance
                </h1>

                <p className="mt-1 text-sm text-emerald-50 md:text-base">
                  Explore career paths and discover possibilities for your
                  future.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                Explore Career Areas
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose a career area to learn more about possible careers,
                courses and academic paths.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {careers.map((career) => (
                <Link
                  key={career.slug}
                  href={`/career/guidance/${career.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl transition group-hover:bg-emerald-100">
                      {career.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-slate-900">
                        {career.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {career.description}
                      </p>

                      <span className="mt-3 inline-block text-sm font-bold text-emerald-600">
                        Explore careers →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-900">
                💡 Important
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Your interests, strengths, JAMB subjects, chosen course and
                institution can all affect your academic and career path.
                Take time to research your options before making a decision.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
