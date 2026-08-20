import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const answerSchema = z.object({
  question_id: z.string().uuid(),
  selected_answer: z.enum(['A', 'B', 'C', 'D']),
  time_spent_seconds: z.number().min(0).optional(),
});

// POST /api/exams/[attemptId]/answer
export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const { attemptId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid answer.' }, { status: 400 });

  const admin = createAdminClient();

  const { data: attempt, error: attemptError } = await admin
    .from('exam_attempts')
    .select('id, student_id, mode, status')
    .eq('id', attemptId)
    .single();

  if (attemptError || !attempt || attempt.student_id !== caller.id) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'This exam has already been submitted.' }, { status: 409 });
  }

  const { data: attemptQuestion, error: attemptQuestionError } = await admin
    .from('attempt_questions')
    .select('id')
    .eq('attempt_id', attemptId)
    .eq('question_id', parsed.data.question_id)
    .maybeSingle();

  if (attemptQuestionError || !attemptQuestion) {
    return NextResponse.json({ error: 'Question is not part of this attempt.' }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from('attempt_questions')
    .update({
      selected_answer: parsed.data.selected_answer,
      answered_at: new Date().toISOString(),
      time_spent_seconds: parsed.data.time_spent_seconds ?? null,
    })
    .eq('attempt_id', attemptId)
    .eq('question_id', parsed.data.question_id);

  if (updateError) return NextResponse.json({ error: 'Could not save answer.' }, { status: 500 });

  if (attempt.mode === 'practice') {
    // Read the answer key immediately after saving. A short retry protects
    // practice feedback from transient Supabase reads without affecting mocks/CBTs.
    let question: { correct_answer: string | null; explanation: string | null } | null = null;
    let questionError: unknown = null;

    for (let attemptNumber = 0; attemptNumber < 2; attemptNumber += 1) {
      const result = await admin
        .from('questions')
        .select('correct_answer, explanation')
        .eq('id', parsed.data.question_id)
        .maybeSingle();

      question = result.data;
      questionError = result.error;

      if (question?.correct_answer) break;
      if (attemptNumber === 0) await new Promise((resolve) => setTimeout(resolve, 150));
    }

    const correctAnswer = typeof question?.correct_answer === 'string'
      ? question.correct_answer.trim().toUpperCase()
      : '';

    if (questionError || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      console.error('Practice feedback lookup failed:', questionError);
      return NextResponse.json({
        error: 'Answer was saved, but the correct answer could not be loaded. Please try the question again.',
        answer_saved: true,
      }, { status: 500 });
    }

    return NextResponse.json({
      is_correct: correctAnswer === parsed.data.selected_answer,
      correct_answer: correctAnswer,
      explanation: question.explanation ?? null,
      answer_saved: true,
    });
  }

  return NextResponse.json({ recorded: true });
}
