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

  const { data: attempt, error: attemptError } =
    await admin
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

  if (
    attemptError ||
    !attempt ||
    (attempt.student_id !== caller.id &&
      caller.role === 'student')
  ) {
    return NextResponse.json(
      { error: 'Attempt not found.' },
      { status: 404 }
    );
  }

  /*
   * =====================================================
   * UTME CHALLENGE SECURITY
   * =====================================================
   *
   * Students must NOT receive challenge results
   * until the administrator releases them.
   *
   * Admins can still access everything normally.
   */

  const isChallenge =
    attempt.mode === 'utme_challenge';

  const isStudent =
    caller.role === 'student';

  const resultsReleased =
    Boolean(
      (attempt.config as {
        results_released?: boolean;
      } | null)?.results_released
    );

  if (
    isChallenge &&
    isStudent &&
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

  const { data: attemptQuestions } =
    await admin
      .from('attempt_questions')
      .select(
        'id, question_id, position, selected_answer, is_correct'
      )
      .eq('attempt_id', attemptId)
      .order('position');

  const questionIds =
    (attemptQuestions ?? []).map(
      (aq) => aq.question_id
    );

  /*
   * =====================================================
   * QUESTION DATA
   * =====================================================
   *
   * Before submission:
   *   Use questions_public so answers are hidden.
   *
   * After submission:
   *   Normal exams can see the answer key.
   */

  const isSubmitted =
    attempt.status !== 'in_progress';

  const { data: questions } =
    await admin
      .from(
        isSubmitted
          ? 'questions'
          : 'questions_public'
      )
      .select('*, subjects(name)')
      .in('id', questionIds);

  const questionMap =
    new Map(
      (questions ?? []).map(
        (q) => [q.id, q]
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
   * NORMAL RESULT
   * =====================================================
   */

  return NextResponse.json({
    attempt,

    questions: combined,

    subject_breakdown:
      subjectBreakdown,

    challenge: false,

    results_hidden: false,
  });
}
