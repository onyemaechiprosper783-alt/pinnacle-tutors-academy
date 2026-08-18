'use client';

import {
  useCallback,
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

  const [activeSectionKey, setActiveSectionKey] =
    useState('english');

  /*
   * =====================================================
   * BUILD CBT SECTIONS
   * =====================================================
   *
   * CBT structure:
   *
   * English section:
   *   50 English
   *   10 Lekki Headmaster
   *   TOTAL = 60
   *
   * Then:
   *   Student-selected subject 1 = 40
   *   Student-selected subject 2 = 40
   *   Student-selected subject 3 = 40
   *
   * TOTAL = 180
   *
   * The three additional subjects are NOT hard-coded.
   * They come from the questions supplied to the runner.
   */

  const cbtSections = useMemo<CbtSection[]>(() => {
    if (mode !== 'cbt') {
      return [];
    }

    const typedQuestions =
      questions as QuestionWithSubject[];

    const getSubjectName = (
      question: QuestionWithSubject
    ) => {
      return (
        question.subject_name ??
        question.subject ??
        ''
      )
        .toString()
        .trim();
    };

    /*
     * -----------------------------------------------------
     * ENGLISH
     * -----------------------------------------------------
     */

    const englishQuestions =
      typedQuestions.filter(
        (question) =>
          question.subject_id ===
            ENGLISH_SUBJECT_ID ||
          question.subject_id ===
            LEKKI_HEADMASTER_SUBJECT_ID ||
          getSubjectName(question)
            .toLowerCase()
            .includes('english') ||
          getSubjectName(question)
            .toLowerCase()
            .includes('lekki headmaster')
      );

    /*
     * -----------------------------------------------------
     * OTHER SUBJECTS
     * -----------------------------------------------------
     *
     * Remove English and Lekki Headmaster.
     *
     * Group everything else by subject_id.
     */

    const otherQuestions =
      typedQuestions.filter(
        (question) =>
          question.subject_id !==
            ENGLISH_SUBJECT_ID &&
          question.subject_id !==
            LEKKI_HEADMASTER_SUBJECT_ID &&
          !getSubjectName(question)
            .toLowerCase()
            .includes('english') &&
          !getSubjectName(question)
            .toLowerCase()
            .includes('lekki headmaster')
      );

    const subjectGroups =
      new Map<
        string,
        QuestionWithSubject[]
      >();

    for (const question of otherQuestions) {
      const subjectId =
        question.subject_id ??
        getSubjectName(question);

      if (!subjectId) {
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
     * Keep the actual subject order returned by
     * the challenge paper.
     *
     * Each selected subject should contain 40
     * questions.
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

    const sections: CbtSection[] = [];

    /*
     * English section
     */

    sections.push({
      key: 'english',
      name: 'English',
      count: 60,
      questions:
        englishQuestions.slice(0, 60),
    });

    /*
     * Selected subjects
     */

    otherSubjectGroups.forEach(
      ([subjectId, group], index) => {
        const firstQuestion =
          group[0];

        const subjectName =
          firstQuestion?.subject_name ??
          firstQuestion?.subject ??
          `Subject ${index + 1}`;

        sections.push({
          key: `subject_${index + 1}_${subjectId}`,
          name: subjectName,
          count: 40,
          questions:
            group.slice(0, 40),
        });
      }
    );

    /*
     * -----------------------------------------------------
     * FALLBACK
     * -----------------------------------------------------
     *
     * If subject metadata is unavailable, the API already
     * creates the paper in this order:
     *
     * 0 - 59   English
     * 60 - 99  Subject 1
     * 100-139  Subject 2
     * 140-179  Subject 3
     */

    if (
      sections.length < 4 &&
      typedQuestions.length >= 180
    ) {
      const fallbackSections: CbtSection[] = [
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

      return fallbackSections;
    }

    return sections;
  }, [questions, mode]);

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
      ? activeSection?.questions ?? []
      : (questions as QuestionWithSubject[]);

  /*
   * Keep index within the current section.
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
   * ANSWER COUNT
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

    /*
     * Practice mode locks the question after
     * feedback.
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
       * Only practice mode receives immediate
       * correct/incorrect feedback.
       *
       * CBT and UTME Challenge never expose
       * the correct answer while running.
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

      return;
    }

    /*
     * At the end of a section, move to the
     * next section automatically.
     */

    if (mode === 'cbt') {
      const currentSectionIndex =
        cbtSections.findIndex(
          (section) =>
            section.key ===
            activeSectionKey
        );

      const nextSection =
        cbtSections[
          currentSectionIndex + 1
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
      safeCurrentIndex > 0
    ) {
      setCurrentIndex(
        (index) =>
          index - 1
      );

      return;
    }

    /*
     * If at the beginning of a section,
     * go to the previous section.
     */

    if (mode === 'cbt') {
      const currentSectionIndex =
        cbtSections.findIndex(
          (section) =>
            section.key ===
            activeSectionKey
        );

      const previousSection =
        cbtSections[
          currentSectionIndex - 1
        ];

      if (previousSection) {
        setActiveSectionKey(
          previousSection.key
        );

        setCurrentIndex(
          Math.max(
            previousSection.questions
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
                (value) => !value
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
            ).map((letter) => {
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
                    submitting ||
                    (mode ===
                      'practice' &&
                      !!currentFeedback)
                  }
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
            })}
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

          {/* NAVIGATION */}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={goPrevious}
              disabled={
                submitting ||
                (safeCurrentIndex === 0 &&
                  (mode !== 'cbt' ||
                    !cbtSections[
                      cbtSections.findIndex(
                        (section) =>
                          section.key ===
                          activeSectionKey
                      ) - 1
                    ]))
              }
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            <div className="text-center text-xs text-slate-500">
              {answeredInCurrentSection}/
              {sectionQuestions.length}
              answered
            </div>

            {safeCurrentIndex <
              sectionQuestions.length - 1 ||
            (mode === 'cbt' &&
              cbtSections.findIndex(
                (section) =>
                  section.key ===
                  activeSectionKey
              ) <
                cbtSections.length - 1) ? (
              <button
                type="button"
                onClick={goNext}
                disabled={
                  submitting ||
                  answerLoading
                }
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleSubmit(false)
                }
                disabled={
                  submitting ||
                  answerLoading
                }
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit Exam'}
              </button>
            )}
          </div>
        </div>

        {/* QUESTION NAVIGATOR */}

        {mode === 'cbt' && (
          <div className="mt-5 rounded-2xl bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">
                Question Navigator
              </h3>

              <span className="text-xs text-slate-500">
                {answeredCount}/{questions.length}{' '}
                answered
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {sectionQuestions.map(
                (question, index) => {
                  const answered =
                    !!answers[question.id];

                  const active =
                    index ===
                    safeCurrentIndex;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() =>
                        setCurrentIndex(
                          index
                        )
                      }
                      className={`h-10 rounded-lg text-sm font-semibold transition ${
                        active
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                          : answered
                          ? 'bg-emerald-900 text-emerald-300 hover:bg-emerald-800'
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
        )}

        {/* SUBMIT BUTTON */}

        {mode === 'cbt' && (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-200">
                  Ready to submit?
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  You have answered{' '}
                  {answeredCount} of{' '}
                  {questions.length}{' '}
                  questions.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSubmit(false)
                }
                disabled={
                  submitting ||
                  answerLoading
                }
                className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit Exam'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
                  
              
