import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || !['admin', 'super_admin'].includes(caller.role)) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const roundId = body?.round_id;
  const released = body?.released;
  if (!roundId || typeof released !== 'boolean') return NextResponse.json({ error: 'round_id and released are required.' }, { status: 400 });
  const admin = createAdminClient();
  if (!released) {
    const { error } = await admin.from('challenge_rounds').update({ results_released: false }).eq('id', roundId);
    if (error) return NextResponse.json({ error: 'Could not hide challenge results.' }, { status: 500 });
    return NextResponse.json({ id: roundId, results_released: false });
  }
  const { data: participants, error } = await admin.from('utme_challenge_participants').select('id, student_id, exam_attempt_id, score, time_used_seconds, status').eq('round_id', roundId).eq('status', 'submitted');
  if (error) return NextResponse.json({ error: 'Could not load challenge participants.' }, { status: 500 });
  const ranked = [...(participants ?? [])].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0) || Number(a.time_used_seconds ?? Number.MAX_SAFE_INTEGER) - Number(b.time_used_seconds ?? Number.MAX_SAFE_INTEGER));
  let lastScore: number | null = null;
  let lastTime: number | null = null;
  let lastRank = 0;
  for (let i = 0; i < ranked.length; i++) {
    const p = ranked[i];
    const score = Number(p.score ?? 0);
    const time = Number(p.time_used_seconds ?? Number.MAX_SAFE_INTEGER);
    const rank = lastScore !== null && score === lastScore && time === lastTime ? lastRank : i + 1;
    lastScore = score; lastTime = time; lastRank = rank;
    await admin.from('utme_challenge_participants').update({ rank }).eq('id', p.id);
    if (p.exam_attempt_id) await admin.from('leaderboard_entries').upsert({ attempt_id: p.exam_attempt_id, student_id: p.student_id, category: roundId, score, time_used_seconds: p.time_used_seconds, rank }, { onConflict: 'attempt_id' });
  }
  const { error: releaseError } = await admin.from('challenge_rounds').update({ results_released: true }).eq('id', roundId);
  if (releaseError) return NextResponse.json({ error: 'Could not release challenge results.' }, { status: 500 });
  return NextResponse.json({ id: roundId, results_released: true, leaderboard_entries: ranked.length });
}
