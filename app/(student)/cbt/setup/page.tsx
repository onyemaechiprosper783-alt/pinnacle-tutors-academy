'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Subject {
  id: string;
  name: string;
}

const OTHER_SUBJECT_COUNT = 3;
const CBT_QUESTION_COUNT = 180;
const CBT_DURATION_SECONDS = 120 * 60;

const SUBJECT_CARD_STYLES = [
  { gradient: 'from-sky-500 to-blue-600', soft: 'bg-sky-50 text-sky-700', icon: '∑' },
  { gradient: 'from-violet-500 to-purple-600', soft: 'bg-violet-50 text-violet-700', icon: '⚛️' },
  { gradient: 'from-rose-500 to-pink-600', soft: 'bg-rose-50 text-rose-700', icon: '🧪' },
  { gradient: 'from-emerald-500 to-green-600', soft: 'bg-emerald-50 text-emerald-700', icon: '🧬' },
  { gradient: 'from-amber-500 to-orange-600', soft: 'bg-amber-50 text-amber-700', icon: '📈' },
  { gradient: 'from-cyan-500 to-teal-600', soft: 'bg-cyan-50 text-cyan-700', icon: '🏛️' },
];

function getSubjectIcon(name: string, fallback: string) {
  const value = name.toLowerCase();
  if (value.includes('math')) return '∑';
  if (value.includes('physics')) return '⚛️';
  if (value.includes('chem')) return '🧪';
  if (value.includes('bio')) return '🧬';
  if (value.includes('econom')) return '📈';
  if (value.includes('government')) return '🏛️';
  if (value.includes('literature')) return '📚';
  if (value.includes('geography')) return '🌍';
  if (value.includes('commerce')) return '💼';
  if (value.includes('account')) return '🧮';
  if (value.includes('computer')) return '💻';
  return fallback;
}

