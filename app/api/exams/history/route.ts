import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const caller = await getCurrentProfile();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { data: attempts, error } = await admin
    .from('exam_attempts')
    .select(
      'id, mode, subject_ids, status, started_at, submitted_at, duration_seconds, time_used_seconds, total_questions, correct_count, incorrect_count, unanswered_count, score'
    )
    .eq('student_id', caller.id)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: 'Could not load exam history.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ attempts: attempts ?? [] });
}
