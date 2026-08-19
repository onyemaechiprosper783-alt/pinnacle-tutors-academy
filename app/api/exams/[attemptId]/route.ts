import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const { attemptId } = await params;
  const admin = createAdminClient();
  const { data: attempt, error: attemptError } = await admin.from('exam_attempts').select('*').eq('id', attemptId).single();
  if (attemptError || !attempt || (attempt.student_id !== caller.id && caller.role === 'student')) return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });

  const isStudent = caller.role === 'student';
  const config = (attempt.config ?? {}) as { round_id?: string | null; results_released?: boolean; challenge?: { round_id?: string | null; participant_id?: string | null; results_released?: boolean } | null };
  const roundId = config.round_id ?? config.challenge?.round_id ?? null;
  const isChallenge = (attempt.mode === 'cbt' || attempt.mode === 'utme_challenge') && !!roundId;
  const isSubmitted = attempt.status !== 'in_progress';
  let resultsReleased = config.results_released === true || config.challenge?.results_released === true;
  let challengeGlobalDeadline: string | null = null;

  if (isChallenge && roundId) {
    const { data: round } = await admin.from('challenge_rounds').select('results_released, activated_at, closes_at, duration_seconds').eq('id', roundId).maybeSingle();
    if (round?.results_released === true) resultsReleased = true;
    if (round?.activated_at) {
      const activatedMs = new Date(round.activated_at).getTime();
      const durationMs = Number(round.duration_seconds ?? 0) * 1000;
      const durationDeadline = durationMs > 0 ? activatedMs + durationMs : null;
      const closesMs = round.closes_at ? new Date(round.closes_at).getTime() : null;
      const validClosesMs = closesMs !== null && Number.isFinite(closesMs) ? closesMs : null;
      const candidates = [durationDeadline, validClosesMs].filter((value): value is number => value !== null && Number.isFinite(value));
      if (candidates.length > 0) challengeGlobalDeadline = new Date(Math.min(...candidates)).toISOString();
    }
  }

  if (isChallenge && isStudent && isSubmitted && !resultsReleased) {
    return NextResponse.json({
      attempt: { id: attempt.id, mode: attempt.mode, status: attempt.status, started_at: attempt.started_at, submitted_at: attempt.submitted_at, duration_seconds: attempt.duration_seconds, time_used_seconds: attempt.time_used_seconds },
      questions: [], subject_breakdown: {}, topic_breakdown: {}, weak_topics: [], challenge: true, results_hidden: true,
      message: 'Your challenge has been submitted successfully. Results will be available when they are released.',
      challenge_global_deadline: challengeGlobalDeadline,
    });
  }

  const { data: attemptQuestions, error: attemptQuestionsError } = await admin.from('attempt_questions').select('id, question_id, position, selected_answer, is_correct').eq('attempt_id', attemptId).order('position', { ascending: true });
  if (attemptQuestionsError) return NextResponse.json({ error: 'Could not load exam questions.' }, { status: 500 });

  const questionIds = (attemptQuestions ?? []).map((aq) => aq.question_id);
  if (questionIds.length === 0) return NextResponse.json({ error: 'No questions were found for this exam attempt.' }, { status: 404 });

  const source = isSubmitted ? 'questions' : 'questions_public';
  const select = isSubmitted ? '*, subjects(name), topics(name)' : '*, subjects(name)';
  const { data: questions, error: questionsError } = await admin.from(source).select(select).in('id', questionIds);
  if (questionsError) {
    console.error('Question data load error:', questionsError);
    return NextResponse.json({ error: 'Could not load question data.' }, { status: 500 });
  }
  if (!questions || questions.length !== questionIds.length) return NextResponse.json({ error: 'Some exam questions could not be loaded.' }, { status: 500 });

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const combined = (attemptQuestions ?? []).map((aq) => ({ ...aq, question: questionMap.get(aq.question_id) }));
  if (combined.some((aq) => !aq.question)) return NextResponse.json({ error: 'One or more exam questions could not be found.' }, { status: 500 });

  const subjectBreakdown: Record<string, { correct: number; total: number }> = {};
  const topicBreakdown: Record<string, { correct: number; total: number }> = {};
  if (isSubmitted) {
    for (const aq of combined) {
      const subjectName = aq.question?.subjects?.name ?? 'Unknown';
      subjectBreakdown[subjectName] ??= { correct: 0, total: 0 };
      subjectBreakdown[subjectName].total += 1;
      if (aq.is_correct === true) subjectBreakdown[subjectName].correct += 1;

      const topicName = aq.question?.topics?.name ?? 'Unassigned topic';
      topicBreakdown[topicName] ??= { correct: 0, total: 0 };
      topicBreakdown[topicName].total += 1;
      if (aq.is_correct === true) topicBreakdown[topicName].correct += 1;
    }
  }

  const weakTopics = Object.entries(topicBreakdown)
    .filter(([, section]) => section.total > 0 && section.correct / section.total < 0.6)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .map(([topic, section]) => ({ topic, ...section, percentage: Math.round((section.correct / section.total) * 100) }));

  return NextResponse.json({ attempt, questions: combined, subject_breakdown: subjectBreakdown, topic_breakdown: topicBreakdown, weak_topics: weakTopics, challenge: isChallenge, results_hidden: isChallenge && isStudent && isSubmitted && !resultsReleased, challenge_config: isChallenge ? config.challenge ?? null : null, challenge_global_deadline: challengeGlobalDeadline });
}
