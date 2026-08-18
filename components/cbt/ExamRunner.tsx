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

type QuestionWithSubject =
  QuestionPublic & {
    subject_id?: string;
    subject_name?: string;
    subject?: string;
  };

interface CbtSection {
  key: string;
  name: string;
  count: number;
  questions: QuestionWithSubject[];
}

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
    useState(0);

  /*
   * =====================================================
   * BUILD CBT SECTIONS
   * =====================================================
   *
   * UTME CHALLENGE:
   *
   * 50 English
   * 10 Lekki Headmaster
   * 40 Student Subject 1
   * 40 Student Subject 2
   * 40 Student Subject 3
   *
   * TOTAL = 180
   *
   * The three additional subjects are NOT hard-coded.
   * They come from the student's selected CBT paper.
   */

  const cbtSections = useMemo<
    CbtSection[]
  >(() => {
    if (mode !== 'cbt') {
      return [];
    }

    const typedQuestions =
      questions as QuestionWithSubject[];

    if (typedQuestions.length === 0) {
      return [];
    }

    /*
     * -----------------------------------------------------
     * ENGLISH + LEKKI HEADMASTER
     * -----------------------------------------------------
     *
     * They occupy the first 60 questions in the locked
     * UTME Challenge paper.
     */

    const englishQuestions =
      typedQuestions.filter(
        (question) =>
          question.subject_id ===
          ENGLISH_SUBJECT_ID
      );

    const lekkiQuestions =
      typedQuestions.filter(
        (question) =>
          question.subject_id ===
          LEKKI_HEADMASTER_SUBJECT_ID
      );

    /*
     * -----------------------------------------------------
     * FIND THE THREE STUDENT SUBJECTS
     * -----------------------------------------------------
     */

    const subjectGroups =
      new Map<
        string,
        QuestionWithSubject[]
      >();

    for (const question of typedQuestions) {
      const subjectId =
        question.subject_id;

      if (
        !subjectId ||
        subjectId ===
          ENGLISH_SUBJECT_ID ||
        subjectId ===
          LEKKI_HEADMASTER_SUBJECT_ID
      ) {
        continue;
      }

      const existing =
        subjectGroups.get(subjectId) ??
        [];

      existing.push(question);

      subjectGroups.set(
        subjectId,
        existing
      );
    }

    /*
     * The API locks the paper in this order:
     *
     * English
     * Lekki Headmaster
     * Student Subject 1
     * Student Subject 2
     * Student Subject 3
     *
     * We preserve the order in which the subject groups
     * first appear in the returned question list.
     */

    const orderedSubjectIds: string[] = [];

    for (const question of typedQuestions) {
      const subjectId =
        question.subject_id;

      if (
        !subjectId ||
        subjectId ===
          ENGLISH_SUBJECT_ID ||
        subjectId ===
          LEKKI_HEADMASTER_SUBJECT_ID
      ) {
        continue;
      }

      if (
        !orderedSubjectIds.includes(
          subjectId
        )
      ) {
        orderedSubjectIds.push(
          subjectId
        );
      }
    }

    const additionalSubjects =
      orderedSubjectIds
        .slice(0, 3)
        .map((subjectId) => {
          const grouped =
            subjectGroups.get(
              subjectId
            ) ?? [];

          const first =
            grouped[0];

          const name =
            first?.subject_name ??
            first?.subject ??
            `Subject ${orderedSubjectIds.indexOf(subjectId) + 1}`;

          return {
            subjectId,
            name: String(name),
            questions:
              grouped.slice(0, 40),
          };
        });

    /*
     * -----------------------------------------------------
     * FALLBACK FOR MISSING SUBJECT METADATA
     * -----------------------------------------------------
     *
     * The challenge API already creates the questions in
     * the correct order. If subject metadata is missing,
     * use the locked 180-question order instead of showing
     * "No questions loaded".
     */

    if (
      englishQuestions.length !== 50 ||
      lekkiQuestions.length !== 10 ||
      additionalSubjects.length !== 3
    ) {
      return [
        {
          key: 'english',
          name: 'English',
          count: 60,
          questions:
            typedQuestions.slice(0, 60),
        },
        {
          key: 'subject_1',
          name: 'Subject 1',
          count: 40,
          questions:
            typedQuestions.slice(60, 100),
        },
        {
          key: 'subject_2',
          name: 'Subject 2',
          count: 40,
          questions:
            typedQuestions.slice(100, 140),
        },
        {
          key: 'subject_3',
          name: 'Subject 3',
          count: 40,
          questions:
            typedQuestions.slice(140, 180),
        },
      ];
    }

    /*
     * -----------------------------------------------------
     * NORMAL CORRECT CBT STRUCTURE
     * -----------------------------------------------------
     */

    return [
      {
        key: 'english',
        name: 'English',
        count: 60,
        questions: [
          ...englishQuestions.slice(0, 50),
          ...lekkiQuestions.slice(0, 10),
        ],
      },
      {
        key: 'subject_1',
        name:
          additionalSubjects[0].name,
        count: 40,
        questions:
          additionalSubjects[0].questions,
      },
      {
        key: 'subject_2',
        name:
          additionalSubjects[1].name,
        count: 40,
        questions:
          additionalSubjects[1].questions,
      },
      {
        key: 'subject_3',
        name:
          additionalSubjects[2].name,
        count: 40,
        questions:
          additionalSubjects[2].questions,
      },
    ];
  }, [questions, mode]);

  /*
   * =====================================================
   * CURRENT SECTION
   * =====================================================
   */

  const sectionQuestions: QuestionWithSubject[] =
    mode === 'cbt'
      ? cbtSections[
          activeSection
        ]?.questions ?? []
      : (questions as QuestionWithSubject[]);

  /*
   * Keep the question index inside the current section.
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
    sectionIndex: number
  ) {
    setActiveSection(
      sectionIndex
    );

    setCurrentIndex(0);
  }

  const currentFeedback =
    currentQuestion
      ? feedback[
          currentQuestion.id
        ]
      : undefined;
                      className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                      isCorrectOption
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : isWrongSelected
                        ? 'border-red-500 bg-red-500/10'
                        : isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                        isCorrectOption
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isWrongSelected
                          ? 'border-red-500 bg-red-500 text-white'
                          : isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-600 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {letter}
                    </span>

                    <span className="flex-1 pt-1 text-sm leading-relaxed text-slate-100 sm:text-base">
                      {optionText}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* PRACTICE FEEDBACK */}

          {currentFeedback &&
            mode === 'practice' && (
              <div
                className={`mt-6 rounded-xl p-4 ${
                  currentFeedback.is_correct
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-red-500/10 text-red-300'
                }`}
              >
                <p className="font-bold">
                  {currentFeedback.is_correct
                    ? 'Correct!'
                    : `Incorrect. Correct answer: ${currentFeedback.correct_answer}`}
                </p>

                {currentFeedback.explanation && (
                  <p className="mt-2 text-sm leading-relaxed">
                    {currentFeedback.explanation}
                  </p>
                )}
              </div>
            )}
        </div>

        {/* NAVIGATION */}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={goPrevious}
            disabled={
              safeCurrentIndex === 0 ||
              submitting
            }
          >
            Previous
          </Button>

          <span className="text-sm text-slate-400">
            {answeredInCurrentSection}/
            {sectionQuestions.length} answered
          </span>

          {safeCurrentIndex <
          sectionQuestions.length - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={submitting}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() =>
                setShowConfirm(true)
              }
              loading={submitting}
            >
              Submit Exam
            </Button>
          )}
        </div>

        {/* QUESTION NAVIGATOR */}

        <div className="mt-6 rounded-2xl bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">
              Questions
            </p>

            <p className="text-xs text-slate-500">
              {answeredCount}/{questions.length}
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {sectionQuestions.map(
              (question, index) => {
                const answered =
                  !!answers[question.id];

                const active =
                  index === safeCurrentIndex;

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() =>
                      setCurrentIndex(index)
                    }
                    className={`h-9 rounded-lg text-xs font-bold transition ${
                      active
                        ? 'bg-emerald-500 text-white'
                        : answered
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* CALCULATOR */}

        {showCalculator && (
          <div className="fixed bottom-4 right-4 z-50">
            <Calculator />
          </div>
        )}

        {/* SUBMIT CONFIRMATION */}

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
              <h2 className="text-xl font-bold">
                Submit Exam?
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                You have answered{' '}
                <strong>
                  {answeredCount}
                </strong>{' '}
                out of{' '}
                <strong>
                  {questions.length}
                </strong>{' '}
                questions.
              </p>

              {answeredCount <
                questions.length && (
                <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  You still have unanswered
                  questions. Are you sure you
                  want to submit?
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setShowConfirm(false)
                  }
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    handleSubmit(false);
                  }}
                  loading={submitting}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
