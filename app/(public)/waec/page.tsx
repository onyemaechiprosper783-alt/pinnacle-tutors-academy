import Link from 'next/link';

export default function WaecPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold text-slate-900">WAEC Preparation</h1>
      <p className="mb-6 text-slate-600">
        Build exam readiness with WAEC-aligned practice questions, including comprehension passages,
        grammar, and structured problem sets — plus mock exams to test your pacing across a full paper.
      </p>
      <ul className="mb-8 list-disc space-y-2 pl-5 text-slate-600">
        <li>Subject-by-subject practice with detailed explanations</li>
        <li>English comprehension passages with linked questions</li>
        <li>Full mock exams with subject performance breakdowns</li>
      </ul>
      <Link href="/register" className="inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white">
        Start Preparing
      </Link>
    </div>
  );
}
