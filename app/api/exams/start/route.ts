import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { selectQuestions } from '@/lib/scoring/selectQuestions';

const ENGLISH_SUBJECT_ID =
  'e5705892-de46-425c-af42-e37a3eddc93d';

const LEKKI_HEADMASTER_SUBJECT_ID =
  '3bca9d00-18fd-4064-b3ac-41da6e7eefa6';

const startSchema = z.object({
  mode: z.enum([
    'practice',
    'mock',
    'cbt',
  ]),

  subject_ids: z
    .array(z.string().uuid())
    .min(1),

  question_count: z
    .number()
    .min(1)
    .max(250)
    .default(20),

  duration_seconds: z
    .number()
    .min(60)
    .max(4 * 60 * 60)
    .optional(),

  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .optional(),

  exam_type: z
    .enum([
      'jamb',
      'waec',
      'utme',
      'general',
    ])
    .optional(),

  year: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional(),

  /*
   * A challenge round can be supplied
   * while the actual exam mode remains CBT.
   */
  round_id: z
    .string()
    .uuid()
    .optional(),

  cbt_config: z
    .object({
      english_question_count: z
        .number()
        .int()
        .min(1)
        .optional(),

      lekki_headmaster_count: z
        .number()
        .int()
        .min(1)
        .optional(),

      other_subject_question_count: z
        .number()
        .int()
        .min(1)
        .optional(),

      other_subject_ids: z
        .array(z.string().uuid())
        .length(3)
        .optional(),
    })
    .optional(),
});

const DEFAULT_DURATION: Record<
  string,
  number
> = {
  cbt: 120 * 60,
  mock: 90 * 60,
  practice: 0,
};

