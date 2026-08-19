import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const caller = await getCurrentProfile();

  if (!caller) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { attemptId } = await params;
  const admin = createAdminClient();

  const { data: attempt, error: attemptError } = await admin
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (
    attemptError ||
    !attempt ||
    (attempt.student_id !== caller.id && caller.role === 'student')
  ) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  const isStudent = caller.role === 'student';
  const config = (attempt.config ?? {}) as {
    round_id?: string | null;
    results_released?: boolean;
    challenge?: {
      round_id?: string | null;
      participant_id?: string | null;
      results_released?: boolean;
    } | null;
  };

  const roundId = config.round_id ?? config.challenge?.round_id ?? null;
  const isChallenge = attempt.mode === 'cbt' && !!roundId;
  const isSubmitted = attempt.status !== 'in_progress';

  // challenge_rounds is the authoritative release switch. The attempt config
  // is also supported for compatibility with older released attempts.
  let resultsReleased =
    config.results_released === true ||
    config.challenge?.results_released === true;

  if (isChallenge && roundId) {
    const { data: round } = await admin
      .from('challenge_rounds')
      .select('results_released')
      .eq('id', roundId)
      .maybeSingle();

    if (round?.results_released === true) {
      resultsReleased = true;
    }
  }

  if (isChallenge && isStudent && isSubmitted && !resultsReleased) {
    return NextResponse.json({
      attempt: {
        id: attempt.id,
        mode: attempt.mode,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        duration_seconds: attempt.duration_seconds,
        time_used_seconds: attempt.time_used_seconds,
      },
      questions: [],
      subject_breakdown: {},
      challenge: true,
      results_hidden: true,
      message:
        'Your challenge has been submitted successfully. Results will be available when they are released.',
    });
  }

  const { data: attemptQuestions, error: attemptQuestionsError } = await admin
    .from('attempt_questions')
    .select('id, question_id, position, selected_answer, is_correct')
    .eq('attempt_id', attemptId)
    .order('position', { ascending: true });

  if (attemptQuestionsError) {
    console.error('Attempt questions load error:', attemptQuestionsError);
    return NextResponse.json({ error: 'Could not load exam questions.' }, { status: 500 });
  }

  const questionIds = (attemptQuestions ?? []).map((aq) => aq.question_id);

  if (questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions were found for this exam attempt.' }, { status: 404 });
  }

  const { data: questions, error: questionsError } = await admin
    .from(isSubmitted ? 'questions' : 'questions_public')
    .select('*, subjects(name)')
    .in('id', questionIds);

  if (questionsError) {
    console.error('Question data load error:', questionsError);
    return NextResponse.json({ error: 'Could not load question data.' }, { status: 500 });
  }

  if (!questions || questions.length !== questionIds.length) {
    return NextResponse.json({ error: 'Some exam questions could not be loaded.' }, { status: 500 });
  }

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const combined = (attemptQuestions ?? []).map((aq) => ({
    ...aq,
    question: questionMap.get(aq.question_id),
  }));

  if (combined.some((aq) => !aq.question)) {
    return NextResponse.json({ error: 'One or more exam questions could not be found.' }, { status: 500 });
  }

  const subjectBreakdown: Record<string, { correct: number; total: number }> = {};

  if (isSubmitted) {
    for (const aq of combined) {
      const subjectName = aq.question?.subjects?.name ?? 'Unknown';
      subjectBreakdown[subjectName] ??= { correct: 0, total: 0 };
      subjectBreakdown[subjectName].total += 1;
      if (aq.is_correct === true) subjectBreakdown[subjectName].correct += 1;
    }
  }

  return NextResponse.json({
    attempt,
    questions: combined,
    subject_breakdown: subjectBreakdown,
    challenge: isChallenge,
    results_hidden: isChallenge && isStudent && isSubmitted && !resultsReleased,
    challenge_config: isChallenge ? config.challenge ?? null : null,
  });
}
