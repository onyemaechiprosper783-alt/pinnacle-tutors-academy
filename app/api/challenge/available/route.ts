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

  const now = new Date().toISOString();

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
    .or(`opens_at.is.null,opens_at.lte.${now}`)
    .or(`closes_at.is.null,closes_at.gte.${now}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Available challenge rounds error:', error);

    return NextResponse.json(
      { error: 'Could not load available challenge rounds.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
