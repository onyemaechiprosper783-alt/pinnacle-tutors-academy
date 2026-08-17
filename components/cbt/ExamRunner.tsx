'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { Calculator } from '@/components/calculator/Calculator';
import { Button } from '@/components/ui/Button';
import type { QuestionPublic } from '@/types/database';

interface ExamRunnerProps {
  attemptId: string;
  mode: 'practice' | 'mock' | 'cbt';
  questions: QuestionPublic[];
  durationSeconds: number | null;
}

interface Feedback {
  is_correct: boolean;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string | null;
}

const ENGLISH_SUBJECT_ID =
  'e5705892-de46-425c-af42-e37a3eddc93d';

const LEKKI_HEADMASTER_SUBJECT_ID =
  '3bca9d00-18fd-4064-b3ac-41da6e7eefa6';

const CBT_SECTIONS = [
  {
    key: 'english',
    name: 'English',
    count: 60,
  },
  {
    key: 'biology',
    name: 'Biology',
    count: 40,
  },
  {
    key: 'chemistry',
    name: 'Chemistry',
    count: 40,
  },
  {
    key: 'physics',
    name: 'Physics',
    count: 40,
  },
] as const;

type CbtSectionKey = (typeof CBT_SECTIONS)[number]['key'];

type QuestionWithSubject = QuestionPublic & {
  subject_id?: string;
};

