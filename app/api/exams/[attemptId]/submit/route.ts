import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreAttempt } from '@/lib/scoring/scoreAttempt';

// POST /api/exams/[attemptId]/submit
// Body (optional): { auto_submitted: boolean } — set true when the timer
// expired rather than the student clicking Submit.
export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const { attemptId } = await params;
  const body = await request.json().catch(() => ({}));
  const autoSubmitted = body?.auto_submitted === true;

  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('id, student_id, status, started_at')
    .eq('id', attemptId)
    .single();

  if (!attempt || attempt.student_id !== caller.id) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  if (attempt.status !== 'in_progress') {
    // Idempotent — resubmitting an already-submitted attempt just returns
    // its existing result instead of erroring, since a slow network retry
    // or a double-tap on Submit shouldn't break the flow.
    const { data: existing } = await admin.from('exam_attempts').select('*').eq('id', attemptId).single();
    return NextResponse.json({ already_submitted: true, attempt: existing });
  }

  const result = await scoreAttempt(attemptId);
  const timeUsedSeconds = Math.round(
    (Date.now() - new Date(attempt.started_at).getTime()) / 1000
  );

  const { data: updatedAttempt, error: updateError } = await admin
    .from('exam_attempts')
    .update({
      status: autoSubmitted ? 'auto_submitted' : 'submitted',
      submitted_at: new Date().toISOString(),
      time_used_seconds: timeUsedSeconds,
      total_questions: result.total_questions,
      correct_count: result.correct_count,
      incorrect_count: result.incorrect_count,
      unanswered_count: result.unanswered_count,
      score: result.score,
    })
    .eq('id', attemptId)
    .select('*')
    .single();

  if (updateError) return NextResponse.json({ error: 'Could not finalize exam.' }, { status: 500 });

  // Competitive modes feed the leaderboard. This write uses the service-role
  // client (already in scope via `admin`), which is the only path allowed
  // to insert leaderboard rows directly — see db/migrations/002_rls_policies.sql.
  if (updatedAttempt?.mode === 'utme_challenge') {
    await admin.from('leaderboard_entries').insert({
      attempt_id: attemptId,
      student_id: caller.id,
      category: (updatedAttempt.config as { round_id?: string })?.round_id ?? 'utme_challenge',
      score: result.score,
      time_used_seconds: timeUsedSeconds,
    });
  }

  return NextResponse.json({ attempt: updatedAttempt, result });
}
