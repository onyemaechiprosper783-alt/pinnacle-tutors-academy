import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Round = {
  id: string;
  title: string;
  results_released: boolean;
  closes_at: string | null;
  created_at: string;
};

type Entry = {
  attempt_id: string;
  student_id: string;
  score: number | null;
  time_used_seconds: number | null;
  created_at: string;
};

type Attempt = {
  id: string;
  config: unknown;
};

function getRoundId(config: unknown): string | null {
  if (!config || typeof config !== 'object') return null;
  const value = config as { round_id?: unknown; challenge?: { round_id?: unknown } | null };
  if (typeof value.round_id === 'string') return value.round_id;
  if (typeof value.challenge?.round_id === 'string') return value.challenge.round_id;
  return null;
}

export default async function LeaderboardPage() {
  const caller = await getCurrentProfile();
  if (!caller) {
    return <div className="mx-auto max-w-4xl p-6 text-center"><h1 className="text-2xl font-black">Please log in</h1></div>;
  }

  const admin = createAdminClient();
  const { data: rounds, error: roundsError } = await admin
    .from('challenge_rounds')
    .select('id, title, results_released, closes_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (roundsError) {
    return <div className="p-6 text-center">Could not load challenge leaderboards.</div>;
  }

  const releasedRounds = ((rounds ?? []) as Round[]).filter((round) => round.results_released);

  if (releasedRounds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6 text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="text-2xl font-black">UTME Challenge Leaderboards</h1>
        <p className="text-[var(--muted)]">No challenge results have been released yet.</p>
      </div>
    );
  }

  const { data: entries, error: entriesError } = await admin
    .from('leaderboard_entries')
    .select('attempt_id, student_id, score, time_used_seconds, created_at')
    .eq('category', 'utme_challenge')
    .order('score', { ascending: false, nullsFirst: false })
    .order('time_used_seconds', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (entriesError) {
    return <div className="p-6 text-center">Could not load leaderboard results.</div>;
  }

  const allEntries = (entries ?? []) as Entry[];
  const attemptIds = [...new Set(allEntries.map((entry) => entry.attempt_id).filter(Boolean))];
  const { data: attempts } = attemptIds.length
    ? await admin.from('exam_attempts').select('id, config').in('id', attemptIds)
    : { data: [] as Attempt[] };

  const attemptRound = new Map<string, string>();
  for (const attempt of (attempts ?? []) as Attempt[]) {
    const roundId = getRoundId(attempt.config);
    if (roundId) attemptRound.set(attempt.id, roundId);
  }

  const studentIds = [...new Set(allEntries.map((entry) => entry.student_id))];
  const { data: profiles } = studentIds.length
    ? await admin.from('profiles').select('id, full_name, display_name').in('id', studentIds)
    : { data: [] as { id: string; full_name: string | null; display_name: string | null }[] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name || profile.full_name || 'Student']));

  const releasedWithEntries = releasedRounds.map((round) => {
    const roundEntries = allEntries.filter((entry) => attemptRound.get(entry.attempt_id) === round.id);
    let previousScore: number | null = null;
    let previousRank = 0;
    const leaderboard = roundEntries.map((entry, index) => {
      const score = Number(entry.score ?? 0);
      const rank = previousScore !== null && score === previousScore ? previousRank : index + 1;
      previousScore = score;
      previousRank = rank;
      return { ...entry, score, rank, student_name: names.get(entry.student_id) ?? 'Student' };
    });
    return { round, leaderboard };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-7 p-6 pb-10">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Pinnacle Tutors Academy</p>
        <h1 className="mt-1 text-3xl font-black">🏆 UTME Challenge Leaderboards</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Every released challenge keeps its own permanent rankings.</p>
      </section>

      {releasedWithEntries.map(({ round, leaderboard }) => {
        const mine = leaderboard.find((entry) => entry.student_id === caller.id);
        return (
          <section key={round.id} className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="border-b border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-orange-600">Challenge Result</p>
                  <h2 className="mt-1 text-xl font-black">{round.title}</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">Results released • {new Date(round.created_at).toLocaleDateString('en-NG')}</p>
                </div>
                {mine && <div className="rounded-2xl bg-orange-600 px-4 py-3 text-right text-white"><p className="text-[10px] font-black uppercase text-orange-100">Your result</p><p className="text-xl font-black">#{mine.rank} · {mine.score}/400</p></div>}
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--muted)]">No submitted results for this challenge.</div>
            ) : (
              <div>
                <div className="grid grid-cols-[70px_1fr_120px] border-b border-[var(--border)] px-4 py-3 text-xs font-black uppercase text-[var(--muted)] sm:grid-cols-[90px_1fr_140px] sm:px-6">
                  <span>Rank</span><span>Student</span><span className="text-right">Score</span>
                </div>
                {leaderboard.map((entry) => {
                  const isMe = entry.student_id === caller.id;
                  return (
                    <div key={`${round.id}-${entry.attempt_id}`} className={`grid grid-cols-[70px_1fr_120px] items-center border-b border-[var(--border)] px-4 py-4 last:border-0 sm:grid-cols-[90px_1fr_140px] sm:px-6 ${isMe ? 'bg-orange-50 dark:bg-orange-950/30' : ''}`}>
                      <div className="font-black">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}</div>
                      <div className="truncate font-black">{entry.student_name}{isMe && <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700">You</span>}</div>
                      <div className="text-right font-black text-emerald-600">{entry.score}/400</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