export async function POST(
  request: Request
) {
  const caller =
    await getCurrentProfile();

  if (!caller) {
    return NextResponse.json(
      {
        error: 'Not authorized.',
      },
      { status: 401 }
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  const parsed =
    startSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Invalid exam configuration.',
      },
      { status: 400 }
    );
  }

  const {
    mode,
    subject_ids,
    question_count,
    duration_seconds,
    difficulty,
    exam_type,
    year,
    round_id,
    cbt_config,
  } = parsed.data;

  const admin =
    createAdminClient();

  /*
   * ====================================================
   * DETECT SPECIAL JAMB CBT / UTME CHALLENGE
   * ====================================================
   *
   * The challenge uses CBT mode.
   *
   * Therefore:
   *
   * mode === 'cbt'
   *
   * and a round_id means this CBT attempt
   * belongs to a challenge round.
   */
  const isChallenge =
    mode === 'cbt' &&
    !!round_id;

  const isSpecialCbt =
    mode === 'cbt' &&
    !!cbt_config;

  /*
   * ====================================================
   * CHALLENGE ROUND TIME
   * ====================================================
   *
   * The challenge timer starts when the
   * administrator activates the round.
   *
   * It does NOT restart when the student
   * opens the exam.
   */
  let challengeRound:
    | {
        id: string;
        title: string;
        is_active: boolean;
        activated_at: string | null;
        closes_at: string | null;
        duration_seconds:
          | number
          | null;
      }
    | null = null;

  let challengeRemainingSeconds:
    | number
    | null = null;

  if (isChallenge) {
    const {
      data: round,
      error: roundError,
    } = await admin
      .from('challenge_rounds')
      .select(`
        id,
        title,
        is_active,
        activated_at,
        closes_at,
        duration_seconds
      `)
      .eq('id', round_id)
      .single();

    if (
      roundError ||
      !round
    ) {
      console.error(
        'Challenge round lookup error:',
        roundError
      );

      return NextResponse.json(
        {
          error:
            'Challenge round not found.',
        },
        { status: 404 }
      );
    }

    challengeRound = round;

    if (!round.is_active) {
      return NextResponse.json(
        {
          error:
            'This challenge has not been activated yet.',
        },
        { status: 400 }
      );
    }

    if (!round.activated_at) {
      return NextResponse.json(
        {
          error:
            'This challenge does not have an activation time.',
        },
        { status: 400 }
      );
    }

    /*
     * GLOBAL CHALLENGE CLOCK
     */
    const activatedAt =
      new Date(
        round.activated_at
      ).getTime();

    const now =
      Date.now();

    const elapsedSeconds =
      Math.floor(
        (now - activatedAt) /
          1000
      );

    const totalChallengeSeconds =
      round.duration_seconds ||
      120 * 60;

    const remainingSeconds =
      totalChallengeSeconds -
      elapsedSeconds;

    /*
     * Challenge has already ended.
     */
    if (remainingSeconds <= 0) {
      return NextResponse.json(
        {
          error:
            'The challenge time has already ended.',
        },
        { status: 400 }
      );
    }

    challengeRemainingSeconds =
      remainingSeconds;
  }

  let questionIds: string[] = [];

  /*
   * ====================================================
   * SPECIAL JAMB CBT
   * ====================================================
   *
   * 60 English
   *   - 50 English
   *   - 10 Lekki Headmaster
   *
   * 40 Subject 1
   * 40 Subject 2
   * 40 Subject 3
   *
   * TOTAL = 180
   */
  try {
    if (isSpecialCbt) {
      const otherSubjectIds =
        cbt_config
          ?.other_subject_ids ??
        [];

      if (
        otherSubjectIds.length !== 3
      ) {
        return NextResponse.json(
          {
            error:
              'CBT requires exactly 3 additional subjects.',
          },
          { status: 400 }
        );
      }

      if (
        otherSubjectIds.includes(
          ENGLISH_SUBJECT_ID
        ) ||
        otherSubjectIds.includes(
          LEKKI_HEADMASTER_SUBJECT_ID
        )
      ) {
        return NextResponse.json(
          {
            error:
              'English Language and Lekki Headmaster are automatically included. Please select 3 other subjects.',
          },
          { status: 400 }
        );
      }

      const requestedEnglish =
        cbt_config
          ?.english_question_count ??
        60;

      const lekkiCount =
        cbt_config
          ?.lekki_headmaster_count ??
        10;

      const otherCount =
        cbt_config
          ?.other_subject_question_count ??
        40;

      /*
       * The 60 English section is:
       *
       * 50 English
       * 10 Lekki Headmaster
       */
      if (
        requestedEnglish !== 50 &&
        requestedEnglish !== 60
      ) {
        return NextResponse.json(
          {
            error:
              'English CBT configuration must be 60 questions total (50 English + 10 Lekki Headmaster).',
          },
          { status: 400 }
        );
      }

      if (lekkiCount !== 10) {
        return NextResponse.json(
          {
            error:
              'Lekki Headmaster must contain exactly 10 questions.',
          },
          { status: 400 }
        );
      }

      if (otherCount !== 40) {
        return NextResponse.json(
          {
            error:
              'Each additional subject must contain exactly 40 questions.',
          },
          { status: 400 }
        );
      }

      const subjectQuestionCounts =
        [
          {
            subjectId:
              ENGLISH_SUBJECT_ID,
            count: 50,
          },
          {
            subjectId:
              LEKKI_HEADMASTER_SUBJECT_ID,
            count: 10,
          },
          {
            subjectId:
              otherSubjectIds[0],
            count: 40,
          },
          {
            subjectId:
              otherSubjectIds[1],
            count: 40,
          },
          {
            subjectId:
              otherSubjectIds[2],
            count: 40,
          },
        ];

      questionIds =
        await selectQuestions({
          subjectIds: [
            ENGLISH_SUBJECT_ID,
            LEKKI_HEADMASTER_SUBJECT_ID,
            ...otherSubjectIds,
          ],

          mode: 'cbt',

          questionCount: 180,

          subjectQuestionCounts,

          examType: 'jamb',
        });

      if (
        questionIds.length !==
        180
      ) {
        return NextResponse.json(
          {
            error:
              `CBT could not create exactly 180 questions. Only ${questionIds.length} were selected.`,
          },
          { status: 404 }
        );
      }
    } else {
      /*
       * ==================================================
       * NORMAL EXAMS
       * ==================================================
       */

      questionIds =
        await selectQuestions({
          subjectIds:
            subject_ids,

          mode,

          questionCount:
            question_count,

          difficulty,

          examType:
            exam_type,

          year,
        });
    }
  } catch (error) {
    console.error(
      'Question selection error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not load questions.',
      },
      { status: 404 }
    );
  }

  if (
    questionIds.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          'No questions match your selected options. Try another configuration.',
      },
      { status: 404 }
    );
  }

  /*
   * ====================================================
   * LOAD PUBLIC QUESTIONS
   * ====================================================
   */

  const {
    data: questions,
    error: questionsError,
  } =
    await admin
      .from('questions_public')
      .select('*')
      .in('id', questionIds);

  if (questionsError) {
    console.error(
      'Questions load error:',
      questionsError
    );

    return NextResponse.json(
      {
        error:
          'Could not load exam questions.',
      },
      { status: 500 }
    );
  }

  if (
    !questions ||
    questions.length !==
      questionIds.length
  ) {
    return NextResponse.json(
      {
        error:
          'Some selected questions could not be loaded.',
      },
      { status: 500 }
    );
  }

  /*
   * ====================================================
   * ORDER QUESTIONS
   * ====================================================
   */

  let orderedQuestions =
    [...questions];

  if (
    isSpecialCbt &&
    cbt_config
  ) {
    const otherSubjectIds =
      cbt_config
        .other_subject_ids ??
      [];

    const englishQuestions =
      questions.filter(
        (q) =>
          q.subject_id ===
          ENGLISH_SUBJECT_ID
      );

    const lekkiQuestions =
      questions.filter(
        (q) =>
          q.subject_id ===
          LEKKI_HEADMASTER_SUBJECT_ID
      );

    const subject1Questions =
      questions.filter(
        (q) =>
          q.subject_id ===
          otherSubjectIds[0]
      );

    const subject2Questions =
      questions.filter(
        (q) =>
          q.subject_id ===
          otherSubjectIds[1]
      );

    const subject3Questions =
      questions.filter(
        (q) =>
          q.subject_id ===
          otherSubjectIds[2]
      );

    if (
      englishQuestions.length !== 50 ||
      lekkiQuestions.length !== 10 ||
      subject1Questions.length !== 40 ||
      subject2Questions.length !== 40 ||
      subject3Questions.length !== 40
    ) {
      return NextResponse.json(
        {
          error:
            'CBT could not organize the required questions by subject.',
        },
        { status: 500 }
      );
    }

    orderedQuestions = [
      ...englishQuestions,
      ...lekkiQuestions,
      ...subject1Questions,
      ...subject2Questions,
      ...subject3Questions,
    ];
  } else {
    const orderMap =
      new Map(
        questionIds.map(
          (id, index) => [
            id,
            index,
          ]
        )
      );

    orderedQuestions.sort(
      (a, b) =>
        (orderMap.get(
          a.id
        ) ?? 0) -
        (orderMap.get(
          b.id
        ) ?? 0)
    );
  }

  /*
   * ====================================================
   * FINAL CONFIGURATION
   * ====================================================
   */

  const finalQuestionCount =
    isSpecialCbt
      ? 180
      : question_count;

  /*
   * Challenge:
   * use the remaining global round time.
   *
   * Normal CBT:
   * use 120 minutes.
   */
  const finalDuration =
    isChallenge
      ? challengeRemainingSeconds!
      : isSpecialCbt
      ? 120 * 60
      : duration_seconds ??
        DEFAULT_DURATION[mode];

  /*
   * ====================================================
   * CREATE EXAM ATTEMPT
   * ====================================================
   */

  const {
    data: attempt,
    error: attemptError,
  } = await admin
    .from('exam_attempts')
    .insert({
      student_id:
        caller.id,

      /*
       * IMPORTANT:
       *
       * The UTME Challenge is STILL
       * stored as CBT mode.
       */
      mode: 'cbt',

      subject_ids:
        isSpecialCbt
          ? [
              ENGLISH_SUBJECT_ID,
              LEKKI_HEADMASTER_SUBJECT_ID,
              ...(cbt_config
                ?.other_subject_ids ??
                []),
            ]
          : subject_ids,

      config: {
        question_count:
          finalQuestionCount,

        difficulty,

        exam_type:
          isSpecialCbt
            ? 'jamb'
            : exam_type,

        year,

        round_id,

        /*
         * =================================================
         * CHALLENGE CONFIG
         * =================================================
         */
        challenge:
          isChallenge
            ? {
                is_challenge:
                  true,

                round_id:
                  challengeRound
                    ?.id,

                title:
                  challengeRound
                    ?.title,

                activated_at:
                  challengeRound
                    ?.activated_at,

                total_duration_seconds:
                  challengeRound
                    ?.duration_seconds ??
                  120 * 60,

                remaining_seconds_at_start:
                  challengeRemainingSeconds,

                global_deadline:
                  new Date(
                    new Date(
                      challengeRound!
                        .activated_at!
                    ).getTime() +
                      (challengeRound!
                        .duration_seconds ??
                        120 * 60) *
                        1000
                  ).toISOString(),
              }
            : null,

        /*
         * =================================================
         * CBT CONFIG
         * =================================================
         */
        cbt: isSpecialCbt
          ? {
              is_challenge:
                isChallenge,

              round_id:
                isChallenge
                  ? challengeRound
                      ?.id
                  : null,

              english_questions:
                50,

              lekki_headmaster_questions:
                10,

              english_section_total:
                60,

              questions_per_other_subject:
                40,

              other_subject_ids:
                cbt_config
                  ?.other_subject_ids,

              total_questions:
                180,

              duration_minutes:
                120,

              sections: [
                {
                  key: 'english',
                  label: 'English',
                  question_count:
                    60,
                },
                {
                  key: 'subject_1',
                  subject_id:
                    cbt_config
                      ?.other_subject_ids?.[0],
                  question_count:
                    40,
                },
                {
                  key: 'subject_2',
                  subject_id:
                    cbt_config
                      ?.other_subject_ids?.[1],
                  question_count:
                    40,
                },
                {
                  key: 'subject_3',
                  subject_id:
                    cbt_config
                      ?.other_subject_ids?.[2],
                  question_count:
                    40,
                },
              ],
            }
          : null,
      },

      duration_seconds:
        finalDuration,

      status:
        'in_progress',
    })
    .select(
      'id, started_at, duration_seconds'
    )
    .single();

  if (
    attemptError ||
    !attempt
  ) {
    console.error(
      'Attempt creation error:',
      attemptError
    );

    return NextResponse.json(
      {
        error:
          'Could not start exam.',
      },
      { status: 500 }
    );
  }

  /*
   * ====================================================
   * CREATE ATTEMPT QUESTIONS
   * ====================================================
   */

  const attemptQuestionRows =
    orderedQuestions.map(
      (
        question,
        index
      ) => ({
        attempt_id:
          attempt.id,

        question_id:
          question.id,

        position:
          index + 1,
      })
    );

  const {
    error:
      attemptQuestionsError,
  } = await admin
    .from('attempt_questions')
    .insert(
      attemptQuestionRows
    );

  if (
    attemptQuestionsError
  ) {
    console.error(
      'Attempt questions error:',
      attemptQuestionsError
    );

    return NextResponse.json(
      {
        error:
          'Could not create exam questions.',
      },
      { status: 500 }
    );
  }

  /*
   * ====================================================
   * CBT SECTIONS
   * ====================================================
   */

  const cbtSections =
    isSpecialCbt
      ? [
          {
            key: 'english',
            label: 'English',
            start: 0,
            count: 60,
          },
          {
            key: 'subject_1',
            label: 'Subject 1',
            start: 60,
            count: 40,
            subject_id:
              cbt_config
                ?.other_subject_ids?.[0],
          },
          {
            key: 'subject_2',
            label: 'Subject 2',
            start: 100,
            count: 40,
            subject_id:
              cbt_config
                ?.other_subject_ids?.[1],
          },
          {
            key: 'subject_3',
            label: 'Subject 3',
            start: 140,
            count: 40,
            subject_id:
              cbt_config
                ?.other_subject_ids?.[2],
          },
        ]
      : [];

  /*
   * ====================================================
   * RESPONSE
   * ====================================================
   */

  return NextResponse.json({
    attempt_id:
      attempt.id,

    started_at:
      attempt.started_at,

    duration_seconds:
      attempt.duration_seconds,

    /*
     * Challenge information is returned,
     * but the exam itself remains CBT.
     */
    challenge:
      isChallenge
        ? {
            is_challenge:
              true,

            round_id:
              challengeRound
                ?.id,

            activated_at:
              challengeRound
                ?.activated_at,

            total_duration_seconds:
              challengeRound
                ?.duration_seconds 
              ??
              120 * 60,

            remaining_seconds:
              challengeRemainingSeconds,

            global_deadline:
              new Date(
                new Date(
                  challengeRound!
                    .activated_at!
                ).getTime() +
                  (challengeRound!
                    .duration_seconds ??
                    120 * 60) *
                    1000
              ).toISOString(),
          }
        : null,

    questions:
      orderedQuestions,

    cbt:
      isSpecialCbt
        ? {
            is_challenge:
              isChallenge,

            round_id:
              isChallenge
                ? challengeRound
                    ?.id
                : null,

            total_questions:
              180,

            duration_minutes:
              120,

            sections:
              cbtSections,
          }
        : null,
  });
}