export default function CbtSetupPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch('/api/subjects', { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load subjects.');
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load subjects.');
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjects();
  }, []);

  const availableSubjects = useMemo(
    () => subjects.filter((subject) => !subject.name.toLowerCase().includes('english')),
    [subjects]
  );

  function toggleSubject(id: string) {
    setError('');
    setSelectedSubjects((current) => {
      if (current.includes(id)) return current.filter((subjectId) => subjectId !== id);
      if (current.length >= OTHER_SUBJECT_COUNT) {
        setError('You can select only 3 additional subjects.');
        return current;
      }
      return [...current, id];
    });
  }

  function continueSetup() {
    if (selectedSubjects.length !== 3) {
      setError('Please select exactly 3 additional subjects.');
      return;
    }
    setError('');
    setStarted(true);
  }

  async function handleStart() {
    if (selectedSubjects.length !== 3) {
      setError('Please select exactly 3 additional subjects.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/exams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'cbt',
          subject_ids: selectedSubjects,
          question_count: CBT_QUESTION_COUNT,
          duration_seconds: CBT_DURATION_SECONDS,
          cbt_config: {
            english_question_count: 50,
            lekki_headmaster_count: 10,
            other_subject_question_count: 40,
            other_subject_ids: selectedSubjects,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start CBT exam.');
      router.push(`/cbt/${data.attempt_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start CBT exam.');
    } finally {
      setLoading(false);
    }
  }

  if (loadingSubjects) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-16 animate-pulse rounded-[24px] bg-slate-200" />
          <div className="h-40 animate-pulse rounded-[28px] bg-slate-200" />
          <div className="grid gap-3 sm:grid-cols-2"><div className="h-28 animate-pulse rounded-[24px] bg-slate-200" /><div className="h-28 animate-pulse rounded-[24px] bg-slate-200" /></div>
        </div>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 pb-28 pt-3 sm:px-6 sm:py-6">
        <div className="mx-auto w-full max-w-4xl">
          <header className="mb-4 flex items-center justify-between gap-3 rounded-[22px] bg-slate-900 px-4 py-3 text-white shadow-lg sm:px-5">
            <Link href="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl transition hover:bg-white/20" aria-label="Back">‹</Link>
            <h1 className="flex-1 text-xl font-black sm:text-2xl">Select Subjects</h1>
            <button type="button" onClick={continueSetup} disabled={selectedSubjects.length !== 3} className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">▶ Start</button>
          </header>

          <section className="relative mb-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-600 via-green-600 to-teal-500 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">JAMB UTME • Full CBT</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">Build your exam paper</h2><p className="mt-2 max-w-xl text-sm leading-5 text-emerald-50">English Language is compulsory. Select 3 additional subjects to create your 180-question, 2-hour simulation.</p></div>
                <div className="hidden text-6xl sm:block">📝</div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl"><div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur"><b className="text-lg">180</b><span className="mt-0.5 block text-[10px] font-bold uppercase text-white/75">Questions</span></div><div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur"><b className="text-lg">2h</b><span className="mt-0.5 block text-[10px] font-bold uppercase text-white/75">Duration</span></div><div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur"><b className="text-lg">4</b><span className="mt-0.5 block text-[10px] font-bold uppercase text-white/75">Subjects</span></div></div>
            </div>
          </section>

          {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">⚠️ {error}</div>}

          <section className="mb-4 rounded-[26px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-2xl text-white shadow-md">📚</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-emerald-950">English Language</h2><span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase text-white">Compulsory</span></div><p className="mt-1 text-xs font-semibold text-emerald-800">60 questions • 50 English + 10 Lekki Headmaster</p></div></div>
          </section>

          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Choose your combination</p><h2 className="mt-1 text-xl font-black text-slate-900">Additional Subjects</h2><p className="mt-1 text-sm text-slate-500">Pick exactly 3 subjects.</p></div><span className={`rounded-full px-4 py-2 text-sm font-black ${selectedSubjects.length === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{selectedSubjects.length}/3</span></div>

          <section className="grid gap-3 sm:grid-cols-2">
            {availableSubjects.map((subject, index) => {
              const selected = selectedSubjects.includes(subject.id);
              const style = SUBJECT_CARD_STYLES[index % SUBJECT_CARD_STYLES.length];
              return (
                <button key={subject.id} type="button" onClick={() => toggleSubject(subject.id)} className={`group relative overflow-hidden rounded-[24px] border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.985] sm:p-5 ${selected ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${style.gradient}`} />
                  <div className="flex items-center gap-4"><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${style.gradient} text-2xl text-white shadow-md transition group-hover:scale-105`}>{getSubjectIcon(subject.name, style.icon)}</div><div className="min-w-0 flex-1"><h3 className="truncate text-base font-black text-slate-900 sm:text-lg">{subject.name}</h3><p className="mt-1 text-xs font-bold text-slate-500">40 questions • Additional subject</p></div><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-transparent'}`}>✓</span></div>
                </button>
              );
            })}
          </section>

          {availableSubjects.length === 0 && <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">No additional subjects are available.</div>}

          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-200"><span className="text-2xl">🎯</span><p className="mt-2 text-xs font-bold uppercase text-slate-500">Your selection</p><p className="text-lg font-black text-slate-900">{selectedSubjects.length} / 3</p></div>
            <div className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-200"><span className="text-2xl">⏱️</span><p className="mt-2 text-xs font-bold uppercase text-slate-500">Time allowed</p><p className="text-lg font-black text-slate-900">2 hours</p></div>
            <div className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-200"><span className="text-2xl">🔄</span><p className="mt-2 text-xs font-bold uppercase text-slate-500">Question order</p><p className="text-lg font-black text-slate-900">Shuffle ready</p></div>
          </section>

          <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-300"><span className="font-black text-white">💡 Before you start:</span> The timer cannot be paused. Your answers are saved as you progress, and the exam automatically submits when the time expires.</div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0"><div className="mx-auto max-w-4xl"><Button onClick={continueSetup} fullWidth disabled={selectedSubjects.length !== 3}>Continue with {selectedSubjects.length}/3 subjects →</Button></div></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-4 flex items-center justify-between"><button type="button" onClick={() => setStarted(false)} className="text-sm font-black text-slate-600">← Edit subjects</button><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">READY</span></div>
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-slate-950 to-brand-900 p-6 text-white sm:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-200">Final check</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Ready to begin?</h1><p className="mt-2 text-sm leading-6 text-slate-300">Review your CBT configuration before starting.</p></div>
          {error && <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">⚠️ {error}</div>}
          <div className="space-y-3 p-5 sm:p-7">
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4"><div className="flex items-center gap-3"><span className="text-2xl">📚</span><span className="font-black text-emerald-950">English Language</span></div><span className="font-black text-emerald-800">60</span></div>
            {selectedSubjects.map((id, index) => { const subject = subjects.find((s) => s.id === id); const style = SUBJECT_CARD_STYLES[index % SUBJECT_CARD_STYLES.length]; return <div key={id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} text-white`}>{getSubjectIcon(subject?.name ?? '', style.icon)}</span><span className="truncate font-bold text-slate-800">{subject?.name ?? `Subject ${index + 2}`}</span></div><span className="font-black text-slate-900">40</span></div>; })}
          </div>
          <div className="mx-5 mb-5 rounded-[24px] bg-gradient-to-r from-emerald-600 to-teal-500 p-5 text-white shadow-lg sm:mx-7"><div className="grid grid-cols-2 gap-4 text-center"><div><p className="text-xs font-bold uppercase text-white/70">Total</p><p className="text-3xl font-black">180</p></div><div><p className="text-xs font-bold uppercase text-white/70">Time</p><p className="text-3xl font-black">2h</p></div></div><p className="mt-4 border-t border-white/20 pt-3 text-center text-xs font-semibold text-white/80">Includes 10 Lekki Headmaster questions automatically.</p></div>
          <div className="mx-5 mb-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 sm:mx-7">⚠️ Once started, the timer cannot be paused. There are no instant answers during the CBT. The exam automatically submits when the 2-hour time limit expires.</div>
          <div className="space-y-3 p-5 pt-0 sm:p-7 sm:pt-0"><Button onClick={handleStart} loading={loading} fullWidth>Start CBT Exam 🚀</Button><button type="button" onClick={() => setStarted(false)} disabled={loading} className="w-full rounded-2xl px-4 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">Go Back</button></div>
        </div>
      </div>
    </main>
  );
}
