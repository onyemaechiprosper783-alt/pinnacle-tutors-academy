import Link from 'next/link';

export default function JambPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold text-slate-900">JAMB / UTME Preparation</h1>
      <p className="mb-6 text-slate-600">
        Practice UTME-style questions across your chosen subjects, sit full-length CBT mock exams under
        real time pressure, and track your subject-by-subject performance so you know exactly where to
        focus before exam day.
      </p>
      <ul className="mb-8 list-disc space-y-2 pl-5 text-slate-600">
        <li>Practice mode with instant feedback and explanations</li>
        <li>Timed CBT simulation matching the real exam format</li>
        <li>Multi-subject mock exams with detailed score breakdowns</li>
        <li>UTME Challenge to compete with other students</li>
      </ul>
      <Link href="/register" className="inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white">
        Start Preparing
      </Link>
    </div>
  );
}
