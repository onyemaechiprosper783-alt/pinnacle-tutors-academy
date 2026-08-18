import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const caller = await getCurrentProfile();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 401 }
    );
  }

  const { attemptId } = await params;
  const admin = createAdminClient();

  /*
   * =====================================================
   * LOAD ATTEMPT
   * =====================================================
   */

  const {
    data: attempt,
    error: attemptError,
  } = await admin
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (
    attemptError ||
    !attempt ||
    (
      attempt.student_id !== caller.id &&
      caller.role === 'student'
    )
  ) {
    return NextResponse.json(
      { error: 'Attempt not found.' },
      { status: 404 }
    );
  }

  /*
   * =====================================================
   * CHALLENGE INFORMATION
   * =====================================================
   */

  const isChallenge =
    attempt.mode === 'utme_challenge';

  const isStudent =
    caller.role === 'student';

  const resultsReleased =
    Boolean(
      (
        attempt.config as {
          results_released?: boolean;
        } | null
      )?.results_released
    );

  const isSubmitted =
    attempt.status !== 'in_progress';

  /*
   * =====================================================
   * IMPORTANT:
   *
   * DO NOT HIDE QUESTIONS WHILE THE CHALLENGE
   * IS STILL IN PROGRESS.
   *
   * The student must receive the 180 questions
   * in order to take the CBT.
   *
   * Challenge results are hidden ONLY after
   * submission until the administrator releases them.
   * =====================================================
   */

  if (
    isChallenge &&
    isStudent &&
    isSubmitted &&
    !resultsReleased
  ) {
    return NextResponse.json({
      attempt: {
        id: attempt.id,
        mode: attempt.mode,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at:
          attempt.submitted_at,
        duration_seconds:
          attempt.duration_seconds,
        time_used_seconds:
          attempt.time_used_seconds,
      },

      questions: [],

      subject_breakdown: {},

      challenge: true,

      results_hidden: true,

      message:
        'Your challenge has been submitted successfully. Results will be available when they are released.',
    });
  }

  /*
   * =====================================================
   * LOAD ATTEMPT QUESTIONS
   * =====================================================
   */

  const {
    data: attemptQuestions,
    error: attemptQuestionsError,
  } = await admin
    .from('attempt_questions')
    .select(
      `
        id,
        question_id,
        position,
        selected_answer,
        is_correct
      `
    )
    .eq('attempt_id', attemptId)
    .order('position', {
      ascending: true,
    });

  if (attemptQuestionsError) {
    console.error(
      'Attempt questions load error:',
      attemptQuestionsError
    );

    return NextResponse.json(
      {
        error:
          'Could not load exam questions.',
      },
      { status: 500 }
    );
  }

  const questionIds =
    (attemptQuestions ?? []).map(
      (aq) => aq.question_id
    );

  /*
   * =====================================================
   * MAKE SURE QUESTIONS EXIST
   * =====================================================
   */

  if (questionIds.length === 0) {
    return NextResponse.json(
      {
        error:
          'No questions were found for this exam attempt.',
      },
      { status: 404 }
    );
  }

  /*
   * =====================================================
   * QUESTION DATA
   * =====================================================
   *
   * While the exam is in progress:
   *
   *   questions_public
   *
   * is used so the correct answer is not exposed.
   *
   * After submission:
   *
   *   questions
   *
   * can be used so results can include the answer key.
   */

  const {
    data: questions,
    error: questionsError,
  } = await admin
    .from(
      isSubmitted
        ? 'questions'
        : 'questions_public'
    )
    .select(
      '*, subjects(name)'
    )
    .in(
      'id',
      questionIds
    );

  if (questionsError) {
    console.error(
      'Question data load error:',
      questionsError
    );

    return NextResponse.json(
      {
        error:
          'Could not load question data.',
      },
      { status: 500 }
    );
  }

  if (
    !questions ||
    questions.length !==
      questionIds.length
  ) {
    console.error(
      'Question count mismatch:',
      {
        requested:
          questionIds.length,
        loaded:
          questions?.length ?? 0,
      }
    );

    return NextResponse.json(
      {
        error:
          'Some exam questions could not be loaded.',
      },
      { status: 500 }
    );
  }

  /*
   * =====================================================
   * PRESERVE ATTEMPT QUESTION ORDER
   * =====================================================
   */

  const questionMap =
    new Map(
      questions.map(
        (question) => [
          question.id,
          question,
        ]
      )
    );

  const combined =
    (attemptQuestions ?? []).map(
      (aq) => ({
        ...aq,

        question:
          questionMap.get(
            aq.question_id
          ),
      })
    );

  /*
   * =====================================================
   * VERIFY EVERY QUESTION WAS FOUND
   * =====================================================
   */

  const missingQuestion =
    combined.some(
      (aq) => !aq.question
    );

  if (missingQuestion) {
    return NextResponse.json(
      {
        error:
          'One or more exam questions could not be found.',
      },
      { status: 500 }
    );
  }

  /*
   * =====================================================
   * SUBJECT BREAKDOWN
   * =====================================================
   */

  let subjectBreakdown: Record<
    string,
    {
      correct: number;
      total: number;
    }
  > = {};

  if (isSubmitted) {
    subjectBreakdown =
      combined.reduce(
        (acc, aq) => {
          const subjectName =
            aq.question?.subjects
              ?.name ??
            'Unknown';

          acc[subjectName] ??= {
            correct: 0,
            total: 0,
          };

          acc[subjectName].total += 1;

          if (aq.is_correct) {
            acc[subjectName].correct += 1;
          }

          return acc;
        },
        {} as Record<
          string,
          {
            correct: number;
            total: number;
          }
        >
      );
  }

  /*
   * =====================================================
   * CHALLENGE CONFIG
   * =====================================================
   */

  const challengeConfig =
    isChallenge
      ? (
          attempt.config as {
            challenge?: {
              participant_id?: string;
              english_questions?: number;
              lekki_headmaster_questions?: number;
              additional_subject_questions?: number;
              total_questions?: number;
              locked?: boolean;
            };
          } | null
        )?.challenge ?? null
      : null;

  /*
   * =====================================================
   * RESPONSE
   * =====================================================
   */

  return NextResponse.json({
    attempt,

    questions: combined,

    subject_breakdown:
      subjectBreakdown,

    challenge: isChallenge,

    results_hidden:
      isChallenge &&
      isStudent &&
      isSubmitted &&
      !resultsReleased,

    challenge_config:
      challengeConfig,
  });
}
