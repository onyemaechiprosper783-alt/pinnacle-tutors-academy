'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Round {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  duration_seconds: number;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
}

interface Subject {
  id: string;
  name: string;
  exam_types?: string[];
}

const CHALLENGE_COLORS = [
  { shell: 'from-violet-600 via-purple-600 to-fuchsia-500', soft: 'bg-violet-50 text-violet-700', icon: '🏆' },
  { shell: 'from-orange-500 via-amber-500 to-yellow-400', soft: 'bg-orange-50 text-orange-700', icon: '🔥' },
  { shell: 'from-sky-600 via-blue-600 to-cyan-500', soft: 'bg-sky-50 text-sky-700', icon: '⚡' },
  { shell: 'from-emerald-600 via-green-600 to-lime-500', soft: 'bg-emerald-50 text-emerald-700', icon: '🎯' },
];

const SUBJECT_ICONS: Record<string, string> = {
  mathematics: '∑',
  physics: '⚛️',
  chemistry: '🧪',
  biology: '🧬',
  economics: '📈',
  government: '🏛️',
  literature: '📚',
  geography: '🌍',
  commerce: '💼',
  accounting: '🧮',
  computer: '💻',
};

function subjectIcon(name: string) {
  const key = name.toLowerCase();
  const match = Object.keys(SUBJECT_ICONS).find((item) => key.includes(item));
  return match ? SUBJECT_ICONS[match] : '📖';
}

