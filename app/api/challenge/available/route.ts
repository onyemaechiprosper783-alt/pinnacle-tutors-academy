import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const caller = await getCurrentProfile();

  if (!caller) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Return both live and scheduled rounds. The join endpoint still blocks
  // students from entering a round before its opens_at time.
  const { data, error } = await admin
    .from('challenge_rounds')
    .select(`
      id,
      title,
      difficulty,
      question_count,
      duration_seconds,
      opens_at,
      closes_at,
      is_active
    `)
    .eq('is_active', true)
    .or(`closes_at.is.null,closes_at.gte.${now}`)
    .order('opens_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Available challenge rounds error:', error);
    return NextResponse.json(
      { error: 'Could not load challenge rounds.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store' },
  });
}
