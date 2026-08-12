'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { Calculator } from '@/components/calculator/Calculator';
import { Button } from '@/components/ui/Button';
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

export function ExamRunner({ attemptId, mode, questions, durationSeconds }: ExamRunnerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const handleSubmit = useCallback(async (autoSubmitted = false) => {
    setSubmitting(true);
    await fetch(`/api/exams/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_submitted: autoSubmitted }),
    });
    router.push(`/results/${attemptId}`);
  }, [attemptId, router]);

  const timer = useExamTimer(durationSeconds, () => handleSubmit(true));

  async function selectAnswer(letter: 'A' | 'B' | 'C' | 'D') {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: letter }));

    const res = await fetch(`/api/exams/${attemptId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: currentQuestion.id, selected_answer: letter }),
    });

    if (mode === 'practice') {
      const data = await res.json();
      if (data.correct_answer) {
        setFeedback((prev) => ({ ...prev, [currentQuestion.id]: data }));
      }
    }
  }

  const currentFeedback = feedback[currentQuestion?.id];
  const isMathOrScience = useMemo(() => true, []); // calculator always available; harmless for non-numeric subjects

  if (!currentQuestion) return <p className="p-8 text-center text-slate-400">No questions loaded.</p>;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header: progress + timer */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
        {durationSeconds ? (
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${timer.isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            ⏱ {timer.display}
          </span>
        ) : (
          <span className="text-sm text-slate-400">Untimed</span>
        )}
      </div>

      {/* Question navigation grid */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-8 w-8 shrink-0 rounded-md text-xs font-semibold ${
                isCurrent ? 'bg-emerald-600 text-white' :
                isAnswered ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-500'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-5 text-lg font-medium leading-relaxed text-slate-900">
          {currentQuestion.question_text}
        </p>

        <div className="space-y-2.5">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
            const optionText = currentQuestion[`option_${letter.toLowerCase()}` as 'option_a'];
            const isSelected = answers[currentQuestion.id] === letter;
            const showResult = mode === 'practice' && currentFeedback;
            const isCorrectOption = showResult && currentFeedback.correct_answer === letter;
            const isWrongSelected = showResult && isSelected && !currentFeedback.is_correct;

            return (
              <button
                key={letter}
                onClick={() => !currentFeedback && selectAnswer(letter)}
                disabled={mode === 'practice' && !!currentFeedback}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-base transition-colors ${
                  isCorrectOption ? 'border-emerald-500 bg-emerald-50' :
                  isWrongSelected ? 'border-red-400 bg-red-50' :
                  isSelected ? 'border-emerald-500 bg-emerald-50' :
                  'border-slate-200 bg-white active:bg-slate-50'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  isSelected || isCorrectOption ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {letter}
                </span>
                <span>{optionText}</span>
              </button>
            );
          })}
        </div>

        {mode === 'practice' && currentFeedback && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${currentFeedback.is_correct ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-semibold">{currentFeedback.is_correct ? 'Correct!' : `Incorrect — the answer is ${currentFeedback.correct_answer}`}</p>
            {currentFeedback.explanation && <p className="mt-1 text-slate-600">{currentFeedback.explanation}</p>}
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button variant="secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
          Previous
        </Button>
        <Button variant="ghost" onClick={() => setShowCalculator((s) => !s)}>
          {showCalculator ? 'Hide' : 'Calculator'}
        </Button>
        {currentIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex((i) => i + 1)}>Next</Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)}>Submit</Button>
        )}
      </div>

      {showCalculator && (
        <div className="fixed bottom-20 right-4 z-20 md:bottom-4">
          <Calculator onClose={() => setShowCalculator(false)} />
        </div>
      )}

      {/* Bottom submit bar (always accessible, not just on last question) */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 md:static md:mt-4 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <span className="text-sm text-slate-500">{answeredCount} of {questions.length} answered</span>
        <Button variant="danger" onClick={() => setShowConfirm(true)}>End & Submit</Button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-bold text-slate-900">Submit your exam?</h3>
            <p className="mb-5 text-sm text-slate-500">
              You&apos;ve answered {answeredCount} of {questions.length} questions.
              {answeredCount < questions.length && ' Unanswered questions will be marked incorrect.'}
              {' '}This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowConfirm(false)}>Keep working</Button>
              <Button variant="danger" fullWidth loading={submitting} onClick={() => handleSubmit(false)}>Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
