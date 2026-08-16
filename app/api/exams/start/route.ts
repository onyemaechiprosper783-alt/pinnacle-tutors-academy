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
    'utme_challenge',
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
    .enum(['jamb', 'waec', 'utme', 'general'])
    .optional(),

  year: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional(),

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

const DEFAULT_DURATION: Record<string, number> = {
  cbt: 180 * 60,
  mock: 90 * 60,
  practice: 0,
  utme_challenge: 15 * 60,
};

export async function POST(request: Request) {
  const caller = await getCurrentProfile();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  const parsed = startSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid exam configuration.' },
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

  /*
   * ----------------------------------------------------
   * SPECIAL JAMB CBT
   * ----------------------------------------------------
   *
   * English Language       = 50
   * Lekki Headmaster       = 10
   * Selected Subject 1     = 40
   * Selected Subject 2     = 40
   * Selected Subject 3     = 40
   *
   * TOTAL                   = 180
   */
  const isSpecialCbt =
    mode === 'cbt' &&
    !!cbt_config;

  let questionIds: string[];

  try {
    if (isSpecialCbt) {
      const otherSubjectIds =
        cbt_config.other_subject_ids ?? [];

      if (otherSubjectIds.length !== 3) {
        return NextResponse.json(
          {
            error:
              'CBT requires exactly 3 additional subjects.',
          },
          { status: 400 }
        );
      }

      // English and Lekki Headmaster are automatic.
      // They must not be among the 3 student-selected subjects.
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

      const englishCount =
        cbt_config.english_question_count ?? 50;

      const lekkiCount =
        cbt_config.lekki_headmaster_count ?? 10;

      const otherCount =
        cbt_config.other_subject_question_count ?? 40;

      /*
       * Force the official CBT numbers.
       * The client cannot change them by sending different values.
       */
      if (
        englishCount !== 50 ||
        lekkiCount !== 10 ||
        otherCount !== 40
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid CBT question configuration.',
          },
          { status: 400 }
        );
      }

      const subjectQuestionCounts = [
        {
          subjectId: ENGLISH_SUBJECT_ID,
          count: 50,
        },
        {
          subjectId: LEKKI_HEADMASTER_SUBJECT_ID,
          count: 10,
        },
        {
          subjectId: otherSubjectIds[0],
          count: 40,
        },
        {
          subjectId: otherSubjectIds[1],
          count: 40,
        },
        {
          subjectId: otherSubjectIds[2],
          count: 40,
        },
      ];

      questionIds = await selectQuestions({
        subjectIds: [
          ENGLISH_SUBJECT_ID,
          LEKKI_HEADMASTER_SUBJECT_ID,
          ...otherSubjectIds,
        ],

        mode: 'cbt',

        questionCount: 180,

        subjectQuestionCounts,

        // JAMB CBT questions
        examType: 'jamb',
      });

      if (questionIds.length !== 180) {
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
       * ------------------------------------------------
       * NORMAL EXAM SELECTION
       * ------------------------------------------------
       *
       * Practice, Mock and UTME Challenge continue
       * using the normal filtering system.
       */
      questionIds = await selectQuestions({
        subjectIds: subject_ids,
        mode,
        questionCount: question_count,
        difficulty,
        examType: exam_type,
        year,
      });
    }
  } catch (error) {
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

  if (questionIds.length === 0) {
    return NextResponse.json(
      {
        error:
          'No questions match your selected options. Try another configuration.',
      },
      { status: 404 }
    );
  }

  const admin = createAdminClient();

  /*
   * CBT always uses 180 questions and 180 minutes.
   * Other modes use their normal duration.
   */
  const finalQuestionCount =
    isSpecialCbt ? 180 : question_count;

  const finalDuration =
    isSpecialCbt
      ? 180 * 60
      : duration_seconds ??
        DEFAULT_DURATION[mode];

  /*
   * Store the actual configuration in the attempt.
   */
  const { data: attempt, error: attemptError } =
    await admin
      .from('exam_attempts')
      .insert({
        student_id: caller.id,
        mode,
        subject_ids: isSpecialCbt
          ? [
              ENGLISH_SUBJECT_ID,
              LEKKI_HEADMASTER_SUBJECT_ID,
              ...(cbt_config?.other_subject_ids ?? []),
            ]
          : subject_ids,

        config: {
          question_count: finalQuestionCount,
          difficulty,
          exam_type: isSpecialCbt
            ? 'jamb'
            : exam_type,
          year,
          round_id,

          cbt: isSpecialCbt
            ? {
                english_questions: 50,
                lekki_headmaster_questions: 10,
                questions_per_other_subject: 40,
                other_subject_ids:
                  cbt_config?.other_subject_ids,
                total_questions: 180,
              }
            : null,
        },

        duration_seconds:
          finalDuration || null,

        status: 'in_progress',
      })
      .select(
        'id, started_at, duration_seconds'
      )
      .single();

  if (attemptError || !attempt) {
    return NextResponse.json(
      { error: 'Could not start exam.' },
      { status: 500 }
    );
  }

  /*
   * Create the attempt-question records.
   */
  const attemptQuestionRows =
    questionIds.map((qId, index) => ({
      attempt_id: attempt.id,
      question_id: qId,
      position: index + 1,
    }));

  const {
    error: attemptQuestionsError,
  } = await admin
    .from('attempt_questions')
    .insert(attemptQuestionRows);

  if (attemptQuestionsError) {
    return NextResponse.json(
      {
        error:
          'Could not create exam questions.',
      },
      { status: 500 }
    );
  }

  /*
   * Load the public question data.
   */
  const {
    data: questions,
    error: questionsError,
  } = await admin
    .from('questions_public')
    .select('*')
    .in('id', questionIds);

  if (questionsError) {
    return NextResponse.json(
      {
        error:
          'Could not load exam questions.',
      },
      { status: 500 }
    );
  }

  /*
   * Preserve the randomized order.
   */
  const orderMap = new Map(
    questionIds.map((id, index) => [
      id,
      index,
    ])
  );

  const orderedQuestions =
    (questions ?? []).sort(
      (a, b) =>
        (orderMap.get(a.id) ?? 0) -
        (orderMap.get(b.id) ?? 0)
    );

  return NextResponse.json({
    attempt_id: attempt.id,
    started_at: attempt.started_at,
    duration_seconds:
      attempt.duration_seconds,
    questions: orderedQuestions,
  });
}
