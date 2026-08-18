'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { Calculator } from '@/components/calculator/Calculator';
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
    subjects?: {
      name?: string | null;
    } | null;
    question?: QuestionWithSubject;
  };

interface CbtSection {
  key: string;
  name: string;
  count: number;
  questions: QuestionWithSubject[];
}

interface AttemptResponse {
  attempt?: {
    id: string;
    mode: string;
    status: string;
    started_at: string;
    duration_seconds: number | null;
    config?: {
      challenge?: {
        is_challenge?: boolean;
        round_id?: string | null;
        global_deadline?: string | null;
        activated_at?: string | null;
        total_duration_seconds?: number | null;
        remaining_seconds_at_start?: number | null;
      } | null;
    } | null;
  };

  challenge?: boolean;

  results_hidden?: boolean;

  questions?: Array<
    QuestionWithSubject & {
      question?: QuestionWithSubject;
    }
  >;
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

  const [activeSectionKey, setActiveSectionKey] =
    useState('english');

  /*
   * =====================================================
   * CHALLENGE GLOBAL DEADLINE
   * =====================================================
   *
   * The UTME Challenge does NOT get a new timer when
   * the student refreshes or reopens the page.
   *
   * The real deadline comes from:
   *
   * attempt.config.challenge.global_deadline
   *
   * which was created when the administrator activated
   * the challenge.
   */

  const [challengeDeadline, setChallengeDeadline] =
    useState<string | null>(null);

  const [challengeSecondsLeft, setChallengeSecondsLeft] =
    useState<number | null>(null);

  const [challengeLoading, setChallengeLoading] =
    useState(mode === 'cbt');

  /*
   * =====================================================
   * LOAD AUTHORITATIVE ATTEMPT INFORMATION
   * =====================================================
   */