export function ExamRunner({
  attemptId,
  mode,
  questions,
  durationSeconds,
}: ExamRunnerProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, 'A' | 'B' | 'C' | 'D'>
  >({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [answerLoading, setAnswerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [activeSection, setActiveSection] =
    useState<CbtSectionKey>('english');

  /*
   * ----------------------------------------------------
   * CBT SECTION ORGANIZATION
   * ----------------------------------------------------
   *
   * English = normal English + Lekki Headmaster
   * Biology = Biology
   * Chemistry = Chemistry
   * Physics = Physics
   *
   * There is NO question-number grid.
   */

  const cbtQuestions = useMemo(() => {
    if (mode !== 'cbt') return null;

    const typedQuestions =
      questions as QuestionWithSubject[];

    const english = typedQuestions.filter(
      (q) =>
        q.subject_id === ENGLISH_SUBJECT_ID ||
        q.subject_id === LEKKI_HEADMASTER_SUBJECT_ID
    );

    const biology = typedQuestions.filter((q) =>
      q.subject_id
        ? q.subject_id !== ENGLISH_SUBJECT_ID &&
          q.subject_id !== LEKKI_HEADMASTER_SUBJECT_ID &&
          q.subject_id ===
            typedQuestions.find(
              (x) =>
                x.subject_id === q.subject_id &&
                x.subject_id !== ENGLISH_SUBJECT_ID &&
                x.subject_id !== LEKKI_HEADMASTER_SUBJECT_ID
            )?.subject_id
        : false
    );

    /*
     * We identify the remaining subjects by their names.
     * This makes the CBT work even though the student's
     * selected subject IDs are not hard-coded here.
     */
    const getSubjectName = (q: QuestionWithSubject) => {
      const value = q as QuestionWithSubject & {
        subject_name?: string;
        subject?: string;
      };

      return (
        value.subject_name ??
        value.subject ??
        ''
      )
        .toString()
        .toLowerCase();
    };

    const biologyQuestions = typedQuestions.filter((q) => {
      const name = getSubjectName(q);
      return (
        name.includes('biology') &&
        q.subject_id !== ENGLISH_SUBJECT_ID &&
        q.subject_id !== LEKKI_HEADMASTER_SUBJECT_ID
      );
    });

    const chemistryQuestions = typedQuestions.filter((q) => {
      const name = getSubjectName(q);
      return (
        name.includes('chemistry') &&
        q.subject_id !== ENGLISH_SUBJECT_ID &&
        q.subject_id !== LEKKI_HEADMASTER_SUBJECT_ID
      );
    });

    const physicsQuestions = typedQuestions.filter((q) => {
      const name = getSubjectName(q);
      return (
        name.includes('physics') &&
        q.subject_id !== ENGLISH_SUBJECT_ID &&
        q.subject_id !== LEKKI_HEADMASTER_SUBJECT_ID
      );
    });

    /*
     * Fallback:
     *
     * If the public question object does not expose
     * subject names, use the expected CBT order.
     *
     * Backend selection already returns:
     *
     * English 50
     * Lekki 10
     * Subject 1 40
     * Subject 2 40
     * Subject 3 40
     */
    if (
      biologyQuestions.length === 0 &&
      chemistryQuestions.length === 0 &&
      physicsQuestions.length === 0
    ) {
      return {
        english: typedQuestions.slice(0, 60),
        biology: typedQuestions.slice(60, 100),
        chemistry: typedQuestions.slice(100, 140),
        physics: typedQuestions.slice(140, 180),
      };
    }

    return {
      english,
      biology: biologyQuestions,
      chemistry: chemistryQuestions,
      physics: physicsQuestions,
    };
  }, [questions, mode]);

  const sectionQuestions: QuestionPublic[] =
    mode === 'cbt' && cbtQuestions
      ? cbtQuestions[activeSection]
      : questions;

  const safeCurrentIndex = Math.min(
    currentIndex,
    Math.max(sectionQuestions.length - 1, 0)
  );

  const currentQuestion =
    sectionQuestions[safeCurrentIndex];

  const answeredCount = Object.keys(answers).length;

  const answeredInCurrentSection = sectionQuestions.filter(
    (q) => !!answers[q.id]
  ).length;

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submitting) return;

      setSubmitting(true);

      try {
        const res = await fetch(
          `/api/exams/${attemptId}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              auto_submitted: autoSubmitted,
            }),
          }
        );

        if (!res.ok) {
          throw new Error('Could not submit exam.');
        }

        router.push(`/results/${attemptId}`);
      } catch (error) {
        console.error('Submit error:', error);
        setSubmitting(false);
      }
    },
    [attemptId, router, submitting]
  );

  const timer = useExamTimer(
    durationSeconds,
    () => handleSubmit(true)
  );

  async function selectAnswer(
    letter: 'A' | 'B' | 'C' | 'D'
  ) {
    if (!currentQuestion || answerLoading) return;

    if (
      mode === 'practice' &&
      feedback[currentQuestion.id]
    ) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: letter,
    }));

    setAnswerLoading(true);

    try {
      const res = await fetch(
        `/api/exams/${attemptId}/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question_id: currentQuestion.id,
            selected_answer: letter,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? 'Could not save answer.'
        );
      }

      if (
        mode === 'practice' &&
        data.correct_answer
      ) {
        setFeedback((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            is_correct: Boolean(data.is_correct),
            correct_answer: data.correct_answer,
            explanation:
              data.explanation ?? null,
          },
        }));
      }
    } catch (error) {
      console.error('Answer error:', error);
    } finally {
      setAnswerLoading(false);
    }
  }

  function goNext() {
    if (
      safeCurrentIndex <
      sectionQuestions.length - 1
    ) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function goPrevious() {
    if (safeCurrentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function changeSection(section: CbtSectionKey) {
    setActiveSection(section);
    setCurrentIndex(0);
  }

  const currentFeedback = currentQuestion
    ? feedback[currentQuestion.id]
    : undefined;

  const isLastQuestion =
    safeCurrentIndex ===
    sectionQuestions.length - 1;

  if (!currentQuestion) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-2xl bg-amber-50 p-6 text-center text-amber-800">
          No questions loaded for this section.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">

        {/* TOP BAR */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-300">
            JAMB CBT
          </div>

          {durationSeconds ? (
            <div
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                timer.isLow
                  ? 'bg-red-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              ⏱ {timer.display}
            </div>
          ) : (
            <div className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
              Untimed
            </div>
          )}
        </div>

        {/* SUBJECT TABS */}
        {mode === 'cbt' && (
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-700">
            {CBT_SECTIONS.map((section) => {
              const active =
                activeSection === section.key;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() =>
                    changeSection(section.key)
                  }
                  className={`whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? 'border-b-4 border-emerald-500 text-emerald-400'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {section.name}
                </button>
              );
            })}
          </div>
        )}

        {/* QUESTION HEADER */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="rounded-full border-2 border-slate-500 px-6 py-3">
            <span className="font-bold">
              Question {safeCurrentIndex + 1}/
              {sectionQuestions.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCalculator((s) => !s)
            }
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            🧮 Calculator
          </button>
        </div>

        {/* QUESTION CARD */}
        <div className="rounded-2xl bg-slate-900 p-5 sm:p-7">

          <p className="mb-7 text-lg font-medium leading-relaxed text-white sm:text-xl">
            {currentQuestion.question_text}
          </p>

          <div className="space-y-4">
            {(['A', 'B', 'C', 'D'] as const).map(
              (letter) => {
                const optionText =
                  currentQuestion[
                    `option_${letter.toLowerCase()}` as
                      | 'option_a'
                      | 'option_b'
                      | 'option_c'
                      | 'option_d'
                  ];

                const isSelected =
                  answers[currentQuestion.id] ===
                  letter;

                const showResult =
                  mode === 'practice' &&
                  !!currentFeedback;

                const isCorrectOption =
                  showResult &&
                  currentFeedback.correct_answer ===
                    letter;

                const isWrongSelected =
                  showResult &&
                  isSelected &&
                  !currentFeedback.is_correct;

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() =>
                      selectAnswer(letter)
                    }
                    disabled={
                      answerLoading ||
                      (mode === 'practice' &&
                        !!currentFeedback)
                    }
                    className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition ${
                      isCorrectOption
                        ? 'border-emerald-500 bg-emerald-900/30'
                        : isWrongSelected
                          ? 'border-red-500 bg-red-900/30'
                          : isSelected
                            ? 'border-emerald-500 bg-emerald-900/20'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-500 text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>

                    <span className="pt-1 text-base leading-relaxed text-slate-100">
                      {optionText}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* PRACTICE FEEDBACK ONLY */}
          {mode === 'practice' &&
            currentFeedback && (
              <div
                className={`mt-6 rounded-xl p-4 ${
                  currentFeedback.is_correct
                    ? 'bg-emerald-900/40 text-emerald-200'
                    : 'bg-red-900/40 text-red-200'
                }`}
              >
                <p className="font-bold">
                  {currentFeedback.is_correct
                    ? '✓ Correct!'
                    : `✗ Incorrect — correct answer: ${currentFeedback.correct_answer}`}
                </p>

                {currentFeedback.explanation && (
                  <div className="mt-3 rounded-lg bg-slate-950/50 p-3 text-sm">
                    <p className="font-semibold">
                      Explanation
                    </p>
                    <p className="mt-1">
                      {currentFeedback.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

          {answerLoading && (
            <p className="mt-4 text-center text-sm text-slate-400">
              Saving answer...
            </p>
          )}
        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrevious}
            disabled={safeCurrentIndex === 0}
            className="rounded-full border-2 border-slate-600 px-5 py-3 font-semibold text-slate-300 disabled:opacity-30"
          >
            ← Previous
          </button>

          <div className="text-sm text-slate-400">
            {answeredInCurrentSection}/
            {sectionQuestions.length}
          </div>

          {!isLastQuestion ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-emerald-600 px-7 py-3 font-bold text-white hover:bg-emerald-500"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setShowConfirm(true)
              }
              className="rounded-full bg-orange-500 px-7 py-3 font-bold text-white hover:bg-orange-400"
            >
              ✓ Submit
            </button>
          )}
        </div>

        {/* OVERALL PROGRESS */}
        <div className="mt-5 text-center text-xs text-slate-500">
          {answeredCount} of {questions.length} answered
        </div>
      </div>

      {/* CALCULATOR */}
      {showCalculator && (
        <div className="fixed bottom-5 right-4 z-[110]">
          <Calculator
            onClose={() =>
              setShowCalculator(false)
            }
          />
        </div>
      )}

      {/* SUBMIT CONFIRMATION */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
            <h3 className="text-xl font-bold">
              Submit your CBT?
            </h3>

            <p className="mt-3 text-sm text-slate-500">
              You have answered {answeredCount} of{' '}
              {questions.length} questions.
            </p>

            {answeredCount <
              questions.length && (
              <p className="mt-2 text-sm font-medium text-amber-700">
                Unanswered questions will be marked
                incorrect.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  setShowConfirm(false)
                }
              >
                Continue
              </Button>

              <Button
                variant="danger"
                fullWidth
                loading={submitting}
                onClick={() =>
                  handleSubmit(false)
                }
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
