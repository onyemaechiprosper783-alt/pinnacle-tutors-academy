import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ENGLISH_SUBJECT_ID = 'e5705892-de46-425c-af42-e37a3eddc93d';
const LEKKI_HEADMASTER_SUBJECT_ID = '3bca9d00-18fd-4064-b3ac-41da6e7eefa6';

const joinSchema = z.object({
  round_id: z.string().uuid(),
  selected_subject_ids: z.array(z.string().uuid()).length(3),
  whatsapp_number: z.string().trim().min(7).max(30),
});

export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Please provide a round, exactly 3 JAMB subjects, and your WhatsApp number.' }, { status: 400 });

  const { round_id, selected_subject_ids, whatsapp_number } = parsed.data;
  if (selected_subject_ids.includes(ENGLISH_SUBJECT_ID) || selected_subject_ids.includes(LEKKI_HEADMASTER_SUBJECT_ID)) {
    return NextResponse.json({ error: 'English Language and Lekki Headmaster are automatically included. Please select 3 other JAMB subjects.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: round, error: roundError } = await admin
    .from('challenge_rounds')
    .select('id, title, difficulty, question_count, duration_seconds, opens_at, closes_at, is_active, activated_at')
    .eq('id', round_id)
    .single();

  if (roundError || !round) return NextResponse.json({ error: 'Challenge round not found.' }, { status: 404 });

  const now = new Date();
  if (!round.is_active) return NextResponse.json({ error: 'This challenge round is not active.' }, { status: 400 });
  if (round.opens_at && new Date(round.opens_at) > now) return NextResponse.json({ error: 'This challenge round has not opened yet.' }, { status: 400 });
  if (round.closes_at && new Date(round.closes_at) <= now) return NextResponse.json({ error: 'This challenge round has already closed.' }, { status: 400 });

  // The challenge has one global clock. A scheduled round starts its clock
  // at the scheduled opening time; an unscheduled round starts on activation.
  const configuredDuration = Math.max(1, round.duration_seconds ?? 120 * 60);
  const activatedAt = round.activated_at
    ? new Date(round.activated_at)
    : round.opens_at
      ? new Date(round.opens_at)
      : now;
  const configuredDeadline = new Date(activatedAt.getTime() + configuredDuration * 1000);
  const explicitClose = round.closes_at ? new Date(round.closes_at) : null;
  const globalDeadline = explicitClose && explicitClose < configuredDeadline ? explicitClose : configuredDeadline;
  const secondsUntilGlobalDeadline = Math.floor((globalDeadline.getTime() - now.getTime()) / 1000);

  if (secondsUntilGlobalDeadline <= 0) return NextResponse.json({ error: 'This challenge has ended.' }, { status: 400 });

  const effectiveDurationSeconds = Math.min(configuredDuration, secondsUntilGlobalDeadline);

  const { data: subjects, error: subjectsError } = await admin.from('subjects').select('id').in('id', selected_subject_ids);
  if (subjectsError || !subjects || subjects.length !== 3) return NextResponse.json({ error: 'One or more selected subjects are invalid.' }, { status: 400 });

  const { data: existingParticipant } = await admin
    .from('utme_challenge_participants')
    .select('id, exam_attempt_id')
    .eq('round_id', round_id)
    .eq('student_id', caller.id)
    .maybeSingle();

  if (existingParticipant?.exam_attempt_id) return NextResponse.json({ participant_id: existingParticipant.id, attempt_id: existingParticipant.exam_attempt_id });

  let participantId = existingParticipant?.id ?? null;
  if (!participantId) {
    const { data: participant, error: participantError } = await admin
      .from('utme_challenge_participants')
      .insert({ round_id, student_id: caller.id, whatsapp_number, selected_subject_ids })
      .select('id')
      .single();
    if (participantError || !participant) {
      console.error('Challenge participant creation error:', participantError);
      return NextResponse.json({ error: 'Could not join the challenge.' }, { status: 500 });
    }
    participantId = participant.id;
  } else {
    const { error: updateError } = await admin
      .from('utme_challenge_participants')
      .update({ whatsapp_number, selected_subject_ids })
      .eq('id', participantId);
    if (updateError) {
      console.error('Challenge participant update error:', updateError);
      return NextResponse.json({ error: 'Could not update your challenge information.' }, { status: 500 });
    }
  }

  const { data: generatedCount, error: generateError } = await admin.rpc('create_utme_challenge_questions', { p_participant_id: participantId });
  if (generateError) {
    console.error('Challenge question generation error:', generateError);
    return NextResponse.json({ error: generateError.message || 'Could not generate your challenge questions.' }, { status: 500 });
  }
  if (generatedCount !== 180) return NextResponse.json({ error: `The challenge paper could not be created correctly. Expected 180 questions but received ${generatedCount}.` }, { status: 500 });

  const { data: lockedQuestions, error: lockedError } = await admin
    .from('utme_challenge_questions')
    .select('question_id, position')
    .eq('participant_id', participantId)
    .order('position', { ascending: true });
  if (lockedError || !lockedQuestions || lockedQuestions.length !== 180) {
    console.error('Locked challenge questions error:', lockedError);
    return NextResponse.json({ error: 'Could not load your locked challenge questions.' }, { status: 500 });
  }

  const allSubjectIds = [ENGLISH_SUBJECT_ID, LEKKI_HEADMASTER_SUBJECT_ID, ...selected_subject_ids];
  const { data: attempt, error: attemptError } = await admin
    .from('exam_attempts')
    .insert({
      student_id: caller.id,
      mode: 'utme_challenge',
      subject_ids: allSubjectIds,
      config: {
        question_count: 180,
        exam_type: 'jamb',
        round_id,
        challenge: {
          participant_id: participantId,
          round_id,
          english_questions: 50,
          lekki_headmaster_questions: 10,
          additional_subject_questions: 40,
          total_questions: 180,
          locked: true,
          global_deadline: globalDeadline.toISOString(),
        },
      },
      duration_seconds: effectiveDurationSeconds,
      status: 'in_progress',
    })
    .select('id, started_at, duration_seconds')
    .single();

  if (attemptError || !attempt) {
    console.error('Challenge attempt creation error:', attemptError);
    return NextResponse.json({ error: 'Could not start the challenge exam.' }, { status: 500 });
  }

  const attemptQuestionRows = lockedQuestions.map((question) => ({ attempt_id: attempt.id, question_id: question.question_id, position: question.position }));
  const { error: attemptQuestionsError } = await admin.from('attempt_questions').insert(attemptQuestionRows);
  if (attemptQuestionsError) {
    console.error('Challenge attempt questions error:', attemptQuestionsError);
    await admin.from('exam_attempts').delete().eq('id', attempt.id);
    return NextResponse.json({ error: 'Could not create the challenge question paper.' }, { status: 500 });
  }

  const { error: participantUpdateError } = await admin
    .from('utme_challenge_participants')
    .update({ exam_attempt_id: attempt.id })
    .eq('id', participantId);
  if (participantUpdateError) {
    console.error('Challenge participant attempt-link error:', participantUpdateError);
    return NextResponse.json({ error: 'Challenge started, but the participant record could not be linked.' }, { status: 500 });
  }

  return NextResponse.json({ participant_id: participantId, attempt_id: attempt.id, question_count: 180, duration_seconds: attempt.duration_seconds, global_deadline: globalDeadline.toISOString() });
}
