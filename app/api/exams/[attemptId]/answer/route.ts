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

  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('id, student_id, mode, status')
    .eq('id', attemptId)
    .single();

  if (!attempt || attempt.student_id !== caller.id) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'This exam has already been submitted.' }, { status: 409 });
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
    const { data: question, error: questionError } = await admin
      .from('questions')
      .select('correct_answer, explanation')
      .eq('id', parsed.data.question_id)
      .single();

    const correctAnswer = typeof question?.correct_answer === 'string'
      ? question.correct_answer.trim().toUpperCase()
      : '';

    if (questionError || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      console.error('Practice feedback lookup failed:', questionError);
      return NextResponse.json({ error: 'Answer was saved, but the correct answer could not be loaded.' }, { status: 500 });
    }

    return NextResponse.json({
      is_correct: correctAnswer === parsed.data.selected_answer,
      correct_answer: correctAnswer,
      explanation: question.explanation ?? null,
    });
  }

  return NextResponse.json({ recorded: true });
}
