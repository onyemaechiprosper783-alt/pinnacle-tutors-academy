'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExamRunner } from '@/components/cbt/ExamRunner';
import type { QuestionPublic } from '@/types/database';

type ExamType = 'jamb' | 'waec';
type Difficulty = 'any' | 'easy' | 'medium' | 'hard';

const YEARS = ['any', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];
const QUESTION_COUNTS = [5, 10, 20, 30, 40, 50];

export default function PracticePage() {
  const params = useParams<{ subjectId: string }>();
  const [examType, setExamType] = useState<ExamType>('jamb');
  const [year, setYear] = useState('any');
  const [difficulty, setDifficulty] = useState<Difficulty>('any');
  const [questionCount, setQuestionCount] = useState(20);
  const [availableQuestions, setAvailableQuestions] = useState<number | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [session, setSession] = useState<{ attemptId: string; questions: QuestionPublic[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function checkAvailability() {
      setCheckingAvailability(true);
      setAvailableQuestions(null);
      setError('');
      try {
        const body: {
          subject_id: string;
          mode: 'practice';
          exam_type: ExamType;
          year?: number;
          difficulty?: 'easy' | 'medium' | 'hard';
        } = { subject_id: params.subjectId, mode: 'practice', exam_type: examType };
        if (year !== 'any') body.year = Number(year);
        if (difficulty !== 'any') body.difficulty = difficulty;

        const res = await fetch('/api/exams/available', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Could not check available questions.');

        if (!cancelled) {
          const available = Number(data.available ?? 0);
          setAvailableQuestions(available);
          const validCounts = QUESTION_COUNTS.filter((count) => count <= available);
          setQuestionCount(validCounts.length > 0 ? Math.max(...validCounts) : 5);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not check available questions.');
      } finally {
        if (!cancelled) setCheckingAvailability(false);
      }
    }
    void checkAvailability();
    return () => { cancelled = true; };
  }, [params.subjectId, examType, year, difficulty]);

  async function startPractice() {
    setLoading(true);
    setError('');
    try {
      if (availableQuestions !== null && availableQuestions < questionCount) {
        throw new Error(`Only ${availableQuestions} question${availableQuestions === 1 ? '' : 's'} available for these selections.`);
      }
      if (availableQuestions === 0) throw new Error('No questions are available for these selections.');

      const body: {
        mode: 'practice';
        subject_ids: string[];
        question_count: number;
        exam_type: ExamType;
        year?: number;
        difficulty?: 'easy' | 'medium' | 'hard';
      } = {
        mode: 'practice',
        subject_ids: [params.subjectId],
        question_count: questionCount,
        exam_type: examType,
      };
      if (year !== 'any') body.year = Number(year);
      if (difficulty !== 'any') body.difficulty = difficulty;

      const res = await fetch('/api/exams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start practice.');
      if (!data.questions?.length) throw new Error('No questions are available for these selections.');
      setSession({ attemptId: data.attempt_id, questions: data.questions });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start practice.');
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    return <ExamRunner attemptId={session.attemptId} mode="practice" questions={session.questions} durationSeconds={null} />;
  }

  const validQuestionCounts = availableQuestions === null
    ? QUESTION_COUNTS
    : QUESTION_COUNTS.filter((count) => count <= availableQuestions);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-7">
            <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">PRACTICE MODE</div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Practice Setup</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Choose your exam type, year, difficulty and number of questions.</p>
          </div>

          {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm font-semibold text-red-800">Something went wrong</p><p className="mt-1 text-sm leading-5 text-red-700">{error}</p></div>}

          <div className="mb-6 rounded-xl bg-slate-50 p-4">
            {checkingAvailability ? (
              <div className="flex items-center gap-2 text-sm text-slate-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />Checking your questions...</div>
            ) : availableQuestions === null ? (
              <p className="text-sm text-slate-500">Checking your questions...</p>
            ) : availableQuestions === 0 ? (
              <div><p className="font-semibold text-red-700">No questions available</p><p className="mt-1 text-xs text-slate-500">Try changing the year, difficulty or exam type.</p></div>
            ) : (
              <div><p className="text-sm font-semibold text-emerald-700">Questions ready</p><p className="mt-1 text-xs text-slate-500">Choose how many you want to practise below.</p></div>
            )}
          </div>

          <div className="space-y-6">
            <section>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Exam Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['jamb', 'waec'] as const).map((type) => {
                  const selected = examType === type;
                  return <button key={type} type="button" onClick={() => setExamType(type)} className={`min-h-[76px] rounded-xl border p-4 text-left transition active:scale-[0.98] ${selected ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><div className="font-bold">{type === 'jamb' ? 'JAMB' : 'WAEC'}</div><div className="mt-1 text-xs text-slate-500">{type === 'jamb' ? 'JAMB practice questions' : 'WAEC practice questions'}</div></button>;
                })}
              </div>
            </section>

            <section>
              <label htmlFor="year" className="mb-2 block text-sm font-semibold text-slate-700">Year</label>
              <select id="year" value={year} onChange={(e) => setYear(e.target.value)} className="min-h-[50px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                {YEARS.map((value) => <option key={value} value={value}>{value === 'any' ? 'Any Year' : value}</option>)}
              </select>
            </section>

            <section>
              <label htmlFor="difficulty" className="mb-2 block text-sm font-semibold text-slate-700">Difficulty</label>
              <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="min-h-[50px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                <option value="any">Any Difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </section>

            <section>
              <label htmlFor="questionCount" className="mb-2 block text-sm font-semibold text-slate-700">Number of Questions</label>
              <select id="questionCount" value={validQuestionCounts.includes(questionCount) ? questionCount : validQuestionCounts[0] ?? 5} onChange={(e) => setQuestionCount(Number(e.target.value))} disabled={checkingAvailability || availableQuestions === 0} className="min-h-[50px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400">
                {validQuestionCounts.length > 0 ? validQuestionCounts.map((count) => <option key={count} value={count}>{count} Questions</option>) : <option value={5}>No standard question count available</option>}
              </select>
            </section>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your Practice</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">{examType.toUpperCase()}</span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">{year === 'any' ? 'Any Year' : year}</span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">{difficulty === 'any' ? 'Any Difficulty' : difficulty}</span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">{questionCount} Questions</span>
              </div>
            </div>

            <button type="button" onClick={startPractice} disabled={loading || checkingAvailability || availableQuestions === 0 || availableQuestions === null || questionCount > availableQuestions} className="min-h-[52px] w-full touch-manipulation rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Starting Practice...' : checkingAvailability ? 'Checking Questions...' : availableQuestions === 0 ? 'No Questions Available' : 'Start Practice'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
