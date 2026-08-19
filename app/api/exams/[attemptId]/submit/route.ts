import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreAttempt } from '@/lib/scoring/scoreAttempt';

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const { attemptId } = await params;
  const body = await request.json().catch(() => ({}));
  const autoSubmitted = body?.auto_submitted === true;
  const admin = createAdminClient();

  const { data: attempt, error: attemptError } = await admin
    .from('exam_attempts')
    .select('id, student_id, status, started_at, mode, config')
    .eq('id', attemptId)
    .single();

  if (attemptError || !attempt || attempt.student_id !== caller.id) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  const config = (attempt.config ?? {}) as {
    round_id?: string | null;
    challenge?: { round_id?: string | null; participant_id?: string | null; global_deadline?: string | null } | null;
    cbt?: { total_questions?: number } | null;
  };
  const roundId = config.round_id ?? config.challenge?.round_id ?? null;
  const isChallenge = (attempt.mode === 'cbt' || attempt.mode === 'utme_challenge') && Boolean(roundId);

  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ success: true, already_submitted: true, challenge: isChallenge, results_hidden: isChallenge, message: isChallenge ? 'Your challenge has already been submitted. Results will be available when they are released.' : undefined });
  }

  // Never trust the browser timer. The server enforces the same global deadline
  // that was assigned when the student joined the challenge.
  let challengeExpired = false;
  if (isChallenge) {
    let deadline = config.challenge?.global_deadline ?? null;
    if (!deadline && roundId) {
      const { data: round } = await admin
        .from('challenge_rounds')
        .select('duration_seconds, activated_at, closes_at')
        .eq('id', roundId)
        .maybeSingle();
      if (round) {
        const activatedAt = round.activated_at ? new Date(round.activated_at) : new Date(attempt.started_at);
        const configuredDeadline = new Date(activatedAt.getTime() + Math.max(1, round.duration_seconds ?? 120 * 60) * 1000);
        const explicitClose = round.closes_at ? new Date(round.closes_at) : null;
        deadline = (explicitClose && explicitClose < configuredDeadline ? explicitClose : configuredDeadline).toISOString();
      }
    }
    if (deadline && Date.now() >= new Date(deadline).getTime()) challengeExpired = true;
  }

  let result;
  try {
    result = await scoreAttempt(attemptId);
  } catch (error) {
    console.error('Exam scoring error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not score exam.' }, { status: 500 });
  }

  const startedAt = new Date(attempt.started_at).getTime();
  const timeUsedSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const submittedAt = new Date().toISOString();
  const challengeScore = isChallenge ? Math.round(((result.correct_count / 180) * 400) * 100) / 100 : null;
  const savedScore = isChallenge ? challengeScore! : result.score;

  const { data: updatedAttempt, error: updateError } = await admin
    .from('exam_attempts')
    .update({
      status: isChallenge || autoSubmitted ? 'auto_submitted' : 'submitted',
      submitted_at: submittedAt,
      time_used_seconds: timeUsedSeconds,
      total_questions: result.total_questions,
      correct_count: result.correct_count,
      incorrect_count: result.incorrect_count,
      unanswered_count: result.unanswered_count,
      score: savedScore,
    })
    .eq('id', attemptId)
    .select('*')
    .single();

  if (updateError || !updatedAttempt) {
    console.error('Exam finalization error:', updateError);
    return NextResponse.json({ error: 'Could not finalize exam.' }, { status: 500 });
  }

  if (isChallenge) {
    const { data: participant, error: participantLookupError } = await admin
      .from('utme_challenge_participants')
      .select('id, status')
      .eq('round_id', roundId)
      .eq('student_id', caller.id)
      .maybeSingle();

    if (participantLookupError || !participant) {
      console.error('Challenge participant lookup error:', participantLookupError);
      return NextResponse.json({ error: 'Challenge participant could not be identified.' }, { status: 500 });
    }

    const { error: participantUpdateError } = await admin
      .from('utme_challenge_participants')
      .update({ score: challengeScore, status: 'submitted', submitted_at: submittedAt, rank: null })
      .eq('id', participant.id);

    if (participantUpdateError) {
      console.error('Challenge participant update error:', participantUpdateError);
      return NextResponse.json({ error: 'Challenge was submitted, but the participant result could not be saved.' }, { status: 500 });
    }

    const { error: leaderboardError } = await admin
      .from('leaderboard_entries')
      .upsert({ attempt_id: attemptId, student_id: caller.id, category: roundId, score: challengeScore, time_used_seconds: timeUsedSeconds }, { onConflict: 'attempt_id' });

    if (leaderboardError) console.error('Challenge leaderboard entry error:', leaderboardError);

    return NextResponse.json({ success: true, submitted: true, challenge: true, auto_submitted: challengeExpired || autoSubmitted, results_hidden: true, message: 'Your challenge has been submitted successfully. Results will be available when they are released.' });
  }

  const normalCategory = (updatedAttempt.config as { round_id?: string | null } | null)?.round_id ?? updatedAttempt.mode ?? 'exam';
  const { error: normalLeaderboardError } = await admin
    .from('leaderboard_entries')
    .upsert({ attempt_id: attemptId, student_id: caller.id, category: normalCategory, score: result.score, time_used_seconds: timeUsedSeconds }, { onConflict: 'attempt_id' });
  if (normalLeaderboardError) console.error('Normal leaderboard entry error:', normalLeaderboardError);

  return NextResponse.json({ attempt: updatedAttempt, result });
}
