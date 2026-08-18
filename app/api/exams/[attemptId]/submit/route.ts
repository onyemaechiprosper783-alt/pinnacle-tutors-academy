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
//   - save the challenge score out of 400
//   - update the challenge participant
//   - DO NOT reveal the score to the student yet
//   - the score becomes visible only after admin releases results.

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

  const autoSubmitted =
    body?.auto_submitted === true;

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
     * For a UTME Challenge, NEVER return the result
     * directly to the student after submission.
     */

    if (attempt.mode === 'utme_challenge') {
      return NextResponse.json({
        already_submitted: true,
        challenge: true,
        message:
          'Your results have been saved. They will be available when the administrator releases the results.',
      });
    }

    return NextResponse.json({
      already_submitted: true,
      attempt: existing,
    });
  }

  /*
   * =====================================================
   * SCORE ATTEMPT
   * =====================================================
   *
   * scoreAttempt continues to calculate the normal
   * percentage score.
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
      (Date.now() -
        new Date(attempt.started_at).getTime()) /
        1000
    )
  );

  const submittedAt =
    new Date().toISOString();

  /*
   * =====================================================
   * DETERMINE CHALLENGE
   * =====================================================
   */

  const isChallenge =
    attempt.mode === 'utme_challenge';

  /*
   * =====================================================
   * CHALLENGE SCORE
   * =====================================================
   *
   * The challenge contains 180 questions and uses a
   * 400-point scale.
   *
   * Example:
   *
   * 180 correct = 400/400
   * 135 correct = 300/400
   * 90 correct  = 200/400
   * 45 correct  = 100/400
   *
   * We round to two decimal places.
   */

  const challengeScore = isChallenge
    ? Math.round(
        ((result.correct_count / 180) * 400) *
          100
      ) / 100
    : null;

  /*
   * =====================================================
   * SAVE EXAM ATTEMPT
   * =====================================================
   *
   * Normal exams keep their percentage score.
   *
   * Challenge attempts store the /400 score.
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

  if (updateError || !updatedAttempt) {
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
   * UTME CHALLENGE PARTICIPANT
   * =====================================================
   *
   * Copy the final result into the challenge
   * participant record.
   *
   * This is what the admin challenge leaderboard
   * reads.
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
     * The participant table in your database does not
     * contain the old status/count columns we were
     * previously trying to select.
     *
     * We therefore only update columns confirmed to
     * exist from your database structure.
     */

    const { error: participantError } =
      await admin
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

    await admin
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

    /*
     * =================================================
     * IMPORTANT:
     * DO NOT RETURN THE SCORE TO THE STUDENT
     * =================================================
     */

    return NextResponse.json({
      success: true,
      challenge: true,
      submitted: true,
      message:
        'Your results have been saved. They will be available when the administrator releases the results.',
    });
  }

  /*
   * =====================================================
   * NORMAL EXAMS
   * =====================================================
   *
   * Normal exams continue behaving exactly as before.
   */

  await admin
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

  return NextResponse.json({
    attempt: updatedAttempt,
    result,
  });
}
