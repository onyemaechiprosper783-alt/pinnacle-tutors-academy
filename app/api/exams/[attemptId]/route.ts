import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const { attemptId } = await params;
  const admin = createAdminClient();

  const { data: attempt } = await admin.from('exam_attempts').select('*').eq('id', attemptId).single();
  if (!attempt || (attempt.student_id !== caller.id && caller.role === 'student')) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  const { data: attemptQuestions } = await admin
    .from('attempt_questions')
    .select('id, question_id, position, selected_answer, is_correct')
    .eq('attempt_id', attemptId)
    .order('position');

  const questionIds = (attemptQuestions ?? []).map((aq) => aq.question_id);

  // Before submission: answer-free question data only (resuming an exam).
  // After submission: full question data including the answer key and
  // explanation, so the student can review what they got wrong.
  const isSubmitted = attempt.status !== 'in_progress';
  const { data: questions } = await admin
    .from(isSubmitted ? 'questions' : 'questions_public')
    .select(isSubmitted ? '*, subjects(name)' : '*, subjects(name)')
    .in('id', questionIds);

  const questionMap = new Map((questions ?? []).map((q) => [q.id, q]));

  const combined = (attemptQuestions ?? []).map((aq) => ({
    ...aq,
    question: questionMap.get(aq.question_id),
  }));

  // Subject-level breakdown, only meaningful once submitted.
  let subjectBreakdown: Record<string, { correct: number; total: number }> = {};
  if (isSubmitted) {
    subjectBreakdown = combined.reduce((acc, aq) => {
      const subjectName = aq.question?.subjects?.name ?? 'Unknown';
      acc[subjectName] ??= { correct: 0, total: 0 };
      acc[subjectName].total += 1;
      if (aq.is_correct) acc[subjectName].correct += 1;
      return acc;
    }, {} as Record<string, { correct: number; total: number }>);
  }

  return NextResponse.json({ attempt, questions: combined, subject_breakdown: subjectBreakdown });
}
