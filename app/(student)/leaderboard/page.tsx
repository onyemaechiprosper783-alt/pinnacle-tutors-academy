import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Attempt = {
  id: string;
  started_at: string;
  config: unknown;
};

type Entry = {
  attempt_id: string;
  student_id: string;
  category: string;
  score: number | null;
  time_used_seconds: number | null;
  created_at: string;
};

export default async function LeaderboardPage() {
  const caller = await getCurrentProfile();
  if (!caller) {
    return <div className="mx-auto max-w-4xl p-6 text-center"><h1 className="text-2xl font-black">Please log in</h1><p className="mt-2 text-[var(--muted)]">You need to be logged in to view the leaderboard.</p></div>;
  }

  const admin = createAdminClient();

  // Find the student's most recent Challenge attempt. This is more reliable
  // than requiring a participant row to still exist, because the submit
  // endpoint also writes a leaderboard entry for every completed challenge.
  const { data: attempts } = await admin
    .from('exam_attempts')
    .select('id, started_at, config')
    .eq('student_id', caller.id)
    .eq('mode', 'cbt')
    .order('started_at', { ascending: false })
    .limit(30);

  const challengeAttempt = ((attempts ?? []) as Attempt[]).find((attempt) => {
    const config = (attempt.config ?? {}) as { round_id?: string | null; challenge?: { round_id?: string | null } | null };
    return Boolean(config.round_id ?? config.challenge?.round_id);
  });

  let roundId: string | null = null;
  if (challengeAttempt) {
    const config = (challengeAttempt.config ?? {}) as { round_id?: string | null; challenge?: { round_id?: string | null } | null };
    roundId = config.round_id ?? config.challenge?.round_id ?? null;
  }

  // Compatibility fallback for older submissions that have a participant row
  // but whose attempt config is not populated in the expected shape.
  if (!roundId) {
    const { data: participant } = await admin
      .from('utme_challenge_participants')
      .select('round_id')
      .eq('student_id', caller.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    roundId = participant?.round_id ?? null;
  }

  if (!roundId) {
    return <div className="mx-auto max-w-4xl space-y-6 p-6 text-center"><div className="text-6xl">🏆</div><h1 className="text-2xl font-black">UTME Challenge Leaderboard</h1><p className="text-[var(--muted)]">You haven't joined a challenge yet.</p><Link href="/challenge" className="mt-2 inline-flex rounded-xl bg-orange-600 px-6 py-3 font-black text-white">Join Challenge →</Link></div>;
  }

  const { data: round } = await admin
    .from('challenge_rounds')
    .select('id, title, results_released')
    .eq('id', roundId)
    .maybeSingle();

  if (!round) return <div className="p-6 text-center">Unable to load leaderboard.</div>;

  if (!round.results_released) {
    return <div className="mx-auto max-w-4xl space-y-6 p-6 text-center"><h1 className="text-3xl font-black">🏆 UTME Challenge Leaderboard</h1><p className="text-[var(--muted)]">{round.title}</p><div className="rounded-[28px] border border-orange-200 bg-orange-50 p-10"><div className="text-5xl">🔒</div><h2 className="mt-4 text-2xl font-black">Results not released yet</h2><p className="mt-2 text-sm text-[var(--muted)]">Your score and ranking will appear here once the administrator releases the results.</p></div></div>;
  }

  // Use the leaderboard entries written at submission time. This guarantees
  // students who completed the Challenge are visible even if a participant
  // record is missing or has a different status.
  const { data: entries } = await admin
    .from('leaderboard_entries')
    .select('attempt_id, student_id, category, score, time_used_seconds, created_at')
    .eq('category', round.id)
    .order('score', { ascending: false, nullsFirst: false })
    .order('time_used_seconds', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  const rows = (entries ?? []) as Entry[];
  const ids = [...new Set(rows.map((item) => item.student_id))];
  const { data: profiles } = ids.length
    ? await admin.from('profiles').select('id, full_name, display_name').in('id', ids)
    : { data: [] as { id: string; full_name: string | null; display_name: string | null }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name || p.full_name || 'Student']));

  let previousScore: number | null = null;
  let previousRank = 0;
  const leaderboard = rows.map((item, index) => {
    const score = Number(item.score ?? 0);
    const rank = previousScore !== null && score === previousScore ? previousRank : index + 1;
    previousScore = score;
    previousRank = rank;
    return { ...item, score, rank, student_name: names.get(item.student_id) ?? 'Student' };
  });

  const mine = leaderboard.find((item) => item.student_id === caller.id);

  return (
    <div className="mx-auto max-w-5xl space-y-7 p-6 pb-10">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Pinnacle Tutors Academy</p>
        <h1 className="mt-1 text-3xl font-black">🏆 UTME Challenge Leaderboard</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{round.title}</p>
      </section>

      {mine && <section className="rounded-[28px] bg-gradient-to-br from-orange-600 to-red-500 p-6 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-100">Your Result</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white/15 p-5"><p className="text-sm text-orange-100">Your Rank</p><p className="mt-1 text-4xl font-black">#{mine.rank}</p></div><div className="rounded-2xl bg-white/15 p-5"><p className="text-sm text-orange-100">Your Score</p><p className="mt-1 text-4xl font-black">{mine.score}/400</p><p className="mt-1 text-xs text-orange-100">points</p></div></div></section>}

      <section>
        <h2 className="text-xl font-black">Rankings</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Every student who completed this Challenge appears here with their name, rank and score out of 400.</p>
        {leaderboard.length === 0 ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center"><div className="text-5xl">🏆</div><h3 className="mt-4 text-xl font-black">No submitted results yet</h3></div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="grid grid-cols-[70px_1fr_120px] border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-black uppercase text-[var(--muted)] sm:grid-cols-[90px_1fr_140px] sm:px-6"><span>Rank</span><span>Student</span><span className="text-right">Score</span></div>
            {leaderboard.map((entry) => { const isMe = entry.student_id === caller.id; return <div key={`${entry.attempt_id}-${entry.student_id}`} className={`grid grid-cols-[70px_1fr_120px] items-center border-b border-[var(--border)] px-4 py-4 last:border-0 sm:grid-cols-[90px_1fr_140px] sm:px-6 ${isMe ? 'bg-orange-50 dark:bg-orange-950/30' : ''}`}><div className="font-black">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}</div><div className="truncate font-black">{entry.student_name}{isMe && <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700">You</span>}</div><div className="text-right font-black text-emerald-600">{entry.score}/400</div></div>; })}
          </div>
        )}
      </section>
    </div>
  );
}