function formatCountdown(target: string | null, now: number) {
  if (!target) return 'Starting now';
  const remaining = Math.max(0, new Date(target).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDate(value: string | null) {
  if (!value) return 'Available now';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ChallengeLobbyPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadChallengeData() {
      try {
        setLoadingRounds(true);
        setError('');

        const [roundsRes, subjectsRes] = await Promise.all([
          fetch('/api/challenge/available', { cache: 'no-store' }),
          fetch('/api/subjects', { cache: 'no-store' }),
        ]);

        const roundsData = await roundsRes.json();
        const subjectsData = await subjectsRes.json();

        if (!roundsRes.ok) throw new Error(roundsData.error ?? 'Could not load challenge rounds.');
        if (!subjectsRes.ok) throw new Error(subjectsData.error ?? 'Could not load subjects.');

        setRounds(Array.isArray(roundsData) ? roundsData : []);
        const allSubjects: Subject[] = Array.isArray(subjectsData)
          ? subjectsData
          : subjectsData.subjects ?? [];
        setSubjects(allSubjects.filter((subject) => subject.exam_types?.includes('jamb')));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load challenge.');
      } finally {
        setLoadingRounds(false);
      }
    }

    loadChallengeData();
  }, []);

  const liveRounds = useMemo(
    () => rounds.filter((round) => !round.opens_at || new Date(round.opens_at).getTime() <= now),
    [rounds, now]
  );

  const upcomingRounds = useMemo(
    () => rounds.filter((round) => round.opens_at && new Date(round.opens_at).getTime() > now),
    [rounds, now]
  );

  function isUpcoming(round: Round) {
    return Boolean(round.opens_at && new Date(round.opens_at).getTime() > now);
  }

  function toggleSubject(subjectId: string) {
    setError('');
    setSelectedSubjects((current) => {
      if (current.includes(subjectId)) return current.filter((id) => id !== subjectId);
      if (current.length >= 3) {
        setError('You can select exactly 3 JAMB subjects.');
        return current;
      }
      return [...current, subjectId];
    });
  }

  async function handleJoin() {
    setError('');
    if (!selectedRound) return setError('Please select a live challenge round.');
    if (isUpcoming(selectedRound)) return setError('This challenge has not opened yet.');
    if (selectedSubjects.length !== 3) return setError('Please select exactly 3 JAMB subjects.');
    if (!whatsappNumber.trim()) return setError('Please enter your WhatsApp number.');

    setJoining(true);
    try {
      const res = await fetch('/api/challenge/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: selectedRound.id,
          selected_subject_ids: selectedSubjects,
          whatsapp_number: whatsappNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not join challenge.');
      if (!data.attempt_id) throw new Error('Challenge started, but no exam attempt was returned.');
      router.push(`/challenge/${data.attempt_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join challenge.');
      setJoining(false);
    }
  }

  if (loadingRounds) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 pb-10">
        <div className="animate-pulse rounded-[28px] bg-slate-200 p-8">
          <div className="h-4 w-28 rounded bg-slate-300" />
          <div className="mt-3 h-9 max-w-md rounded bg-slate-300" />
          <div className="mt-3 h-4 max-w-xl rounded bg-slate-300" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-[24px] bg-slate-200" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="absolute -bottom-24 left-1/2 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm font-black text-amber-300"><span className="text-xl">🔥</span> UTME CHALLENGE</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Compete. Improve. Reach the Pinnacle.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Take scheduled JAMB challenges, compete with other students and build your place on the leaderboard.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
            <span className="rounded-full bg-white/10 px-3 py-2">🏆 Leaderboard</span>
            <span className="rounded-full bg-white/10 px-3 py-2">⚡ Timed CBT</span>
            <span className="rounded-full bg-white/10 px-3 py-2">📊 Performance</span>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {upcomingRounds.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Coming up</p><h2 className="mt-1 text-2xl font-black text-slate-900">Upcoming Challenges 🚀</h2><p className="mt-1 text-sm text-slate-500">Scheduled challenges appear here before they open.</p></div>
            <span className="hidden rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 sm:block">{upcomingRounds.length} scheduled</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingRounds.map((round, index) => {
              const style = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
              return (
                <article key={round.id} className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className={`bg-gradient-to-r ${style.shell} p-5 text-white`}>
                    <div className="flex items-start justify-between gap-4"><span className="text-4xl">{style.icon}</span><span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur">Upcoming</span></div>
                    <h3 className="mt-4 text-xl font-black">{round.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-white/85">Starts {formatDate(round.opens_at)}</p>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-lg font-black text-slate-900">{round.question_count}</div><div className="text-[10px] font-bold uppercase text-slate-500">Questions</div></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-lg font-black text-slate-900">{Math.round(round.duration_seconds / 60)}m</div><div className="text-[10px] font-bold uppercase text-slate-500">Duration</div></div>
                      <div className={`rounded-2xl p-3 ${style.soft}`}><div className="text-lg font-black">{round.difficulty}</div><div className="text-[10px] font-bold uppercase opacity-70">Level</div></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white"><span className="text-xs font-bold text-slate-300">Starts in</span><span className="text-lg font-black tabular-nums">{formatCountdown(round.opens_at, now)}</span></div>
                    <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-400">🔒 Join when challenge opens</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Live now</p><h2 className="mt-1 text-2xl font-black text-slate-900">Challenges You Can Join 🏆</h2><p className="mt-1 text-sm text-slate-500">Choose a live round and prepare to compete.</p></div>
          <span className="hidden rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 sm:block">{liveRounds.length} live</span>
        </div>

        {liveRounds.length === 0 ? (
          <div className="overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-4xl">⏳</div>
            <h3 className="mt-5 text-xl font-black text-slate-900">No live challenge right now</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Don't worry — scheduled challenges will appear in the Upcoming Challenges section as soon as the admin creates them.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {liveRounds.map((round, index) => {
              const selected = selectedRound?.id === round.id;
              const style = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
              return (
                <button key={round.id} type="button" onClick={() => { setSelectedRound(round); setError(''); }} className={`group overflow-hidden rounded-[26px] border text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${selected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 bg-white'}`}>
                  <div className={`bg-gradient-to-r ${style.shell} p-5 text-white`}>
                    <div className="flex items-center justify-between gap-3"><span className="text-4xl">{style.icon}</span><span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase backdrop-blur">Live</span></div>
                    <h3 className="mt-4 text-xl font-black">{round.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-white/85">{round.question_count} questions • {Math.round(round.duration_seconds / 60)} minutes</p>
                  </div>
                  <div className="flex items-center justify-between p-5"><div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${style.soft}`}>{round.difficulty}</span><p className="mt-2 text-xs font-semibold text-slate-500">Tap to select this challenge</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-transparent'}`}>✓</span></div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedRound && !isUpcoming(selectedRound) && (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-brand-50 px-5 py-5 sm:px-7"><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600">Your challenge setup</p><h2 className="mt-1 text-xl font-black text-slate-900">Choose your 3 JAMB subjects</h2><p className="mt-1 text-sm leading-5 text-slate-500">English Language and The Lekki Headmaster are automatically included.</p></div>
          <div className="p-5 sm:p-7">
            {subjects.length === 0 ? <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">No JAMB subjects are currently available.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {subjects.map((subject, index) => {
                const selected = selectedSubjects.includes(subject.id);
                const style = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
                return <button key={subject.id} type="button" onClick={() => toggleSubject(subject.id)} className={`relative min-h-[112px] overflow-hidden rounded-[22px] border p-4 text-left transition active:scale-[0.98] ${selected ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'}`}><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.shell}`} /><div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${style.soft}`}>{subjectIcon(subject.name)}</div><p className="mt-3 line-clamp-2 text-sm font-black text-slate-900">{subject.name}</p><span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-transparent'}`}>✓</span></button>;
              })}
            </div>}

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div><label htmlFor="whatsapp" className="mb-2 block text-sm font-black text-slate-800">WhatsApp number</label><input id="whatsapp" type="tel" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="e.g. 08012345678" className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100" /></div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3.5 text-white sm:min-w-[250px]"><div><p className="text-[10px] font-bold uppercase text-slate-400">Selected</p><p className="text-lg font-black">{selectedSubjects.length}/3 subjects</p></div><span className="text-2xl">🎯</span></div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button loading={joining} onClick={handleJoin} disabled={selectedSubjects.length !== 3 || !whatsappNumber.trim()}>Join Challenge 🚀</Button></div>
          </div>
        </section>
      )}
    </div>
  );
}
