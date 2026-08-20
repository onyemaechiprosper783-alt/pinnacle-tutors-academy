// Practice mode reveals the correct answer and explanation immediately after an answer is selected.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { Calculator } from '@/components/calculator/Calculator';
import type { QuestionPublic } from '@/types/database';

interface ExamRunnerProps {
  attemptId: string;
  mode: 'practice' | 'mock' | 'cbt';
  questions: QuestionPublic[];
  durationSeconds: number | null;
}

interface Feedback {
  is_correct: boolean;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string | null;
}

type QuestionWithSubject = QuestionPublic & {
  subject_id?: string;
  subject_name?: string;
  subject?: string;
  subjects?: { name?: string | null } | null;
  question?: QuestionWithSubject;
};

interface CbtSection { key: string; name: string; count: number; questions: QuestionWithSubject[]; }
interface AttemptResponse { attempt?: { config?: { challenge?: { global_deadline?: string | null } | null } | null } }

const ENGLISH_SUBJECT_ID = 'e5705892-de46-425c-af42-e37a3eddc93d';
const LEKKI_HEADMASTER_SUBJECT_ID = '3bca9d00-18fd-4064-b3ac-41da6e7eefa6';
const BOOKMARK_STORAGE_KEY = 'pinnacle-bookmarked-questions';

