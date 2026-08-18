'use client';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';
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

type CbtSectionKey =
  (typeof CBT_SECTIONS)[number]['key'];

type QuestionWithSubject =
  QuestionPublic & {
    subject_id?: string;
    subject_name?: string;
    subject?: string;
  };

export function ExamRunner({
  attemptId,
  mode,
  questions,
  durationSeconds,
}: ExamRunnerProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [answers, setAnswers] = useState<
    Record<string, 'A' | 'B' | 'C' | 'D'>
  >({});

  const [feedback, setFeedback] = useState<
    Record<string, Feedback>
  >({});

  const [answerLoading, setAnswerLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [showCalculator, setShowCalculator] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState<CbtSectionKey>('english');

  /*
   * =====================================================
   * BUILD CBT SECTIONS
   * =====================================================
   *
   * IMPORTANT:
   *
   * Normal JAMB CBT and UTME Challenge both use:
   *
   *     mode = "cbt"
   *
   * A UTME Challenge is identified separately by the
   * attempt's round_id.
   *
   * Therefore we DO NOT create a new mode such as:
   *
   *     mode = "utme_challenge"
   *
   * The same CBT runner handles both.
   *
   * Expected CBT structure:
   *
   * English     = 60
   * Biology     = 40
   * Chemistry   = 40
   * Physics     = 40
   *
   * Total       = 180
   */

  const cbtQuestions = useMemo(() => {
    if (mode !== 'cbt') {
      return null;
    }

    const typedQuestions =
      questions as QuestionWithSubject[];

    /*
     * If there are no questions at all, return empty
     * sections instead of crashing.
     */

    if (typedQuestions.length === 0) {
      return {
        english: [],
        biology: [],
        chemistry: [],
        physics: [],
      };
    }

    const getSubjectName = (
      question: QuestionWithSubject
    ) => {
      return (
        question.subject_name ??
        question.subject ??
        ''
      )
        .toString()
        .toLowerCase()
        .trim();
    };

    /*
     * -----------------------------------------------------
     * TRY SUBJECT-BASED GROUPING FIRST
     * -----------------------------------------------------
     */

    const english =
      typedQuestions.filter(
        (question) =>
          question.subject_id ===
            ENGLISH_SUBJECT_ID ||
          question.subject_id ===
            LEKKI_HEADMASTER_SUBJECT_ID ||
          getSubjectName(question).includes(
            'english'
          ) ||
          getSubjectName(question).includes(
            'lekki headmaster'
          )
      );

    const biology =
      typedQuestions.filter((question) => {
        const name =
          getSubjectName(question);

        return (
          name.includes('biology') &&
          question.subject_id !==
            ENGLISH_SUBJECT_ID &&
          question.subject_id !==
            LEKKI_HEADMASTER_SUBJECT_ID
        );
      });

    const chemistry =
      typedQuestions.filter((question) => {
        const name =
          getSubjectName(question);

        return (
          name.includes('chemistry') &&
          question.subject_id !==
            ENGLISH_SUBJECT_ID &&
          question.subject_id !==
            LEKKI_HEADMASTER_SUBJECT_ID
        );
      });

    const physics =
      typedQuestions.filter((question) => {
        const name =
          getSubjectName(question);

        return (
          name.includes('physics') &&
          question.subject_id !==
            ENGLISH_SUBJECT_ID &&
          question.subject_id !==
            LEKKI_HEADMASTER_SUBJECT_ID
        );
      });

    /*
     * If all four sections were found correctly,
     * use them.
     *
     * We require the expected minimum counts so that
     * an incomplete subject grouping does not create
     * the "No questions loaded for this section"
     * problem.
     */

    if (
      english.length >= 60 &&
      biology.length >= 40 &&
      chemistry.length >= 40 &&
      physics.length >= 40
    ) {
      return {
        english: english.slice(0, 60),
        biology: biology.slice(0, 40),
        chemistry: chemistry.slice(0, 40),
        physics: physics.slice(0, 40),
      };
    }

    /*
     * -----------------------------------------------------
     * FALLBACK 1 — GROUP BY SUBJECT ID
     * -----------------------------------------------------
     *
     * Some API responses may contain subject_id but
     * not subject_name.
     */

    const groups = new Map<
      string,
      QuestionWithSubject[]
    >();

    for (const question of typedQuestions) {
      if (!question.subject_id) {
        continue;
      }

      const existing =
        groups.get(question.subject_id) ?? [];

      existing.push(question);

      groups.set(
        question.subject_id,
        existing
      );
    }

    const subjectGroups =
      Array.from(groups.values());

    /*
     * Find groups large enough to represent the
     * expected sections.
     */

    const possibleEnglish =
      subjectGroups.find(
        (group) => group.length >= 60
      );

    const otherGroups =
      subjectGroups.filter(
        (group) => group !== possibleEnglish
      );

    const possibleBiology =
      otherGroups.find(
        (group) => group.length >= 40
      );

    const remainingAfterBiology =
      otherGroups.filter(
        (group) => group !== possibleBiology
      );

    const possibleChemistry =
      remainingAfterBiology.find(
        (group) => group.length >= 40
      );

    const possiblePhysics =
      remainingAfterBiology.find(
        (group) =>
          group !== possibleChemistry &&
          group.length >= 40
      );

    if (
      possibleEnglish &&
      possibleBiology &&
      possibleChemistry &&
      possiblePhysics
    ) {
      return {
        english:
          possibleEnglish.slice(0, 60),

        biology:
          possibleBiology.slice(0, 40),

        chemistry:
          possibleChemistry.slice(0, 40),

        physics:
          possiblePhysics.slice(0, 40),
      };
    }

    /*
     * -----------------------------------------------------
     * FALLBACK 2 — EXPECTED CBT ORDER
     * -----------------------------------------------------
     *
     * If the API did not return enough subject metadata,
     * use the known 180-question CBT structure.
     *
     * This prevents the UI from becoming stuck on the
     * English tab simply because subject metadata was
     * unavailable.
     *
     * Expected order:
     *
     * 0   - 59   = English
     * 60  - 99   = Biology
     * 100 - 139  = Chemistry
     * 140 - 179  = Physics
     */

    return {
      english: typedQuestions.slice(0, 60),

      biology: typedQuestions.slice(
        60,
        100
      ),

      chemistry: typedQuestions.slice(
        100,
        140
      ),

      physics: typedQuestions.slice(
        140,
        180
      ),
    };
  }, [questions, mode]);

  /*
   * =====================================================
   * CURRENT SECTION
   * =====================================================
   */

  const sectionQuestions: QuestionPublic[] =
    mode === 'cbt' && cbtQuestions
      ? cbtQuestions[activeSection]
      : questions;

  /*
   * Keep the current index safe if the section changes.
   */

  const safeCurrentIndex =
    Math.min(
      currentIndex,
      Math.max(
        sectionQuestions.length - 1,
        0
      )
    );

  const currentQuestion =
    sectionQuestions[
      safeCurrentIndex
    ];

  /*
   * =====================================================
   * ANSWER COUNTS
   * =====================================================
   */

  const answeredCount =
    Object.keys(answers).length;

  const answeredInCurrentSection =
    sectionQuestions.filter(
      (question) =>
        !!answers[question.id]
    ).length;

  /*
   * =====================================================
   * SUBMIT EXAM
   * =====================================================
   */

  const handleSubmit =
    useCallback(
      async (
        autoSubmitted = false
      ) => {
        if (submitting) {
          return;
        }

        setSubmitting(true);

        try {
          const response =
            await fetch(
              `/api/exams/${attemptId}/submit`,
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify({
                  auto_submitted:
                    autoSubmitted,
                }),
              }
            );

          const data =
            await response
              .json()
              .catch(() => null);

          if (!response.ok) {
            throw new Error(
              data?.error ??
                'Could not submit exam.'
            );
          }

          /*
           * IMPORTANT:
           *
           * We always go to the results route after
           * submission.
           *
           * The results API/page determines whether
           * this is:
           *
           * - normal CBT
           * - UTME Challenge
           *
           * UTME Challenge results are hidden there.
           */

          router.push(
            `/results/${attemptId}`
          );
        } catch (error) {
          console.error(
            'Submit error:',
            error
          );

          setSubmitting(false);
        }
      },
      [
        attemptId,
        router,
        submitting,
      ]
    );

  /*
   * =====================================================
   * TIMER
   * =====================================================
   *
   * The start-exam system supplies the duration.
   *
   * For a UTME Challenge this must be the remaining
   * challenge time, not a newly-created timer for every
   * subject.
   */

  const timer =
    useExamTimer(
      durationSeconds,
      () => handleSubmit(true)
    );

  /*
   * =====================================================
   * SELECT ANSWER
   * =====================================================
   */

  async function selectAnswer(
    letter:
      | 'A'
      | 'B'
      | 'C'
      | 'D'
  ) {
    if (
      !currentQuestion ||
      answerLoading ||
      submitting
    ) {
      return;
    }

    /*
     * Practice mode locks the question after
     * feedback is displayed.
     *
     * CBT and UTME Challenge never reveal answers
     * while the exam is running.
     */

    if (
      mode === 'practice' &&
      feedback[currentQuestion.id]
    ) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]:
        letter,
    }));

    setAnswerLoading(true);

    try {
      const response =
        await fetch(
          `/api/exams/${attemptId}/answer`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              question_id:
                currentQuestion.id,
              selected_answer:
                letter,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            'Could not save answer.'
        );
      }

      /*
       * Only practice mode gets immediate feedback.
       */

      if (
        mode === 'practice' &&
        data.correct_answer
      ) {
        setFeedback((previous) => ({
          ...previous,
          [currentQuestion.id]: {
            is_correct: Boolean(
              data.is_correct
            ),
            correct_answer:
              data.correct_answer,
            explanation:
              data.explanation ??
              null,
          },
        }));
      }
    } catch (error) {
      console.error(
        'Answer error:',
        error
      );
    } finally {
      setAnswerLoading(false);
    }
  }

  /*
   * =====================================================
   * NAVIGATION
   * =====================================================
   */

  function goNext() {
    if (
      safeCurrentIndex <
      sectionQuestions.length - 1
    ) {
      setCurrentIndex(
        (index) =>
          index + 1
      );
    }
  }

  function goPrevious() {
    if (
      safeCurrentIndex > 0
    ) {
      setCurrentIndex(
        (index) =>
          index - 1
      );
    }
  }

  function changeSection(
    section: CbtSectionKey
  ) {
    setActiveSection(
      section
    );

    setCurrentIndex(0);
  }

  const currentFeedback =
    currentQuestion
      ? feedback[
          currentQuestion.id
        ]
      : undefined;

  /*
   * =====================================================
   * NO QUESTIONS
   * =====================================================
   */

  if (!currentQuestion) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-2xl bg-amber-50 p-6 text-center text-amber-800">
          <h2 className="text-lg font-bold">
            No questions loaded for
            this section.
          </h2>

          <p className="mt-2 text-sm">
            The challenge could not load
            the questions for this section.
            Please return to the challenge
            and try again.
          </p>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * EXAM UI
   * =====================================================
   */

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
            {CBT_SECTIONS.map(
              (section) => {
                const active =
                  activeSection ===
                  section.key;

                const sectionCount =
                  cbtQuestions?.[
                    section.key
                  ]?.length ?? 0;

                return (
                  <button
                    key={
                      section.key
                    }
                    type="button"
                    onClick={() =>
                      changeSection(
                        section.key
                      )
                    }
                    className={`whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? 'border-b-4 border-emerald-500 text-emerald-400'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {section.name}

                    <span className="ml-1 text-xs opacity-60">
                      ({sectionCount})
                    </span>
                  </button>
                );
              }
            )}
          </div>
        )}

        {/* QUESTION HEADER */}

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="rounded-full border-2 border-slate-500 px-6 py-3">
            <span className="font-bold">
              Question{' '}
              {safeCurrentIndex +
                1}
              /
              {
                sectionQuestions.length
              }
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCalculator(
                (value) =>
                  !value
              )
            }
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            🧮 Calculator
          </button>
        </div>

        {/* QUESTION CARD */}

        <div className="rounded-2xl bg-slate-900 p-5 sm:p-7">

          <p className="mb-7 text-lg font-medium leading-relaxed text-white sm:text-xl">
            {
              currentQuestion.question_text
            }
          </p>

          <div className="space-y-4">
            {(
              [
                'A',
                'B',
                'C',
                'D',
              ] as const
            ).map(
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
                  answers[
                    currentQuestion.id
                  ] === letter;

                const showResult =
                  mode ===
                    'practice' &&
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
                      selectAnswer(
                        letter
                      )
                    }
                    disabled={
                      answerLoading ||
                      (mode ===
                        'practice' &&
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

          {/* PRACTICE FEEDBACK */}

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

        {/* BOTTOM CONTROLS */}

        <div className="mt-5 flex items-center justify-between gap-3">

          <button
            type="button"
            onClick={goPrevious}
            disabled={
              safeCurrentIndex === 0 ||
              submitting
            }
            className="rounded-full border-2 border-slate-600 px-5 py-3 font-semibold text-slate-300 disabled:opacity-30"
          >
            ← Previous
          </button>

          <div className="text-center text-sm text-slate-400">
            {answeredInCurrentSection}/
            {sectionQuestions.length}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={
              safeCurrentIndex ===
                sectionQuestions.length - 1 ||
              submitting
            }
            className="rounded-full bg-emerald-600 px-7 py-3 font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next →
          </button>
        </div>

        {/* SUBMIT BUTTON */}

        <div className="mt-4">
          <button
            type="button"
            onClick={() =>
              setShowConfirm(true)
            }
            disabled={submitting}
            className="w-full rounded-xl bg-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ Submit Exam
          </button>
        </div>

        {/* OVERALL PROGRESS */}

        <div className="mt-4 pb-6 text-center text-xs text-slate-500">
          {answeredCount} of {questions.length}{' '}
          answered
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
              You have answered{' '}
              {answeredCount} of{' '}
              {questions.length}{' '}
              questions.
            </p>

            {answeredCount <
              questions.length && (
              <p className="mt-2 text-sm font-medium text-amber-700">
                Unanswered questions will
                be marked incorrect.
              </p>
            )}

            <div className="mt-6 flex gap-3">

              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  setShowConfirm(false)
                }
                disabled={submitting}
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
