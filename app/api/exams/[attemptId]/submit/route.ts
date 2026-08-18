import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreAttempt } from '@/lib/scoring/scoreAttempt';

// POST /api/exams/[attemptId]/submit
//
// Normal exams:
//   - return the normal percentage result.
//
// UTME Challenge:
//   - calculate and save the score out of 400
//   - update the challenge participant
//   - DO NOT reveal the score to the student
//   - results become visible only after admin releases them.

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => ({}));

  const autoSubmitted = body?.auto_submitted === true;

  const admin = createAdminClient();

  /*
   * =====================================================
   * LOAD ATTEMPT
   * =====================================================
   */

  const { data: attempt, error: attemptError } =
    await admin
      .from('exam_attempts')
      .select(`
        id,
        student_id,
        status,
        started_at,
        mode,
        config
      `)
      .eq('id', attemptId)
      .single();

  if (
    attemptError ||
    !attempt ||
    attempt.student_id !== caller.id
  ) {
    return NextResponse.json(
      { error: 'Attempt not found.' },
      { status: 404 }
    );
  }

  const isChallenge =
    attempt.mode === 'utme_challenge';

  /*
   * =====================================================
   * ALREADY SUBMITTED
   * =====================================================
   */

  if (attempt.status !== 'in_progress') {
    const { data: existing } = await admin
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    /*
     * NEVER expose challenge results.
     */

    if (isChallenge) {
      return NextResponse.json({
        success: true,
        already_submitted: true,
        challenge: true,
        results_hidden: true,
        message:
          'Your challenge has been submitted successfully. Results are coming soon.',
      });
    }

    /*
     * Normal exams keep their existing behavior.
     */

    return NextResponse.json({
      already_submitted: true,
      attempt: existing,
    });
  }

  /*
   * =====================================================
   * SCORE ATTEMPT
   * =====================================================
   */

  let result;

  try {
    result = await scoreAttempt(attemptId);
  } catch (error) {
    console.error(
      'Exam scoring error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not score exam.',
      },
      { status: 500 }
    );
  }

  /*
   * =====================================================
   * CALCULATE TIME USED
   * =====================================================
   */

  const timeUsedSeconds = Math.max(
    0,
    Math.round(
      (
        Date.now() -
        new Date(attempt.started_at).getTime()
      ) / 1000
    )
  );

  const submittedAt =
    new Date().toISOString();

  /*
   * =====================================================
   * CHALLENGE SCORE
   * =====================================================
   *
   * UTME Challenge:
   *
   * 180 questions = 400 marks
   *
   * 180 correct = 400
   * 135 correct = 300
   * 90 correct  = 200
   * 45 correct  = 100
   */

  const challengeScore = isChallenge
    ? Math.round(
        ((result.correct_count / 180) * 400) * 100
      ) / 100
    : null;

  /*
   * =====================================================
   * SAVE SCORE
   * =====================================================
   */

  const savedScore = isChallenge
    ? challengeScore!
    : result.score;

  const { data: updatedAttempt, error: updateError } =
    await admin
      .from('exam_attempts')
      .update({
        status: autoSubmitted
          ? 'auto_submitted'
          : 'submitted',

        submitted_at: submittedAt,

        time_used_seconds:
          timeUsedSeconds,

        total_questions:
          result.total_questions,

        correct_count:
          result.correct_count,

        incorrect_count:
          result.incorrect_count,

        unanswered_count:
          result.unanswered_count,

        score: savedScore,
      })
      .eq('id', attemptId)
      .select('*')
      .single();

  if (
    updateError ||
    !updatedAttempt
  ) {
    console.error(
      'Exam finalization error:',
      updateError
    );

    return NextResponse.json(
      {
        error:
          'Could not finalize exam.',
      },
      { status: 500 }
    );
  }

  /*
   * =====================================================
   * UTME CHALLENGE
   * =====================================================
   */

  if (isChallenge) {
    const challengeConfig =
      (attempt.config ?? {}) as {
        round_id?: string;
        challenge?: {
          participant_id?: string;
        };
      };

    const participantId =
      challengeConfig.challenge
        ?.participant_id;

    const roundId =
      challengeConfig.round_id;

    if (!participantId) {
      console.error(
        'Challenge participant ID missing from attempt config.'
      );

      return NextResponse.json(
        {
          error:
            'Challenge participant could not be identified.',
        },
        { status: 500 }
      );
    }

    /*
     * Save the score to the participant.
     *
     * Rank is calculated by the leaderboard
     * and is therefore reset here.
     */

    const {
      error: participantError,
    } = await admin
      .from('utme_challenge_participants')
      .update({
        score: challengeScore,
        rank: null,
      })
      .eq('id', participantId);

    if (participantError) {
      console.error(
        'Challenge participant update error:',
        participantError
      );

      return NextResponse.json(
        {
          error:
            'Challenge was submitted, but the participant result could not be saved.',
        },
        { status: 500 }
      );
    }

    /*
     * =================================================
     * LEADERBOARD ENTRY
     * =================================================
     */

    const {
      error: leaderboardError,
    } = await admin
      .from('leaderboard_entries')
      .insert({
        attempt_id: attemptId,
        student_id: caller.id,
        category:
          roundId ??
          'utme_challenge',
        score: challengeScore,
        time_used_seconds:
          timeUsedSeconds,
      });

    if (leaderboardError) {
      console.error(
        'Challenge leaderboard entry error:',
        leaderboardError
      );

      /*
       * We do NOT fail the student's submission here.
       *
       * The important challenge participant result
       * has already been saved.
       */
    }

    /*
     * =================================================
     * CRITICAL SECURITY RULE
     * =================================================
     *
     * DO NOT RETURN:
     *
     * - score
     * - correct_count
     * - incorrect_count
     * - unanswered_count
     * - rank
     * - updatedAttempt
     * - result
     *
     * to the student.
     */

    return NextResponse.json({
      success: true,
      challenge: true,
      submitted: true,
      results_hidden: true,

      message:
        'Your challenge has been submitted successfully. Results are coming soon.',
    });
  }

  /*
   * =====================================================
   * NORMAL EXAMS
   * =====================================================
   */

  const {
    error: leaderboardError,
  } = await admin
    .from('leaderboard_entries')
    .insert({
      attempt_id: attemptId,
      student_id: caller.id,
      category:
        (updatedAttempt.config as {
          round_id?: string;
        })?.round_id ??
        updatedAttempt.mode ??
        'exam',
      score: result.score,
      time_used_seconds:
        timeUsedSeconds,
    });

  if (leaderboardError) {
    console.error(
      'Leaderboard entry error:',
      leaderboardError
    );
  }

  /*
   * Normal exams still receive their results.
   */

  return NextResponse.json({
    attempt: updatedAttempt,
    result,
  });
}
