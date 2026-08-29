import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Round = { id: string; title: string; results_released: boolean; created_at: string };
type Entry = { id: string; participant_id: string; round_id: string; student_id: string; score: number | null; rank: number | null };
type Profile = { id: string; full_name: string | null; display_name: string | null };

export default async function LeaderboardPage() {
  const caller = await getCurrentProfile();
  if (!caller) return <div className="mx-auto max-w-4xl p-6 text-center"><h1 className="text-2xl font-black">Please log in</h1></div>;
  const admin = createAdminClient();

  const { data: rounds, error: roundsError } = await admin.from('challenge_rounds').select('id, title, results_released, created_at').eq('results_released', true).order('created_at', { ascending: false }).limit(50);
  if (roundsError) return <div className="p-6 text-center">Could not load challenge leaderboards.</div>;
  const releasedRounds = (rounds ?? []) as Round[];
  if (!releasedRounds.length) return <div className="mx-auto max-w-4xl space-y-6 p-6 text-center"><div className="text-6xl">🏆</div><h1 className="text-2xl font-black">UTME Challenge Leaderboards</h1><p className="text-[var(--muted)]">No challenge results have been released yet.</p></div>;

  const roundIds = releasedRounds.map((r) => r.id);
  const { data: entries, error: entriesError } = await admin.from('utme_challenge_leaderboard').select('id, participant_id, round_id, student_id, score, rank').in('round_id', roundIds).order('score', { ascending: false, nullsFirst: false }).order('rank', { ascending: true, nullsFirst: false });
  if (entriesError) return <div className="p-6 text-center">Could not load leaderboard results.</div>;

  const allEntries = (entries ?? []) as Entry[];
  const studentIds = [...new Set(allEntries.map((e) => e.student_id).filter(Boolean))];
  const { data: profiles } = studentIds.length ? await admin.from('profiles').select('id, full_name, display_name').in('id', studentIds) : { data: [] as Profile[] };
  const names = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p.display_name || p.full_name || 'Student']));

  const grouped = releasedRounds.map((round) => {
    const leaderboard = allEntries.filter((e) => e.round_id === round.id).sort((a, b) => Number(a.rank ?? Number.MAX_SAFE_INTEGER) - Number(b.rank ?? Number.MAX_SAFE_INTEGER) || Number(b.score ?? 0) - Number(a.score ?? 0));
    return { round, leaderboard };
  });

  return <div className="mx-auto max-w-5xl space-y-7 p-6 pb-10"><section><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Pinnacle Tutors Academy</p><h1 className="mt-1 text-3xl font-black">🏆 UTME Challenge Leaderboards</h1><p className="mt-2 text-sm text-[var(--muted)]">Every released challenge keeps its own permanent rankings.</p></section>{grouped.map(({ round, leaderboard }) => { const mine = leaderboard.find((e) => e.student_id === caller.id); return <section key={round.id} className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-sm"><div className="border-b border-[var(--border)] bg-[var(--background)] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-orange-600">Challenge Result</p><h2 className="mt-1 text-xl font-black">{round.title}</h2><p className="mt-1 text-xs text-[var(--muted)]">Results released • {new Date(round.created_at).toLocaleDateString('en-NG')}</p></div>{mine && <div className="rounded-2xl bg-orange-600 px-4 py-3 text-right text-white"><p className="text-[10px] font-black uppercase text-orange-100">Your result</p><p className="text-xl font-black">#{mine.rank} · {Number(mine.score ?? 0)}/400</p></div>}</div></div>{leaderboard.length === 0 ? <div className="p-8 text-center text-sm text-[var(--muted)]">No submitted results for this challenge.</div> : <div><div className="grid grid-cols-[70px_1fr_120px] border-b border-[var(--border)] px-4 py-3 text-xs font-black uppercase text-[var(--muted)] sm:grid-cols-[90px_1fr_140px] sm:px-6"><span>Rank</span><span>Student</span><span className="text-right">Score</span></div>{leaderboard.map((e) => { const isMe = e.student_id === caller.id; return <div key={e.id} className={`grid grid-cols-[70px_1fr_120px] items-center border-b border-[var(--border)] px-4 py-4 last:border-0 sm:grid-cols-[90px_1fr_140px] sm:px-6 ${isMe ? 'bg-orange-50 dark:bg-orange-950/30' : ''}`}><div className="font-black">{e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank ?? '-'}`}</div><div className="truncate font-black">{names.get(e.student_id) ?? 'Student'}{isMe && <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700">You</span>}</div><div className="text-right font-black text-emerald-600">{Number(e.score ?? 0)}/400</div></div>; })}</div>}</section>; })}</div>;
}
