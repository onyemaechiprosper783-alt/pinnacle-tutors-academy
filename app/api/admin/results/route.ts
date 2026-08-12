import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  const admin = createAdminClient();
  let query = admin
    .from('exam_attempts')
    .select('id, mode, status, score, correct_count, total_questions, submitted_at, started_at, profiles(full_name)')
    .order('started_at', { ascending: false })
    .limit(100);

  if (mode) query = query.eq('mode', mode);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  return NextResponse.json(data);
}
