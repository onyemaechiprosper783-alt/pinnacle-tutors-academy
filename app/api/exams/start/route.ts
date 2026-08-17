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
  cbt: 120 * 60,
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

  const isSpecialCbt =
    mode === 'cbt' && !!cbt_config;

  let questionIds: string[] = [];

  /*
   * ====================================================
   * SPECIAL JAMB CBT
   * ====================================================
   *
   * English Language       = 50
   * Lekki Headmaster       = 10
   * Subject 1              = 40
   * Subject 2              = 40
   * Subject 3              = 40
   *
   * TOTAL                  = 180
   *
   * TIME                   = 120 MINUTES
   * ====================================================
   */

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

      /*
       * English and Lekki Headmaster are automatic.
       */
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

      /*
       * The client may send English as 60 because the
       * screen displays English = 60 total.
       *
       * Internally this means:
       *
       * 50 normal English
       * +
       * 10 Lekki Headmaster
       *
       * Therefore both 50 and 60 are accepted here.
       */
      const requestedEnglish =
        cbt_config.english_question_count ?? 60;

      const lekkiCount =
        cbt_config.lekki_headmaster_count ?? 10;

      const otherCount =
        cbt_config.other_subject_question_count ?? 40;

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

      /*
       * Select exact numbers for every subject.
       */
      const subjectQuestionCounts = [
        {
          subjectId: ENGLISH_SUBJECT_ID,
          count: 50,
        },
        {
          subjectId:
            LEKKI_HEADMASTER_SUBJECT_ID,
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

      /*
       * IMPORTANT:
       *
       * selectQuestions normally shuffles everything.
       *
       * We now load the questions and arrange them into
       * CBT sections:
       *
       * English + Lekki
       * Subject 1
       * Subject 2
       * Subject 3
       */
    } else {
      /*
       * ==================================================
       * NORMAL EXAMS
       * ==================================================
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
   * ====================================================
   * LOAD PUBLIC QUESTIONS
   * ====================================================
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

  if (!questions || questions.length !== questionIds.length) {
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
   * CREATE ORDER
   * ====================================================
   *
   * CBT order:
   *
   * 1 - 50   English
   * 51 - 60  Lekki Headmaster
   * 61 - 100 Subject 1
   * 101-140  Subject 2
   * 141-180  Subject 3
   *
   * The UI will later display these as:
   *
   * English | Biology | Chemistry | Physics
   *
   * instead of a 1-180 question grid.
   */

  let orderedQuestions = [...questions];

  if (isSpecialCbt && cbt_config) {
    const otherSubjectIds =
      cbt_config.other_subject_ids ?? [];

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
    /*
     * Preserve the randomized order returned by
     * selectQuestions for normal exams.
     */
    const orderMap = new Map(
      questionIds.map((id, index) => [
        id,
        index,
      ])
    );

    orderedQuestions.sort(
      (a, b) =>
        (orderMap.get(a.id) ?? 0) -
        (orderMap.get(b.id) ?? 0)
    );
  }

  /*
   * ====================================================
   * FINAL CBT CONFIGURATION
   * ====================================================
   */

  const finalQuestionCount =
    isSpecialCbt ? 180 : question_count;

  const finalDuration =
    isSpecialCbt
      ? 120 * 60
      : duration_seconds ??
        DEFAULT_DURATION[mode];

  /*
   * ====================================================
   * CREATE EXAM ATTEMPT
   * ====================================================
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
          question_count:
            finalQuestionCount,

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

                english_section_total: 60,

                questions_per_other_subject: 40,

                other_subject_ids:
                  cbt_config?.other_subject_ids,

                total_questions: 180,

                duration_minutes: 120,

                sections: [
                  {
                    key: 'english',
                    label: 'English',
                    question_count: 60,
                  },
                  {
                    key: 'subject_1',
                    subject_id:
                      cbt_config?.other_subject_ids?.[0],
                    question_count: 40,
                  },
                  {
                    key: 'subject_2',
                    subject_id:
                      cbt_config?.other_subject_ids?.[1],
                    question_count: 40,
                  },
                  {
                    key: 'subject_3',
                    subject_id:
                      cbt_config?.other_subject_ids?.[2],
                    question_count: 40,
                  },
                ],
              }
            : null,
        },

        duration_seconds:
          finalDuration,

        status: 'in_progress',
      })
      .select(
        'id, started_at, duration_seconds'
      )
      .single();

  if (attemptError || !attempt) {
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
      (question, index) => ({
        attempt_id: attempt.id,
        question_id: question.id,
        position: index + 1,
      })
    );

  const {
    error: attemptQuestionsError,
  } = await admin
    .from('attempt_questions')
    .insert(
      attemptQuestionRows
    );

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
   * ====================================================
   * RETURN CBT DATA
   * ====================================================
   */

  const cbtSections = isSpecialCbt
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
            cbt_config?.other_subject_ids?.[0],
        },
        {
          key: 'subject_2',
          label: 'Subject 2',
          start: 100,
          count: 40,
          subject_id:
            cbt_config?.other_subject_ids?.[1],
        },
        {
          key: 'subject_3',
          label: 'Subject 3',
          start: 140,
          count: 40,
          subject_id:
            cbt_config?.other_subject_ids?.[2],
        },
      ]
    : [];

  return NextResponse.json({
    attempt_id: attempt.id,

    started_at:
      attempt.started_at,

    duration_seconds:
      attempt.duration_seconds,

    questions:
      orderedQuestions,

    cbt: isSpecialCbt
      ? {
          total_questions: 180,

          duration_minutes: 120,

          sections: cbtSections,
        }
      : null,
  });
}