  useEffect(() => {
    if (mode !== 'cbt') {
      setChallengeLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAttempt() {
      try {
        const response = await fetch(
          `/api/exams/${attemptId}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        const data =
          (await response
            .json()
            .catch(() => null)) as AttemptResponse | null;

        if (
          cancelled ||
          !response.ok ||
          !data
        ) {
          return;
        }

        const config =
          data.attempt?.config;

        const deadline =
          config?.challenge
            ?.global_deadline ?? null;

        /*
         * A challenge is identified by the same
         * backend rule:
         *
         * mode = cbt
         * + round_id/global_deadline
         */

        if (deadline) {
          setChallengeDeadline(deadline);
        }
      } catch (error) {
        console.error(
          'Could not load challenge timing:',
          error
        );
      } finally {
        if (!cancelled) {
          setChallengeLoading(false);
        }
      }
    }

    loadAttempt();

    return () => {
      cancelled = true;
    };
  }, [attemptId, mode]);

  /*
   * =====================================================
   * AUTHORITATIVE CHALLENGE CLOCK
   * =====================================================
   *
   * This clock is based on the actual deadline, NOT on
   * when this React component mounted.
   *
   * Therefore:
   *
   * Administrator activates at 10:00
   * Challenge ends at 12:00
   *
   * Student opens at 11:30
   * Student gets only 30 minutes.
   *
   * Student refreshes at 11:50
   * Student gets only 10 minutes.
   *
   * Student opens after 12:00
   * Submission is triggered immediately.
   */

  const handleSubmitRef = useState<
    (() => void) | null
  >(null);

  /*
   * =====================================================
   * SUBMIT
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
           * Challenge results remain hidden.
           * The submit API handles that.
           */

          router.push(
            `/results/${attemptId}`
          );
        } catch (error) {
          console.error(
            'Submit error:',
            error
          );

          /*
           * If the challenge deadline has already
           * passed, do not allow the student to keep
           * working while retrying.
           */
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
   * Keep the latest submit function available to
   * the deadline timer.
   */

  useEffect(() => {
    handleSubmitRef[1](
      () => {
        void handleSubmit(true);
      }
    );
  }, [handleSubmit]);

  /*
   * =====================================================
   * CHALLENGE DEADLINE TIMER
   * =====================================================
   */

  useEffect(() => {
    if (
      mode !== 'cbt' ||
      !challengeDeadline
    ) {
      return;
    }

    let stopped = false;

    const updateClock = () => {
      if (stopped) {
        return;
      }

      const deadline =
        new Date(
          challengeDeadline
        ).getTime();

      const now =
        Date.now();

      const remainingMs =
        deadline - now;

      const remainingSeconds =
        Math.max(
          0,
          Math.ceil(
            remainingMs / 1000
          )
        );

      setChallengeSecondsLeft(
        remainingSeconds
      );

      if (
        remainingSeconds <= 0
      ) {
        stopped = true;

        /*
         * The challenge has reached the
         * administrator's actual deadline.
         */
        handleSubmitRef[0]?.();
      }
    };

    /*
     * Check immediately.
     */
    updateClock();

    /*
     * Then keep checking every 500ms so the
     * submission happens very close to the
     * real deadline.
     */
    const interval =
      window.setInterval(
        updateClock,
        500
      );

    return () => {
      stopped = true;
      window.clearInterval(
        interval
      );
    };
  }, [
    challengeDeadline,
    mode,
  ]);

  /*
   * =====================================================
   * NORMAL CBT TIMER
   * =====================================================
   *
   * If this is a normal CBT, use the existing
   * useExamTimer.
   *
   * If this is the UTME Challenge, the global
   * deadline timer above is authoritative.
   */

  const normalTimer =
    useExamTimer(
      mode === 'cbt' &&
        challengeDeadline
        ? null
        : durationSeconds,
      () =>
        handleSubmit(true)
    );

  /*
   * =====================================================
   * NORMALIZE QUESTIONS
   * =====================================================
   *
   * The attempt GET endpoint returns:
   *
   * {
   *   question_id,
   *   ...
   *   question: {
   *      subject_id,
   *      subjects: {
   *        name
   *      }
   *   }
   * }
   *
   * while the start endpoint can return flat questions.
   *
   * This converts both formats into one format.
   */

  const normalizedQuestions =
    useMemo<QuestionWithSubject[]>(
      () => {
        return questions.map(
          (
            rawQuestion
          ) => {
            const item =
              rawQuestion as QuestionWithSubject;

            const nested =
              item.question;

            if (nested) {
              return {
                ...nested,
                ...item,

                subject_id:
                  nested.subject_id ??
                  item.subject_id,

                subject_name:
                  nested.subject_name ??
                  item.subject_name,

                subject:
                  nested.subject ??
                  item.subject,

                subjects:
                  nested.subjects ??
                  item.subjects,
              };
            }

            return item;
          }
        );
      },
      [questions]
    );

  /*
   * =====================================================
   * SUBJECT NAME HELPER
   * =====================================================
   */

  const getSubjectName =
    useCallback(
      (
        question: QuestionWithSubject
      ) => {
        const nestedName =
          question.subjects?.name;

        const directName =
          question.subject_name;

        const subjectName =
          question.subject;

        const value =
          nestedName ??
          directName ??
          subjectName ??
          '';

        return String(value)
          .trim();
      },
      []
    );

  /*
   * =====================================================
   * BUILD CBT SECTIONS
   * =====================================================
   *
   * IMPORTANT FIX:
   *
   * We no longer create the displayed names
   * "Subject 1", "Subject 2", "Subject 3"
   * when the actual subject name exists.
   *
   * The actual subject name is taken from:
   *
   * question.subjects.name
   * question.subject_name
   * question.subject
   *
   * The API-created order is also preserved.
   */

  const cbtSections =
    useMemo<CbtSection[]>(
      () => {
        if (mode !== 'cbt') {
          return [];
        }

        const typedQuestions =
          normalizedQuestions;

        /*
         * -------------------------------------------------
         * ENGLISH + LEKKI HEADMASTER
         * -------------------------------------------------
         */

        const englishQuestions =
          typedQuestions.filter(
            (question) => {
              const name =
                getSubjectName(
                  question
                ).toLowerCase();

              return (
                question.subject_id ===
                  ENGLISH_SUBJECT_ID ||
                question.subject_id ===
                  LEKKI_HEADMASTER_SUBJECT_ID ||
                name.includes(
                  'english'
                ) ||
                name.includes(
                  'lekki headmaster'
                )
              );
            }
          );

        /*
         * -------------------------------------------------
         * OTHER SUBJECTS
         * -------------------------------------------------
         */

        const otherQuestions =
          typedQuestions.filter(
            (question) => {
              const name =
                getSubjectName(
                  question
                ).toLowerCase();

              return (
                question.subject_id !==
                  ENGLISH_SUBJECT_ID &&
                question.subject_id !==
                  LEKKI_HEADMASTER_SUBJECT_ID &&
                !name.includes(
                  'english'
                ) &&
                !name.includes(
                  'lekki headmaster'
                )
              );
            }
          );

        /*
         * Group by actual subject ID.
         *
         * This prevents different subjects from
         * being accidentally merged.
         */

        const subjectGroups =
          new Map<
            string,
            QuestionWithSubject[]
          >();

        for (
          const question of
            otherQuestions
        ) {
          const subjectId =
            question.subject_id ??
            getSubjectName(
              question
            );

          if (!subjectId) {
            continue;
          }

          const existing =
            subjectGroups.get(
              subjectId
            ) ?? [];

          existing.push(
            question
          );

          subjectGroups.set(
            subjectId,
            existing
          );
        }

        /*
         * The API already returns the three
         * selected subjects in the correct order.
         *
         * Map preserves insertion order.
         */

        const otherSubjectGroups =
          Array.from(
            subjectGroups.entries()
          )
            .filter(
              ([, group]) =>
                group.length >= 40
            )
            .slice(0, 3);

        const sections: CbtSection[] =
          [];

        /*
         * English section.
         *
         * English = 50
         * Lekki Headmaster = 10
         *
         * Together = 60.
         */

        sections.push({
          key: 'english',
          name: 'English',
          count: 60,
          questions:
            englishQuestions.slice(
              0,
              60
            ),
        });

        /*
         * -------------------------------------------------
         * REAL SUBJECT NAMES
         * -------------------------------------------------
         */

        otherSubjectGroups.forEach(
          (
            [
              subjectId,
              group,
            ],
            index
          ) => {
            const firstQuestion =
              group[0];

            /*
             * THIS is the important part.
             *
             * We use the real subject name.
             *
             * Only if absolutely no subject
             * metadata exists do we fall back
             * to Subject 1/2/3.
             */

            const realName =
              getSubjectName(
                firstQuestion
              );

            const subjectName =
              realName ||
              `Subject ${
                index + 1
              }`;

            sections.push({
              key:
                `subject_${index + 1}_${subjectId}`,

              name:
                subjectName,

              count: 40,

              questions:
                group.slice(
                  0,
                  40
                ),
            });
          }
        );

        /*
         * -------------------------------------------------
         * POSITION-BASED FALLBACK
         * -------------------------------------------------
         *
         * This is only used if subject metadata
         * genuinely cannot be found.
         */

        if (
          sections.length < 4 &&
          typedQuestions.length >= 180
        ) {
          return [
            {
              key: 'english',
              name: 'English',
              count: 60,
              questions:
                typedQuestions.slice(
                  0,
                  60
                ),
            },
            {
              key: 'subject_1',
              name:
                getSubjectName(
                  typedQuestions[60]
                ) ||
                'Subject 1',
              count: 40,
              questions:
                typedQuestions.slice(
                  60,
                  100
                ),
            },
            {
              key: 'subject_2',
              name:
                getSubjectName(
                  typedQuestions[100]
                ) ||
                'Subject 2',
              count: 40,
              questions:
                typedQuestions.slice(
                  100,
                  140
                ),
            },
            {
              key: 'subject_3',
              name:
                getSubjectName(
                  typedQuestions[140]
                ) ||
                'Subject 3',
              count: 40,
              questions:
                typedQuestions.slice(
                  140,
                  180
                ),
            },
          ];
        }

        return sections;
      },
      [
        mode,
        normalizedQuestions,
        getSubjectName,
      ]
    );

  /*
   * =====================================================
   * ACTIVE SECTION
   * =====================================================
   */

  const activeSection =
    mode === 'cbt'
      ? cbtSections.find(
          (section) =>
            section.key ===
            activeSectionKey
        ) ??
        cbtSections[0]
      : null;

  const sectionQuestions: QuestionWithSubject[] =
    mode === 'cbt'
      ? activeSection?.questions ??
        []
      : normalizedQuestions;

  /*
   * Keep current index inside section.
   */

  const safeCurrentIndex =
    Math.min(
      currentIndex,
      Math.max(
        sectionQuestions.length -
          1,
        0
      )
    );

  const currentQuestion =
    sectionQuestions[
      safeCurrentIndex
    ];

  /*
   * =====================================================
   * ANSWER COUNT
   * =====================================================
   */

  const answeredCount =
    Object.keys(
      answers
    ).length;

  const answeredInCurrentSection =
    sectionQuestions.filter(
      (question) =>
        !!answers[
          question.id
        ]
    ).length;

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
     * Challenge deadline protection.
     */

    if (
      mode === 'cbt' &&
      challengeDeadline
    ) {
      const deadline =
        new Date(
          challengeDeadline
        ).getTime();

      if (
        Date.now() >=
        deadline
      ) {
        handleSubmitRef[0]?.();
        return;
      }
    }

    /*
     * Practice mode locks the question
     * after feedback.
     */

    if (
      mode === 'practice' &&
      feedback[
        currentQuestion.id
      ]
    ) {
      return;
    }

    setAnswers(
      (previous) => ({
        ...previous,
        [currentQuestion.id]:
          letter,
      })
    );

    setAnswerLoading(
      true
    );

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
            body: JSON.stringify(
              {
                question_id:
                  currentQuestion.id,

                selected_answer:
                  letter,
              }
            ),
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
       * Practice mode receives immediate
       * feedback.
       *
       * CBT and UTME Challenge remain blind.
       */

      if (
        mode === 'practice' &&
        data.correct_answer
      ) {
        setFeedback(
          (previous) => ({
            ...previous,

            [currentQuestion.id]:
              {
                is_correct:
                  Boolean(
                    data.is_correct
                  ),

                correct_answer:
                  data.correct_answer,

                explanation:
                  data.explanation ??
                  null,
              },
          })
        );
      }
    } catch (error) {
      console.error(
        'Answer error:',
        error
      );
    } finally {
      setAnswerLoading(
        false
      );
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
      sectionQuestions.length -
        1
    ) {
      setCurrentIndex(
        (index) =>
          index + 1
      );

      return;
    }

    if (mode === 'cbt') {
      const currentSectionIndex =
        cbtSections.findIndex(
          (section) =>
            section.key ===
            activeSectionKey
        );

      const nextSection =
        cbtSections[
          currentSectionIndex +
            1
        ];

      if (nextSection) {
        setActiveSectionKey(
          nextSection.key
        );

        setCurrentIndex(0);
      }
    }
  }

  function goPrevious() {
    if (
      safeCurrentIndex >
      0
    ) {
      setCurrentIndex(
        (index) =>
          index - 1
      );

      return;
    }

    if (mode === 'cbt') {
      const currentSectionIndex =
        cbtSections.findIndex(
          (section) =>
            section.key ===
            activeSectionKey
        );

      const previousSection =
        cbtSections[
          currentSectionIndex -
            1
        ];

      if (previousSection) {
        setActiveSectionKey(
          previousSection.key
        );

        setCurrentIndex(
          Math.max(
            previousSection
              .questions
              .length - 1,
            0
          )
        );
      }
    }
  }

  function changeSection(
    sectionKey: string
  ) {
    setActiveSectionKey(
      sectionKey
    );

    setCurrentIndex(0);
  }

  /*
   * =====================================================
   * CURRENT FEEDBACK
   * =====================================================
   */

  const currentFeedback =
    currentQuestion
      ? feedback[
          currentQuestion.id
        ]
      : undefined;

  /*
   * =====================================================
   * DISPLAY TIMER
   * =====================================================
   */

  const displayTimer =
    mode === 'cbt' &&
    challengeDeadline
      ? formatSeconds(
          challengeSecondsLeft ??
            0
        )
      : normalTimer.display;

  const timerIsLow =
    mode === 'cbt' &&
    challengeDeadline
      ? (challengeSecondsLeft ??
          0) <= 300
      : normalTimer.isLow;

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
            No questions loaded.
          </h2>

          <p className="mt-2 text-sm">
            The exam could not load the
            questions for this section.
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
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">

        {/* TOP BAR */}

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-300">
              JAMB CBT
            </div>

            {mode === 'cbt' && (
              <div className="mt-1 text-xs text-slate-500">
                {answeredCount}/
                {questions.length} answered
              </div>
            )}
          </div>

          {mode === 'cbt' &&
          challengeLoading ? (
            <div className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
              Checking time...
            </div>
          ) : (
            <div
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                timerIsLow
                  ? 'bg-red-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              ⏱ {displayTimer}
            </div>
          )}
        </div>

        {/* CBT SUBJECT TABS */}

        {mode === 'cbt' &&
          cbtSections.length > 0 && (
            <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-700">
              {cbtSections.map(
                (section) => {
                  const active =
                    activeSectionKey ===
                    section.key;

                  const answered =
                    section.questions.filter(
                      (question) =>
                        !!answers[
                          question.id
                        ]
                    ).length;

                  return (
                    <button
                      key={section.key}
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
                        {answered}/
                        {section.count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}

        {/* QUESTION HEADER */}

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="rounded-full border-2 border-slate-500 px-5 py-2.5">
            <span className="font-bold">
              Question{' '}
              {safeCurrentIndex + 1}
              /
              {sectionQuestions.length}
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

        {/* CALCULATOR */}

        {showCalculator && (
          <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <Calculator />
          </div>
        )}

        {/* QUESTION CARD */}

        <div className="rounded-2xl bg-slate-900 p-5 sm:p-7">

          <div className="mb-6 flex items-center justify-between">
            <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
              {activeSection?.name ??
                'Question'}
            </span>

            <span className="text-xs text-slate-500">
              {answeredInCurrentSection}/
              {sectionQuestions.length}
              {' '}answered
            </span>
          </div>

          <p className="mb-7 text-lg font-medium leading-relaxed text-white sm:text-xl">
            {currentQuestion.question_text}
          </p>

          {/* OPTIONS */}

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
                  ] ===
                  letter;

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
                      submitting
                    }
                    className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                      isCorrectOption
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : isWrongSelected
                        ? 'border-red-500 bg-red-500/20'
                        : isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                        isCorrectOption
                          ? 'bg-emerald-500 text-white'
                          : isWrongSelected
                          ? 'bg-red-500 text-white'
                          : isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-200'
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

          {mode ===
            'practice' &&
            currentFeedback && (
              <div
                className={`mt-6 rounded-xl border p-4 ${
                  currentFeedback.is_correct
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-red-500/40 bg-red-500/10'
                }`}
              >
                <div className="font-bold">
                  {currentFeedback.is_correct
                    ? 'Correct!'
                    : 'Incorrect'}
                </div>

                {!currentFeedback
                  .is_correct && (
                  <div className="mt-1 text-sm text-slate-300">
                    Correct answer:{' '}
                    <span className="font-bold text-white">
                      {
                        currentFeedback.correct_answer
                      }
                    </span>
                  </div>
                )}

                {currentFeedback.explanation && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {
                      currentFeedback.explanation
                    }
                  </p>
                )}
              </div>
            )}

          {/* NAVIGATION */}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={
                goPrevious
              }
              disabled={
                safeCurrentIndex ===
                  0 &&
                (mode !==
                  'cbt' ||
                  cbtSections.findIndex(
                    (section) =>
                      section.key ===
                      activeSectionKey
                  ) <= 0)
              }
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            {safeCurrentIndex <
              sectionQuestions.length -
                1 ||
            (mode ===
              'cbt' &&
              cbtSections.findIndex(
                (section) =>
                  section.key ===
                  activeSectionKey
              ) <
                cbtSections.length -
                  1) ? (
              <button
                type="button"
                onClick={
                  goNext
                }
                className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-500"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleSubmit(
                    false
                  )
                }
                disabled={
                  submitting
                }
                className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit Exam'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * =======================================================
 * FORMAT SECONDS
 * =======================================================
 */

function formatSeconds(
  seconds: number
): string {
  const safe =
    Math.max(
      0,
      Math.floor(seconds)
    );

  const hours =
    Math.floor(
      safe / 3600
    );

  const minutes =
    Math.floor(
      (safe % 3600) /
        60
    );

  const remaining =
    safe % 60;

  if (hours > 0) {
    return `${String(
      hours
    ).padStart(2, '0')}:${String(
      minutes
    ).padStart(2, '0')}:${String(
      remaining
    ).padStart(2, '0')}`;
  }

  return `${String(
    minutes
  ).padStart(2, '0')}:${String(
    remaining
  ).padStart(2, '0')}`;
}
        
