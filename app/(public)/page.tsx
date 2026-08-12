import Link from 'next/link';

const FEATURES = [
  { title: 'JAMB Preparation', desc: 'Thousands of UTME-style questions across every subject, updated regularly.' },
  { title: 'WAEC Preparation', desc: 'Practice questions and mock papers aligned to the WAEC syllabus.' },
  { title: 'Practice Mode', desc: 'Answer at your own pace with instant feedback and explanations.' },
  { title: 'Mock Exams', desc: 'Full-length, multi-subject exams that mirror the real thing.' },
  { title: 'CBT Simulation', desc: 'A timed, computer-based test experience with question navigation.' },
  { title: 'UTME Challenge', desc: 'Compete with other students and climb the leaderboard.' },
];

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center md:pt-24">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-600">Pinnacle Tutors Academy</p>
        <h1 className="mb-4 text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
          Your Ultimate JAMB & WAEC Success Partner
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-lg text-slate-500">
          Practice smarter, take real mock exams, and track your progress — built for Nigerian students,
          on any Android phone.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/register" className="rounded-xl bg-emerald-600 px-6 py-3.5 font-semibold text-white">
            Start Practicing
          </Link>
          <Link href="/register" className="rounded-xl border border-slate-200 px-6 py-3.5 font-semibold text-slate-700">
            Take a Mock Exam
          </Link>
          <Link href="/community" className="rounded-xl border border-slate-200 px-6 py-3.5 font-semibold text-slate-700">
            Join Our Community
          </Link>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">Why Pinnacle Tutors Academy</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold text-slate-900">Ready to start?</h2>
        <p className="mb-6 text-slate-500">Create your free account and take your first practice quiz in minutes.</p>
        <Link href="/register" className="inline-block rounded-xl bg-emerald-600 px-8 py-3.5 font-semibold text-white">
          Create Free Account
        </Link>
      </section>
    </div>
  );
}
