'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Subject {
  id: string;
  name: string;
}

const OTHER_SUBJECT_COUNT = 3;
const CBT_QUESTION_COUNT = 180;
const CBT_DURATION_SECONDS = 120 * 60;

export default function CbtSetupPage() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch('/api/subjects');

        if (!res.ok) {
          throw new Error('Could not load subjects.');
        }

        const data = await res.json();

        setSubjects(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Could not load subjects.'
        );
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, []);

  const availableSubjects = useMemo(() => {
    return subjects.filter(
      (subject) =>
        !subject.name.toLowerCase().includes('english')
    );
  }, [subjects]);

  function toggleSubject(id: string) {
    setError('');

    setSelectedSubjects((current) => {
      if (current.includes(id)) {
        return current.filter((subjectId) => subjectId !== id);
      }

      if (current.length >= OTHER_SUBJECT_COUNT) {
        setError(
          'You can select only 3 additional subjects.'
        );
        return current;
      }

      return [...current, id];
    });
  }

  function continueSetup() {
    if (selectedSubjects.length !== 3) {
      setError('Please select exactly 3 additional subjects.');
      return;
    }

    setError('');
    setStarted(true);
  }

  async function handleStart() {
    if (selectedSubjects.length !== 3) {
      setError('Please select exactly 3 additional subjects.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      /*
       * English is automatically included.
       *
       * English:
       * 50 normal English questions
       * 10 Lekki Headmaster questions
       *
       * Three selected subjects:
       * 40 questions each
       *
       * TOTAL = 180 QUESTIONS
       * TIME = 120 MINUTES
       */
      const res = await fetch('/api/exams/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'cbt',

          subject_ids: selectedSubjects,

          question_count: CBT_QUESTION_COUNT,

          duration_seconds: CBT_DURATION_SECONDS,

          cbt_config: {
            english_question_count: 50,
            lekki_headmaster_count: 10,
            other_subject_question_count: 40,
            other_subject_ids: selectedSubjects,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? 'Could not start CBT exam.'
        );
      }

      router.push(`/cbt/${data.attempt_id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not start CBT exam.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingSubjects) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-center text-slate-500">
            Loading subjects...
          </p>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

            <div className="mb-7">
              <div className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                JAMB CBT
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Choose Your Subjects
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                English Language is compulsory. Select
                3 additional subjects for your CBT.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* English locked section */}
            <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-emerald-900">
                    English Language
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    Compulsory — 60 questions
                  </p>

                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    Includes 50 English questions and
                    10 Lekki Headmaster questions.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  LOCKED
                </span>
              </div>
            </div>

            {/* Selection counter */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800">
                  Additional Subjects
                </h2>

                <p className="text-xs text-slate-500">
                  Choose 3 subjects
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  selectedSubjects.length === 3
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectedSubjects.length}/3
              </span>
            </div>

            {/* Subject list */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {availableSubjects.map((subject) => {
                const selected =
                  selectedSubjects.includes(subject.id);

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() =>
                      toggleSubject(subject.id)
                    }
                    className={`min-h-[70px] rounded-xl border p-4 text-left transition active:scale-[0.98] ${
                      selected
                        ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`font-semibold ${
                          selected
                            ? 'text-emerald-800'
                            : 'text-slate-800'
                        }`}
                      >
                        {subject.name}
                      </span>

                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          selected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      40 questions
                    </p>
                  </button>
                );
              })}
            </div>

            {availableSubjects.length === 0 && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                No additional subjects are available.
              </div>
            )}

            {/* Total */}
            <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  Total CBT Questions
                </span>

                <span className="text-2xl font-bold">
                  180
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <span>English: 60</span>
                <span>Subject 2: 40</span>
                <span>Subject 3: 40</span>
                <span>Subject 4: 40</span>
              </div>

              <div className="mt-3 border-t border-slate-700 pt-3">
                <span className="text-xs text-slate-300">
                  Time: 2 hours
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-5 text-amber-800">
              <strong>Important:</strong> This is a
              2-hour timed CBT. Your answers are saved as
              you progress, and the exam will automatically
              submit when the time expires.
            </div>

            <div className="mt-6">
              <Button
                onClick={continueSetup}
                fullWidth
                disabled={selectedSubjects.length !== 3}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="mb-6">
            <div className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              READY
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Ready to begin?
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review your CBT configuration before
              starting.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-500">
                English Language
              </span>

              <span className="font-bold text-slate-900">
                60
              </span>
            </div>

            {selectedSubjects.map((id, index) => {
              const subject = subjects.find(
                (s) => s.id === id
              );

              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                >
                  <span className="text-sm text-slate-500">
                    {subject?.name ??
                      `Subject ${index + 2}`}
                  </span>

                  <span className="font-bold text-slate-900">
                    40
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mb-6 rounded-2xl bg-emerald-50 p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-800">
                Total Questions
              </span>

              <span className="text-2xl font-bold text-emerald-800">
                180
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="font-semibold text-emerald-800">
                Time Allowed
              </span>

              <span className="text-2xl font-bold text-emerald-800">
                2 Hours
              </span>
            </div>

            <p className="mt-3 text-xs text-emerald-700">
              Includes 10 Lekki Headmaster questions
              automatically.
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Once started, the timer cannot be paused.
            There are no instant answers during the CBT.
            The exam automatically submits when the
            2-hour time limit expires.
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleStart}
              loading={loading}
              fullWidth
            >
              Start CBT Exam
            </Button>

            <button
              type="button"
              onClick={() => setStarted(false)}
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
