'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ImportPreview, ParsedQuestion } from '@/types/database';

const PLACEHOLDER = `Question: What is the capital of Nigeria?
A. Lagos
B. Abuja
C. Kano
D. Ibadan
Answer: B
Explanation: Abuja has been Nigeria's capital since 1991.
Subject: Government
Topic: Nigerian Geography
Difficulty: Easy
Year: 2023
ExamType: JAMB

PASSAGE:
[Paste a comprehension passage here — every question below it will be linked to it]

Question 1: According to the passage, ...
A. ...
B. ...
C. ...
D. ...
Answer: A
Subject: English Language
Topic: Comprehension`;

type Preview = ImportPreview & { batch_id: string };

type ImportResult = {
  imported: number;
  failed: number;
  errors?: {
    question?: {
      question_text?: string;
      subject?: string;
    };
    reason?: string;
  }[];
  database_error?: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
};

export default function BulkImportPage() {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [includeDuplicates, setIncludeDuplicates] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  async function handlePreview() {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/bulk-import/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: rawText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Preview failed.');
      }

      setPreview(data);
      setExcludedIndices(new Set());
      setIncludeDuplicates(new Set());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;

    setLoading(true);
    setError('');

    try {
      const questionsToImport: ParsedQuestion[] = [
        ...preview.valid.filter(
          (_, i) => !excludedIndices.has(i)
        ),

        ...preview.duplicates
          .filter((_, i) => includeDuplicates.has(i))
          .map((d) => d.question),
      ];

      const res = await fetch('/api/bulk-import/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch_id: preview.batch_id,
          questions: questionsToImport,
        }),
      });

      const data = await res.json();

      /*
       * IMPORTANT:
       * Even if the server returns an error status, keep the
       * actual database error so the admin can see it.
       */
      if (!res.ok) {
        setResult({
          imported: data.imported ?? 0,
          failed:
            data.failed ??
            data.preparation_errors?.length ??
            questionsToImport.length,
          errors: data.errors ?? data.preparation_errors ?? [],
          database_error: data.database_error,
        });

        return;
      }

      setResult({
        imported: data.imported ?? 0,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
        database_error: data.database_error,
      });

      /*
       * Only clear the import screen when the request actually
       * succeeded.
       */
      if (res.ok) {
        setPreview(null);
        setRawText('');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">
        Bulk Import Questions
      </h1>

      <p className="mt-1 text-slate-500">
        Paste any number of questions below, preview them, then
        confirm the import. Nothing is written to the question
        bank until you click Import.
      </p>

      {/* IMPORT RESULT */}
      {result && (
        <div className="mt-4 space-y-3">
          <div
            className={`rounded-lg px-4 py-3 ${
              result.failed > 0
                ? 'bg-red-50 text-red-800'
                : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            <p className="font-semibold">
              Imported {result.imported} question
              {result.imported === 1 ? '' : 's'}.
            </p>

            {result.failed > 0 && (
              <p className="mt-1">
                {result.failed} question
                {result.failed === 1 ? '' : 's'} failed.
              </p>
            )}
          </div>

          {/* DATABASE ERROR */}
          {result.database_error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <h3 className="font-semibold text-red-800">
                Database error
              </h3>

              <p className="mt-2 text-sm text-red-700">
                {result.database_error.message ||
                  'Unknown database error'}
              </p>

              {result.database_error.code && (
                <p className="mt-1 text-xs text-red-600">
                  Code: {result.database_error.code}
                </p>
              )}

              {result.database_error.details && (
                <p className="mt-1 text-xs text-red-600">
                  Details: {result.database_error.details}
                </p>
              )}

              {result.database_error.hint && (
                <p className="mt-1 text-xs text-red-600">
                  Hint: {result.database_error.hint}
                </p>
              )}
            </div>
          )}

          {/* INDIVIDUAL QUESTION ERRORS */}
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <h3 className="font-semibold text-red-800">
                Questions that failed
              </h3>

              <div className="mt-3 space-y-3">
                {result.errors.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-red-200 bg-white p-3"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {item.question?.question_text ||
                        `Question ${index + 1}`}
                    </p>

                    {item.question?.subject && (
                      <p className="mt-1 text-xs text-slate-500">
                        Subject: {item.question.subject}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-red-700">
                      {item.reason || 'Unknown error'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GENERAL ERROR */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* INPUT */}
      {!preview && (
        <>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={16}
            className="mt-4 w-full rounded-lg border border-slate-300 bg-white p-4 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />

          <Button
            onClick={handlePreview}
            loading={loading}
            disabled={!rawText.trim()}
            className="mt-3"
          >
            Preview import
          </Button>
        </>
      )}

      {/* PREVIEW */}
      {preview && (
        <div className="mt-4">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat
              label="Detected"
              value={preview.total_detected}
              tone="slate"
            />

            <Stat
              label="Valid"
              value={preview.valid.length}
              tone="emerald"
            />

            <Stat
              label="Needs fixing"
              value={preview.invalid.length}
              tone="red"
            />
          </div>

          {/* INVALID QUESTIONS */}
          {preview.invalid.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 font-semibold text-red-700">
                {preview.invalid.length} question(s) require correction
              </h2>

              <div className="space-y-2">
                {preview.invalid.map((err, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
                  >
                    <p className="font-medium text-red-700">
                      {err.reason}
                    </p>

                    <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                      {err.raw_text}
                    </pre>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Fix these in your source text and re-paste —
                valid questions below are unaffected.
              </p>
            </section>
          )}

          {/* DUPLICATES */}
          {preview.duplicates.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 font-semibold text-amber-700">
                {preview.duplicates.length} likely duplicate(s) —
                excluded by default
              </h2>

              <div className="space-y-2">
                {preview.duplicates.map((d, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={includeDuplicates.has(i)}
                      onChange={(e) => {
                        const next = new Set(includeDuplicates);

                        e.target.checked
                          ? next.add(i)
                          : next.delete(i);

                        setIncludeDuplicates(next);
                      }}
                      className="mt-1"
                    />

                    <span>{d.question.question_text}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* VALID QUESTIONS */}
          {preview.valid.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 font-semibold text-slate-800">
                {preview.valid.length} question(s) ready to import
              </h2>

              <div className="max-h-96 space-y-2 overflow-y-auto">
                {preview.valid.map((q, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!excludedIndices.has(i)}
                      onChange={(e) => {
                        const next = new Set(excludedIndices);

                        e.target.checked
                          ? next.delete(i)
                          : next.add(i);

                        setExcludedIndices(next);
                      }}
                      className="mt-1"
                    />

                    <span>
                      <span className="font-medium">
                        {q.question_text}
                      </span>

                      <span className="ml-2 text-xs text-slate-400">
                        {q.subject}
                        {q.topic ? ` · ${q.topic}` : ''}
                        {' · '}
                        {q.correct_answer}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* ACTIONS */}
          <div className="flex gap-3">
            <Button
              onClick={handleCommit}
              loading={loading}
              disabled={
                preview.valid.length === excludedIndices.size &&
                includeDuplicates.size === 0
              }
            >
              Import selected questions
            </Button>

            <Button
              variant="secondary"
              onClick={() => setPreview(null)}
            >
              Discard & re-paste
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'emerald' | 'red';
}) {
  const colors = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    red: 'text-red-700',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
      <p className={`text-2xl font-bold ${colors[tone]}`}>
        {value}
      </p>

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}
