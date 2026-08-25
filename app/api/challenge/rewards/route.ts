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

  const participantId = body?.participant_id;

  if (!participantId) {
    return NextResponse.json(
      { error: 'participant_id is required.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: participant, error: participantError } = await admin
    .from('utme_challenge_participants')
    .select('id, round_id, student_id, whatsapp_number, reward_given')
    .eq('id', participantId)
    .single();

  if (participantError || !participant) {
    return NextResponse.json(
      { error: 'Participant not found.' },
      { status: 404 }
    );
  }

  if (!participant.whatsapp_number) {
    return NextResponse.json(
      { error: 'This student has no WhatsApp number.' },
      { status: 400 }
    );
  }

  if (participant.reward_given) {
    return NextResponse.json(
      { error: 'Reward has already been recorded for this student.' },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from('utme_challenge_participants')
    .update({
      reward_given: true,
      reward_given_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select(
      'id, student_id, whatsapp_number, reward_given, reward_given_at'
    )
    .single();

  if (error) {
    console.error('Reward update error:', error);

    return NextResponse.json(
      { error: 'Could not record reward.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
