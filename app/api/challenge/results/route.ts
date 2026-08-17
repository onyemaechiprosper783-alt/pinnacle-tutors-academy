import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: Request) {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' && caller.role !== 'super_admin')
  ) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  const roundId = body?.round_id;
  const released = body?.released;

  if (!roundId || typeof released !== 'boolean') {
    return NextResponse.json(
      { error: 'round_id and released are required.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('challenge_rounds')
    .update({
      results_released: released,
    })
    .eq('id', roundId)
    .select('id, results_released')
    .single();

  if (error) {
    console.error('Results release error:', error);

    return NextResponse.json(
      { error: 'Could not update results status.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
