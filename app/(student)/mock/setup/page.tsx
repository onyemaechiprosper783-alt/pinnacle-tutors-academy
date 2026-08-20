'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const EXAM_TYPES = [
  { value: 'jamb', label: 'JAMB' },
  { value: 'waec', label: 'WAEC' },
  { value: 'utme', label: 'UTME' },
  { value: 'general', label: 'General' },
] as const;

const YEARS = Array.from({ length: 11 }, (_, index) => 2026 - index);
const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const QUESTION_COUNTS = [10, 20, 30, 40, 50, 60, 90, 120, 180];

export default function MockSetupPage() {
  const router = useRouter();
  const [examType, setExamType] = useState('jamb');
  const [year, setYear] = useState('2026');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [questionCount, setQuestionCount] = useState(60);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/subjects', { cache: 'force-cache', signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load subjects.');
        return res.json();
      })
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (error?.name !== 'AbortError') setError(error instanceof Error ? error.message : 'Could not load subjects.');
      })
      .finally(() => setLoadingSubjects(false));
    return () => controller.abort();
  }, []);

  function toggleSubject(id: string) {
    setError('');
    setSelectedSubjects((current) => current.includes(id) ? current.filter((subjectId) => subjectId !== id) : [...current, id]);
  }

  async function startMock() {
    if (selectedSubjects.length === 0) { setError('Please select at least one subject.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/exams/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'mock', subject_ids: selectedSubjects, question_count: questionCount, duration_seconds: durationMinutes * 60, exam_type: examType, year: Number(year) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start mock exam.');
      router.push(`/mock/${data.attempt_id}`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not start mock exam.'); }
    finally { setLoading(false); }
  }

  if (loadingSubjects) return <main className="min-h-screen bg-[var(--background)] px-3 py-5 sm:px-6 sm:py-8"><div className="mx-auto w-full max-w-2xl"><div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm"><div className="mx-auto h-6 w-48 animate-pulse rounded bg-[var(--surface)]" /><div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded bg-[var(--surface)]" /><div className="mt-8 grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface)]" />)}</div></div></div></main>;

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <button type="button" onClick={() => router.back()} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-bold text-[var(--foreground)] shadow-sm hover:bg-[var(--background)]">← Back</button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-8">
          <div className="mb-7"><div className="mb-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">MOCK EXAM</div><h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Set Up Your Mock Exam</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Choose your exam type, year, number of questions, subjects and the amount of time you want.</p></div>
          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
          <div className="mb-6"><label htmlFor="examType" className="mb-2 block text-sm font-bold text-[var(--foreground)]">Exam Type</label><select id="examType" value={examType} onChange={(e) => setExamType(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500">{EXAM_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
          <div className="mb-6"><label htmlFor="year" className="mb-2 block text-sm font-bold text-[var(--foreground)]">Exam Year</label><select id="year" value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500">{YEARS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div className="mb-6"><div className="mb-3"><h2 className="font-bold text-[var(--foreground)]">How many questions?</h2><p className="text-xs text-[var(--muted)]">Choose the size of this mock. The selected number is used when the mock starts.</p></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{QUESTION_COUNTS.map((count) => { const selected = questionCount === count; return <button key={count} type="button" onClick={() => setQuestionCount(count)} className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition ${selected ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-300' : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-brand-400'}`}>{count}</button>; })}</div></div>
          <div className="mb-6"><div className="mb-3"><h2 className="font-bold text-[var(--foreground)]">How much time do you want?</h2><p className="text-xs text-[var(--muted)]">Choose any available duration for this personal mock.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{DURATIONS.map((minutes) => { const selected = durationMinutes === minutes; return <button key={minutes} type="button" onClick={() => setDurationMinutes(minutes)} className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition ${selected ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-emerald-400'}`}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes === 60 ? '' : 's'}`}</button>; })}</div></div>
          <div className="mb-6"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold text-[var(--foreground)]">Subjects</h2><p className="text-xs text-[var(--muted)]">Select the subjects you want in your mock.</p></div><span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-bold text-[var(--muted)]">{selectedSubjects.length} selected</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{subjects.map((subject) => { const selected = selectedSubjects.includes(subject.id); return <button key={subject.id} type="button" onClick={() => toggleSubject(subject.id)} className={`min-h-[65px] rounded-xl border-2 p-4 text-left transition ${selected ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/30' : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)]'}`}><div className="flex items-center justify-between gap-3"><span className={`font-semibold ${selected ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--foreground)]'}`}>{subject.name}</span><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-[var(--border)] text-transparent'}`}>✓</span></div></button>; })}</div></div>
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-lg shadow-emerald-900/15"><div className="flex items-center justify-between"><span className="text-sm text-white/75">Mock Questions</span><span className="text-2xl font-bold">{questionCount}</span></div><div className="mt-3 flex items-center justify-between"><span className="text-sm text-white/75">Your Time Limit</span><span className="font-bold">{durationMinutes} minutes</span></div><div className="mt-3 border-t border-white/15 pt-3 text-xs leading-5 text-white/70">Questions are randomly shuffled. Difficulty is automatically mixed and is not selectable.</div></div>
          <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><strong>Important:</strong> Once the mock starts, the timer cannot be paused. Your answers are saved as you progress. You can submit before completing all questions.</div>
          <Button onClick={startMock} loading={loading} fullWidth disabled={selectedSubjects.length === 0}>Start Mock Exam</Button>
        </div>
      </div>
    </main>
  );
}
