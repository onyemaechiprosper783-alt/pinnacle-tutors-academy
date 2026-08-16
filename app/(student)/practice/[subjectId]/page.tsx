'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ExamRunner } from '@/components/cbt/ExamRunner';
import type { QuestionPublic } from '@/types/database';

export default function PracticePage() {
  const params = useParams<{ subjectId: string }>();

  const [examType, setExamType] = useState<'jamb' | 'waec'>('jamb');
  const [year, setYear] = useState<string>('any');
  const [difficulty, setDifficulty] = useState<string>('any');
  const [questionCount, setQuestionCount] = useState<number>(20);

  const [session, setSession] = useState<{
    attemptId: string;
    questions: QuestionPublic[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startPractice() {
    setLoading(true);
    setError('');

    try {
      const body: {
        mode: string;
        subject_ids: string[];
        question_count: number;
        exam_type: string;
        year?: number;
        difficulty?: string;
      } = {
        mode: 'practice',
        subject_ids: [params.subjectId],
        question_count: questionCount,
        exam_type: examType,
      };

      if (year !== 'any') {
        body.year = Number(year);
      }

      if (difficulty !== 'any') {
        body.difficulty = difficulty;
      }

      const res = await fetch('/api/exams/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Could not start practice.');
      }

      setSession({
        attemptId: data.attempt_id,
        questions: data.questions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start practice.');
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    return (
      <ExamRunner
        attemptId={session.attemptId}
        mode="practice"
        questions={session.questions}
        durationSeconds={null}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Practice Setup
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose how you want to practice before starting.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Exam Type */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Exam Type
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExamType('jamb')}
                className={`rounded-xl border p-4 text-left transition ${
                  examType === 'jamb'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">JAMB</div>
                <div className="mt-1 text-xs text-slate-500">
                  Practice JAMB questions
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExamType('waec')}
                className={`rounded-xl border p-4 text-left transition ${
                  examType === 'waec'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">WAEC</div>
                <div className="mt-1 text-xs text-slate-500">
                  Practice WAEC questions
                </div>
              </button>
            </div>
          </div>

          {/* Year */}
          <div>
            <label
              htmlFor="year"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Year
            </label>

            <select
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="any">Any Year</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label
              htmlFor="difficulty"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Difficulty
            </label>

            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="any">Any Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Number of Questions */}
          <div>
            <label
              htmlFor="questionCount"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Number of Questions
            </label>

            <select
              id="questionCount"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={20}>20 Questions</option>
              <option value={30}>30 Questions</option>
              <option value={40}>40 Questions</option>
              <option value={50}>50 Questions</option>
            </select>
          </div>

          <button
            type="button"
            onClick={startPractice}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Starting Practice...' : 'Start Practice'}
          </button>
        </div>
      </div>
    </div>
  );
}