export function ExamRunner({ attemptId, mode, questions, durationSeconds }: ExamRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [answerError, setAnswerError] = useState<Record<string, string>>({});
  const [answerLoading, setAnswerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useState('english');
  const [challengeDeadline, setChallengeDeadline] = useState<string | null>(null);
  const [challengeSecondsLeft, setChallengeSecondsLeft] = useState<number | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(mode === 'cbt');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const handleSubmitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY) ?? '[]') as Array<{ id: string }>;
      setBookmarkedIds(new Set(saved.map((item) => item.id)));
    } catch { setBookmarkedIds(new Set()); }
  }, []);

  const normalizedQuestions = useMemo<QuestionWithSubject[]>(() => questions.map((raw) => {
    const item = raw as QuestionWithSubject;
    const nested = item.question;
    if (!nested) return item;
    return { ...nested, ...item, subject_id: nested.subject_id ?? item.subject_id, subject_name: nested.subject_name ?? item.subject_name, subject: nested.subject ?? item.subject, subjects: nested.subjects ?? item.subjects };
  }), [questions]);

  const getSubjectName = useCallback((question: QuestionWithSubject) => String(question.subjects?.name ?? question.subject_name ?? question.subject ?? '').trim(), []);

  const cbtSections = useMemo<CbtSection[]>(() => {
    if (mode !== 'cbt') return [];
    const english = normalizedQuestions.filter((q) => {
      const name = getSubjectName(q).toLowerCase();
      return q.subject_id === ENGLISH_SUBJECT_ID || q.subject_id === LEKKI_HEADMASTER_SUBJECT_ID || name.includes('english') || name.includes('lekki headmaster');
    });
    const otherGroups = new Map<string, QuestionWithSubject[]>();
    for (const question of normalizedQuestions) {
      const name = getSubjectName(question).toLowerCase();
      const isEnglish = question.subject_id === ENGLISH_SUBJECT_ID || question.subject_id === LEKKI_HEADMASTER_SUBJECT_ID || name.includes('english') || name.includes('lekki headmaster');
      if (isEnglish) continue;
      const key = question.subject_id ?? (getSubjectName(question) || 'unknown');
      otherGroups.set(key, [...(otherGroups.get(key) ?? []), question]);
    }
    const sections: CbtSection[] = [];
    if (english.length) sections.push({ key: 'english', name: 'English Language', count: 60, questions: english.slice(0, 60) });
    Array.from(otherGroups.entries()).slice(0, 3).forEach(([id, group], index) => sections.push({ key: `subject_${index + 1}_${id}`, name: getSubjectName(group[0]) || `Subject ${index + 1}`, count: 40, questions: group.slice(0, 40) }));
    if (sections.length === 4 && sections.every((section) => section.questions.length === section.count)) return sections;
    if (normalizedQuestions.length >= 180) return [
      { key: 'english', name: 'English Language', count: 60, questions: normalizedQuestions.slice(0, 60) },
      { key: 'subject_1', name: getSubjectName(normalizedQuestions[60]) || 'Subject 1', count: 40, questions: normalizedQuestions.slice(60, 100) },
      { key: 'subject_2', name: getSubjectName(normalizedQuestions[100]) || 'Subject 2', count: 40, questions: normalizedQuestions.slice(100, 140) },
      { key: 'subject_3', name: getSubjectName(normalizedQuestions[140]) || 'Subject 3', count: 40, questions: normalizedQuestions.slice(140, 180) },
    ];
    return sections.length ? sections : [{ key: 'all', name: 'Questions', count: normalizedQuestions.length, questions: normalizedQuestions }];
  }, [mode, normalizedQuestions, getSubjectName]);

  const activeSection = mode === 'cbt' ? cbtSections.find((section) => section.key === activeSectionKey) ?? cbtSections[0] : null;
  const sectionQuestions = mode === 'cbt' ? activeSection?.questions ?? [] : normalizedQuestions;
  const safeCurrentIndex = Math.min(currentIndex, Math.max(sectionQuestions.length - 1, 0));
  const currentQuestion = sectionQuestions[safeCurrentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const answeredInCurrentSection = sectionQuestions.filter((question) => !!answers[question.id]).length;
  const currentFeedback = currentQuestion ? feedback[currentQuestion.id] : undefined;
  const currentAnswerError = currentQuestion ? answerError[currentQuestion.id] : undefined;

  const toggleBookmark = useCallback((question: QuestionWithSubject) => {
    try {
      const saved = JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY) ?? '[]') as QuestionWithSubject[];
      const exists = saved.some((item) => item.id === question.id);
      const next = exists ? saved.filter((item) => item.id !== question.id) : [...saved, question];
      localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(next));
      setBookmarkedIds(new Set(next.map((item) => item.id)));
    } catch (error) { console.error('Bookmark error:', error); }
  }, []);

  useEffect(() => {
    if (mode !== 'cbt') { setChallengeLoading(false); return; }
    let cancelled = false;
    async function loadAttempt() {
      try {
        const response = await fetch(`/api/exams/${attemptId}`, { cache: 'no-store' });
        const data = (await response.json().catch(() => null)) as AttemptResponse | null;
        const deadline = data?.attempt?.config?.challenge?.global_deadline ?? null;
        if (!cancelled && response.ok && deadline) setChallengeDeadline(deadline);
      } catch (error) { console.error('Could not load challenge timing:', error); }
      finally { if (!cancelled) setChallengeLoading(false); }
    }
    void loadAttempt();
    return () => { cancelled = true; };
  }, [attemptId, mode]);

  const handleSubmit = useCallback(async (autoSubmitted = false) => {
    if (submitting) return;
    if (!autoSubmitted && mode !== 'practice' && typeof window !== 'undefined') {
      const message = unansweredCount === 0 ? 'Submit this exam now?' : `You still have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}. Submit anyway?`;
      if (!window.confirm(message)) return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/exams/${attemptId}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto_submitted: autoSubmitted }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? 'Could not submit exam.');
      router.push(`/results/${attemptId}`);
    } catch (error) { console.error('Submit error:', error); setSubmitting(false); }
  }, [attemptId, mode, router, submitting, unansweredCount]);

  useEffect(() => { handleSubmitRef.current = () => { void handleSubmit(true); }; }, [handleSubmit]);

  useEffect(() => {
    if (mode !== 'cbt' || !challengeDeadline) return;
    let stopped = false;
    const updateClock = () => {
      if (stopped) return;
      const remaining = Math.max(0, Math.ceil((new Date(challengeDeadline).getTime() - Date.now()) / 1000));
      setChallengeSecondsLeft(remaining);
      if (remaining <= 0) { stopped = true; handleSubmitRef.current?.(); }
    };
    updateClock();
    const interval = window.setInterval(updateClock, 500);
    return () => { stopped = true; window.clearInterval(interval); };
  }, [challengeDeadline, mode]);

  const normalTimer = useExamTimer(mode === 'cbt' && challengeDeadline ? null : durationSeconds, () => handleSubmit(true));

  const saveAnswer = useCallback(async (questionId: string, letter: 'A' | 'B' | 'C' | 'D') => {
    try {
      const response = await fetch(`/api/exams/${attemptId}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: questionId, selected_answer: letter }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? 'Could not save answer.');
      if (mode === 'practice') {
        if (data?.correct_answer && ['A', 'B', 'C', 'D'].includes(String(data.correct_answer).toUpperCase())) {
          const correctAnswer = String(data.correct_answer).toUpperCase() as Feedback['correct_answer'];
          setFeedback((previous) => ({ ...previous, [questionId]: { is_correct: Boolean(data.is_correct), correct_answer: correctAnswer, explanation: data.explanation ?? null } }));
          setAnswerError((previous) => { const next = { ...previous }; delete next[questionId]; return next; });
        } else {
          throw new Error('Answer was saved, but the correct answer was not returned.');
        }
      }
    } catch (error) {
      console.error('Answer error:', error);
      if (mode === 'practice') setAnswerError((previous) => ({ ...previous, [questionId]: error instanceof Error ? error.message : 'Could not load the answer.' }));
    }
  }, [attemptId, mode]);

  async function selectAnswer(letter: 'A' | 'B' | 'C' | 'D') {
    if (!currentQuestion || submitting) return;
    if (mode === 'practice' && (answerLoading || feedback[currentQuestion.id])) return;
    const questionId = currentQuestion.id;
    setAnswers((previous) => ({ ...previous, [questionId]: letter }));
    if (mode === 'practice') {
      setAnswerError((previous) => { const next = { ...previous }; delete next[questionId]; return next; });
      setAnswerLoading(true);
      try { await saveAnswer(questionId, letter); } finally { setAnswerLoading(false); }
      return;
    }
    void saveAnswer(questionId, letter);
  }

  function goNext() {
    if (safeCurrentIndex < sectionQuestions.length - 1) { setCurrentIndex((index) => index + 1); return; }
    if (mode === 'cbt') {
      const index = cbtSections.findIndex((section) => section.key === activeSectionKey);
      const next = cbtSections[index + 1];
      if (next) { setActiveSectionKey(next.key); setCurrentIndex(0); }
    }
  }

  function goPrevious() {
    if (safeCurrentIndex > 0) { setCurrentIndex((index) => index - 1); return; }
    if (mode === 'cbt') {
      const index = cbtSections.findIndex((section) => section.key === activeSectionKey);
      const previous = cbtSections[index - 1];
      if (previous) { setActiveSectionKey(previous.key); setCurrentIndex(Math.max(previous.questions.length - 1, 0)); }
    }
  }

  if (!currentQuestion) return <div className="mx-auto max-w-xl p-6"><div className="pta-card p-6 text-center"><h2 className="text-lg font-bold text-[var(--foreground)]">No questions loaded.</h2><p className="mt-2 text-sm text-[var(--muted)]">The exam could not load its questions.</p><button type="button" onClick={() => router.back()} className="mt-5 rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white">Go Back</button></div></div>;

  const displayTimer = mode === 'cbt' && challengeDeadline ? formatSeconds(challengeSecondsLeft ?? 0) : normalTimer.display;
  const timerIsLow = mode === 'cbt' && challengeDeadline ? (challengeSecondsLeft ?? 0) <= 300 : normalTimer.isLow;
  const isBookmarked = bookmarkedIds.has(currentQuestion.id);

  return (
    <div className="min-h-[100svh] bg-slate-950 text-white">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-3 py-2 sm:px-5 sm:py-3">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 pb-2"><div className="min-w-0"><div className="truncate text-xs font-bold uppercase tracking-wider text-accent-300 sm:text-sm">{mode === 'cbt' ? 'JAMB CBT' : mode === 'mock' ? 'Mock Examination' : 'Practice'}</div><div className="mt-0.5 text-[11px] text-slate-400">{answeredCount}/{questions.length} answered</div></div>{mode === 'cbt' && challengeLoading ? <div className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Checking time…</div> : <div className={`rounded-full px-3 py-1.5 text-xs font-black sm:px-4 sm:text-sm ${timerIsLow ? 'bg-red-600 text-white' : 'bg-accent-500 text-slate-950'}`}>⏱ {displayTimer}</div>}</header>

        {mode === 'cbt' && cbtSections.length > 0 && <nav className="my-2 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-900 p-1" aria-label="CBT subjects">{cbtSections.map((section) => { const active = activeSection?.key === section.key; const answered = section.questions.filter((q) => !!answers[q.id]).length; return <button key={section.key} type="button" onClick={() => { setActiveSectionKey(section.key); setCurrentIndex(0); }} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold transition sm:px-4 sm:text-xs ${active ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{section.name}<span className="ml-1 opacity-70">{answered}/{section.count}</span></button>; })}</nav>}

        <div className="my-2 flex shrink-0 items-center justify-between gap-2"><div className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-bold sm:px-4">Question {safeCurrentIndex + 1}/{sectionQuestions.length}</div><div className="flex items-center gap-1.5"><button type="button" onClick={() => toggleBookmark(currentQuestion)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold sm:px-3 sm:text-xs ${isBookmarked ? 'border-accent-400 bg-accent-400/10 text-accent-300' : 'border-slate-700 text-slate-300 hover:bg-slate-900'}`}>{isBookmarked ? '🔖 Saved' : '🔖 Save'}</button><button type="button" onClick={() => setShowCalculator((value) => !value)} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900 sm:px-3 sm:text-xs">🧮 Calc</button></div></div>

        {showCalculator && <div className="mb-2 shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-2"><Calculator /></div>}

        <main className="min-h-0 flex-1"><div className="h-full rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-xl sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{activeSection?.name ?? 'Question'}</span><span className="text-[10px] text-slate-500">{answeredInCurrentSection}/{sectionQuestions.length} answered</span></div><p className="mb-4 text-[15px] font-semibold leading-6 text-white sm:text-lg sm:leading-7">{currentQuestion.question_text}</p>

          {currentFeedback && mode === 'practice' && <div className={`mb-4 rounded-xl border p-4 ${currentFeedback.is_correct ? 'border-green-700 bg-green-950/40 text-green-100' : 'border-red-700 bg-red-950/40 text-red-100'}`}><p className="text-[11px] font-black uppercase tracking-wider opacity-80">Answer revealed</p><p className="mt-1 text-base font-black">{currentFeedback.is_correct ? 'Correct ✓' : 'Incorrect'}</p><p className="mt-1 text-sm font-bold">Correct answer: {currentFeedback.correct_answer}</p>{currentFeedback.explanation && <p className="mt-2 text-sm leading-6 text-slate-200"><span className="font-bold text-white">Explanation:</span> {currentFeedback.explanation}</p>}</div>}
          {currentAnswerError && mode === 'practice' && <div className="mb-4 rounded-xl border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-200"><p className="font-bold">We saved your answer, but could not reveal the correct answer yet.</p><p className="mt-1 text-xs opacity-80">{currentAnswerError}</p></div>}

          <div className="grid gap-2 sm:gap-2.5">{(['A', 'B', 'C', 'D'] as const).map((letter) => { const optionKey = `option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'; const selected = answers[currentQuestion.id] === letter; const correct = currentFeedback?.correct_answer === letter; const incorrectSelected = currentFeedback && selected && !currentFeedback.is_correct; return <button key={letter} type="button" onClick={() => void selectAnswer(letter)} disabled={answerLoading || submitting || (mode === 'practice' && !!currentFeedback)} className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left text-sm leading-5 transition sm:p-3.5 ${correct ? 'border-green-500 bg-green-500/10 text-green-200' : incorrectSelected ? 'border-red-500 bg-red-500/10 text-red-200' : selected ? 'border-accent-400 bg-accent-400/10 text-accent-100' : 'border-slate-700 bg-slate-950/50 text-slate-200 hover:border-brand-500 hover:bg-brand-950/40'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${selected || correct ? 'border-current' : 'border-slate-600'}`}>{letter}</span><span>{currentQuestion[optionKey]}</span></button>; })}</div>{answerLoading && <p className="mt-2 text-[10px] text-slate-500">Checking answer and revealing feedback…</p>}</div></main>

        <footer className="sticky bottom-0 z-20 mt-2 shrink-0 border-t border-slate-800 bg-slate-950/95 py-2 backdrop-blur"><div className="flex items-center justify-between gap-2"><button type="button" onClick={goPrevious} disabled={safeCurrentIndex === 0 && (mode !== 'cbt' || activeSectionKey === cbtSections[0]?.key)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4">← Previous</button><div className="flex items-center gap-2"><button type="button" onClick={() => void handleSubmit(false)} disabled={submitting} className="rounded-xl bg-accent-500 px-3.5 py-2 text-xs font-black text-slate-950 shadow-lg shadow-accent-900/20 transition hover:bg-accent-400 disabled:opacity-60 sm:px-5">{submitting ? 'Submitting…' : mode === 'practice' ? 'Finish Practice' : 'Submit Exam'}</button>{safeCurrentIndex < sectionQuestions.length - 1 || (mode === 'cbt' && cbtSections.findIndex((section) => section.key === activeSectionKey) < cbtSections.length - 1) ? <button type="button" onClick={goNext} disabled={submitting} className="rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-black text-white transition hover:bg-brand-500 disabled:opacity-60 sm:px-4">Next →</button> : null}</div></div><p className="mt-1 text-center text-[9px] text-slate-600">{mode === 'practice' ? 'Select an answer to see the correct answer and explanation immediately.' : 'You can submit with unanswered questions. They will be counted as unanswered, not as wrong.'}</p></footer>
      </div>
    </div>
  );
}

function formatSeconds(total: number) {
  const safe = Math.max(0, total);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
