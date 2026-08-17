'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const EXAM_TYPES = [
  {
    value: 'jamb',
    label: 'JAMB',
  },
  {
    value: 'waec',
    label: 'WAEC',
  },
  {
    value: 'utme',
    label: 'UTME',
  },
  {
    value: 'general',
    label: 'General',
  },
] as const;

const YEARS = Array.from(
  { length: 11 },
  (_, index) => 2026 - index
);

export default function MockSetupPage() {
  const router = useRouter();

  const [examType, setExamType] = useState('jamb');
  const [year, setYear] = useState('2026');

  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] =
    useState(true);

  const [subjects, setSubjects] = useState<
    { id: string; name: string }[]
  >([]);

  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>([]);

  const [error, setError] = useState('');

  /*
   * Load subjects
   */
  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch('/api/subjects');

        if (!res.ok) {
          throw new Error(
            'Could not load subjects.'
          );
        }

        const data = await res.json();

        setSubjects(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Could not load subjects.'
        );
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, []);

  /*
   * Select / unselect subject
   */
  function toggleSubject(id: string) {
    setError('');

    setSelectedSubjects((current) => {
      if (current.includes(id)) {
        return current.filter(
          (subjectId) => subjectId !== id
        );
      }

      return [...current, id];
    });
  }

  /*
   * Start mock
   */
  async function startMock() {
    if (selectedSubjects.length === 0) {
      setError(
        'Please select at least one subject.'
      );
      return;
    }

    setError('');
    setLoading(true);

    try {
      /*
       * Difficulty is intentionally NOT sent.
       *
       * The backend will therefore use all available
       * difficulties and shuffle the questions.
       */
      const res = await fetch(
        '/api/exams/start',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'mock',

            subject_ids: selectedSubjects,

            question_count: 60,

            duration_seconds:
              90 * 60,

            exam_type: examType,

            year: Number(year),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            'Could not start mock exam.'
        );
      }

      router.push(
        `/mock/${data.attempt_id}`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not start mock exam.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingSubjects) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-center text-slate-500">
              Loading subjects...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

          {/* HEADER */}
          <div className="mb-7">
            <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              MOCK EXAM
            </div>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Set Up Your Mock Exam
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose your exam type, year and
              subjects. Questions will be
              automatically shuffled.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* EXAM TYPE */}
          <div className="mb-6">
            <label
              htmlFor="examType"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Exam Type
            </label>

            <select
              id="examType"
              value={examType}
              onChange={(e) =>
                setExamType(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {EXAM_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* YEAR */}
          <div className="mb-6">
            <label
              htmlFor="year"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Exam Year
            </label>

            <select
              id="year"
              value={year}
              onChange={(e) =>
                setYear(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {YEARS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* SUBJECTS */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800">
                  Subjects
                </h2>

                <p className="text-xs text-slate-500">
                  Select the subjects you want
                  in your mock.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {selectedSubjects.length}
                selected
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {subjects.map((subject) => {
                const selected =
                  selectedSubjects.includes(
                    subject.id
                  );

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() =>
                      toggleSubject(
                        subject.id
                      )
                    }
                    className={`min-h-[65px] rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`font-semibold ${
                          selected
                            ? 'text-blue-800'
                            : 'text-slate-800'
                        }`}
                      >
                        {subject.name}
                      </span>

                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MOCK INFORMATION */}
          <div className="mb-6 rounded-2xl bg-slate-900 p-5 text-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                Mock Questions
              </span>

              <span className="text-2xl font-bold">
                60
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">
                Time Limit
              </span>

              <span className="font-bold">
                90 minutes
              </span>
            </div>

            <div className="mt-3 border-t border-slate-700 pt-3 text-xs leading-5 text-slate-400">
              Questions are randomly shuffled.
              Difficulty is automatically mixed
              and is not selectable.
            </div>
          </div>

          {/* IMPORTANT */}
          <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm leading-5 text-amber-800">
            <strong>Important:</strong> Once the
            mock starts, the timer cannot be paused.
            Your answers are saved as you progress.
            You can submit before completing all
            questions.
          </div>

          {/* START */}
          <Button
            onClick={startMock}
            loading={loading}
            fullWidth
            disabled={
              selectedSubjects.length === 0
            }
          >
            Start Mock Exam
          </Button>
        </div>
      </div>
    </main>
  );
}
