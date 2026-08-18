import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreAttempt } from '@/lib/scoring/scoreAttempt';

// POST /api/exams/[attemptId]/submit
//
// Normal CBT:
//   - calculate and return the normal result.
//
// UTME Challenge:
//   - uses mode: 'cbt'
//   - identified by round_id in the attempt config
//   - 180 questions = 400 marks
//   - save score to challenge participant
//   - create leaderboard entry
//   - DO NOT reveal score to student

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

  const {
    data: attempt,
    error: attemptError,
  } = await admin
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
      {
        error: 'Attempt not found.',
      },
      { status: 404 }
    );
  }

  /*
   * =====================================================
   * DETERMINE WHETHER THIS IS A UTME CHALLENGE
   * =====================================================
   *
   * IMPORTANT:
   *
   * The UTME Challenge uses:
   *
   *     mode: 'cbt'
   *
   * It is NOT:
   *
   *     mode: 'utme_challenge'
   *
   * We identify the challenge using round_id
   * stored in the attempt configuration.
   */

  const config =
    (attempt.config ?? {}) as {
      round_id?: string | null;
      challenge?: {
        round_id?: string | null;
        participant_id?: string | null;
      } | null;
      cbt?: {
        total_questions?: number;
      } | null;
    };

  const roundId =
    config.round_id ??
    config.challenge?.round_id ??
    null;

  const isChallenge =
    attempt.mode === 'cbt' &&
    !!roundId;

  /*
   * =====================================================
   * ALREADY SUBMITTED
   * =====================================================
   */

  if (attempt.status !== 'in_progress') {
    /*
     * Challenge results must NEVER be returned.
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
     * Normal CBT/exams keep their normal behavior.
     */

    const { data: existing } =
      await admin
        .from('exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

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
    result = await scoreAttempt(
      attemptId
    );
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

  const timeUsedSeconds =
    Math.max(
      0,
      Math.round(
        (
          Date.now() -
          new Date(
            attempt.started_at
          ).getTime()
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
   * Formula:
   *
   * correct / 180 × 400
   */

  const challengeScore =
    isChallenge
      ? Math.round(
          (
            (result.correct_count /
              180) *
            400
          ) * 100
        ) / 100
      : null;

  /*
   * =====================================================
   * SAVE SCORE
   * =====================================================
   */

  const savedScore =
    isChallenge
      ? challengeScore!
      : result.score;

  const {
    data: updatedAttempt,
    error: updateError,
  } = await admin
    .from('exam_attempts')
    .update({
      status: autoSubmitted
        ? 'auto_submitted'
        : 'submitted',

      submitted_at:
        submittedAt,

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
    /*
     * =================================================
     * FIND CHALLENGE PARTICIPANT
     * =================================================
     *
     * We identify the participant using:
     *
     *   round_id
     *   student_id
     *
     * This means we do not depend on participant_id
     * being stored inside the attempt config.
     */

    const {
      data: participant,
      error:
        participantLookupError,
    } = await admin
      .from(
        'utme_challenge_participants'
      )
      .select('id')
      .eq(
        'round_id',
        roundId
      )
      .eq(
        'student_id',
        caller.id
      )
      .maybeSingle();

    if (
      participantLookupError
    ) {
      console.error(
        'Challenge participant lookup error:',
        participantLookupError
      );

      return NextResponse.json(
        {
          error:
            'Challenge participant could not be identified.',
        },
        { status: 500 }
      );
    }

    if (!participant) {
      console.error(
        'No challenge participant found.',
        {
          roundId,
          studentId:
            caller.id,
        }
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
     * =================================================
     * SAVE CHALLENGE PARTICIPANT SCORE
     * =================================================
     */

    const {
      error:
        participantError,
    } = await admin
      .from(
        'utme_challenge_participants'
      )
      .update({
        score:
          challengeScore,
        rank: null,
      })
      .eq(
        'id',
        participant.id
      );

    if (
      participantError
    ) {
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
      error:
        leaderboardError,
    } = await admin
      .from(
        'leaderboard_entries'
      )
      .insert({
        attempt_id:
          attemptId,

        student_id:
          caller.id,

        category:
          roundId,

        score:
          challengeScore,

        time_used_seconds:
          timeUsedSeconds,
      });

    if (
      leaderboardError
    ) {
      console.error(
        'Challenge leaderboard entry error:',
        leaderboardError
      );

      /*
       * Do not fail the student's submission
       * because the leaderboard entry failed.
       */
    }

    /*
     * =================================================
     * SECURITY
     * =================================================
     *
     * NEVER return:
     *
     * - score
     * - correct_count
     * - incorrect_count
     * - unanswered_count
     * - rank
     * - updatedAttempt
     * - result
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
   * NORMAL CBT / NORMAL EXAMS
   * =====================================================
   */

  const {
    error:
      leaderboardError,
  } = await admin
    .from(
      'leaderboard_entries'
    )
    .insert({
      attempt_id:
        attemptId,

      student_id:
        caller.id,

      category:
        (updatedAttempt.config as {
          round_id?: string;
        })?.round_id ??
        updatedAttempt.mode ??
        'exam',

      score:
        result.score,

      time_used_seconds:
        timeUsedSeconds,
    });

  if (
    leaderboardError
  ) {
    console.error(
      'Leaderboard entry error:',
      leaderboardError
    );
  }

  /*
   * Normal exams receive their results.
   */

  return NextResponse.json({
    attempt:
      updatedAttempt,

    result,
  });
}
