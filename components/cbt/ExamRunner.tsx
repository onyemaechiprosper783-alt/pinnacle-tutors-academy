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

export function ExamRunner({
  attemptId,
  mode,
  questions,
  durationSeconds,
}: ExamRunnerProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, 'A' | 'B' | 'C' | 'D'>
  >({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [answerLoading, setAnswerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submitting) return;

      setSubmitting(true);

      try {
        await fetch(`/api/exams/${attemptId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auto_submitted: autoSubmitted }),
        });

        router.push(`/results/${attemptId}`);
      } catch {
        setSubmitting(false);
      }
    },
    [attemptId, router, submitting]
  );

  const timer = useExamTimer(durationSeconds, () => handleSubmit(true));

  async function selectAnswer(letter: 'A' | 'B' | 'C' | 'D') {
    if (!currentQuestion || answerLoading) return;

    // In practice mode, don't allow changing an answer after feedback.
    if (mode === 'practice' && feedback[currentQuestion.id]) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: letter,
    }));

    setAnswerLoading(true);

    try {
      const res = await fetch(
        `/api/exams/${attemptId}/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question_id: currentQuestion.id,
            selected_answer: letter,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Could not save answer.');
      }

      // Practice gives immediate feedback.
      if (mode === 'practice') {
        if (
          data.correct_answer === 'A' ||
          data.correct_answer === 'B' ||
          data.correct_answer === 'C' ||
          data.correct_answer === 'D'
        ) {
          setFeedback((prev) => ({
            ...prev,
            [currentQuestion.id]: {
              is_correct: Boolean(data.is_correct),
              correct_answer: data.correct_answer,
              explanation: data.explanation ?? null,
            },
          }));
        }
      }
    } catch (error) {
      console.error('Answer submission error:', error);
    } finally {
      setAnswerLoading(false);
    }
  }

  const currentFeedback = currentQuestion
    ? feedback[currentQuestion.id]
    : undefined;

  const isMathOrScience = useMemo(() => true, []);

  if (!currentQuestion) {
    return (
      <p className="p-8 text-center text-slate-400">
        No questions loaded.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          Question {currentIndex + 1} of {questions.length}
        </span>

        {durationSeconds ? (
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              timer.isLow
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            ⏱ {timer.display}
          </span>
        ) : (
          <span className="text-sm text-slate-400">Untimed</span>
        )}
      </div>

      {/* Question navigation */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = i === currentIndex;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`h-8 w-8 shrink-0 rounded-md text-xs font-semibold ${
                isCurrent
                  ? 'bg-emerald-600 text-white'
                  : isAnswered
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-5 text-lg font-medium leading-relaxed text-slate-900">
          {currentQuestion.question_text}
        </p>

        <div className="space-y-2.5">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
            const optionText =
              currentQuestion[
                `option_${letter.toLowerCase()}` as 'option_a'
              ];

            const isSelected =
              answers[currentQuestion.id] === letter;

            const showResult =
              mode === 'practice' && !!currentFeedback;

            const isCorrectOption =
              showResult &&
              currentFeedback.correct_answer === letter;

            const isWrongSelected =
              showResult &&
              isSelected &&
              !currentFeedback.is_correct;

            return (
              <button
                key={letter}
                type="button"
                onClick={() => selectAnswer(letter)}
                disabled={
                  answerLoading ||
                  (mode === 'practice' && !!currentFeedback)
                }
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-base transition-colors ${
                  isCorrectOption
                    ? 'border-emerald-500 bg-emerald-50'
                    : isWrongSelected
                      ? 'border-red-400 bg-red-50'
                      : isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white active:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isSelected || isCorrectOption
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {letter}
                </span>

                <span>{optionText}</span>
              </button>
            );
          })}
        </div>

        {/* Practice feedback */}
        {mode === 'practice' && currentFeedback && (
          <div
            className={`mt-5 rounded-xl p-4 ${
              currentFeedback.is_correct
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            <p className="text-base font-bold">
              {currentFeedback.is_correct
                ? '✓ Correct!'
                : `✗ Incorrect — the correct answer is ${currentFeedback.correct_answer}`}
            </p>

            {!currentFeedback.is_correct && (
              <p className="mt-2 text-sm font-medium">
                Correct answer: {currentFeedback.correct_answer}
              </p>
            )}

            {currentFeedback.explanation && (
              <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-slate-700">
                <p className="font-semibold">Explanation</p>
                <p className="mt-1">
                  {currentFeedback.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {answerLoading && (
          <p className="mt-3 text-center text-sm text-slate-400">
            Checking answer...
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          disabled={currentIndex === 0}
          onClick={() =>
            setCurrentIndex((i) => Math.max(0, i - 1))
          }
        >
          Previous
        </Button>

        <Button
          variant="ghost"
          onClick={() => setShowCalculator((s) => !s)}
        >
          {showCalculator ? 'Hide' : 'Calculator'}
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() =>
              setCurrentIndex((i) =>
                Math.min(questions.length - 1, i + 1)
              )
            }
          >
            Next
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)}>
            Submit
          </Button>
        )}
      </div>

      {/* Calculator */}
      {showCalculator && (
        <div className="fixed bottom-20 right-4 z-20 md:bottom-4">
          <Calculator
            onClose={() => setShowCalculator(false)}
          />
        </div>
      )}

      {/* Always-accessible submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-sm text-slate-500">
            {answeredCount} of {questions.length} answered
          </span>

          <Button
            variant="danger"
            onClick={() => setShowConfirm(true)}
          >
            End & Submit
          </Button>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 text-lg font-bold text-slate-900">
              Submit your exam?
            </h3>

            <p className="mb-5 text-sm text-slate-500">
              You&apos;ve answered {answeredCount} of{' '}
              {questions.length} questions.
              {answeredCount < questions.length &&
                ' Unanswered questions will be marked incorrect.'}{' '}
              This can&apos;t be undone.
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowConfirm(false)}
              >
                Keep working
              </Button>

              <Button
                variant="danger"
                fullWidth
                loading={submitting}
                onClick={() => handleSubmit(false)}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
