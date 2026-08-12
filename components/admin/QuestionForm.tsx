'use client';

import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

interface Subject { id: string; name: string; }
interface Topic { id: string; name: string; }

export interface QuestionFormValue {
  subject_id: string;
  topic_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  exam_type: 'jamb' | 'waec' | 'utme' | 'general';
  year: string;
}

export const emptyQuestion: QuestionFormValue = {
  subject_id: '', topic_id: '', question_text: '',
  option_a: '', option_b: '', option_c: '', option_d: '',
  correct_answer: 'A', explanation: '', difficulty: 'medium', exam_type: 'general', year: '',
};

export function QuestionForm({
  initial, onSubmit, submitLabel, loading,
}: {
  initial: QuestionFormValue;
  onSubmit: (value: QuestionFormValue) => void;
  submitLabel: string;
  loading: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects);
  }, []);

  useEffect(() => {
    if (!value.subject_id) { setTopics([]); return; }
    fetch(`/api/topics?subject_id=${value.subject_id}`).then((r) => r.json()).then(setTopics);
  }, [value.subject_id]);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}
      className="max-w-2xl"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
          <select
            required value={value.subject_id}
            onChange={(e) => setValue({ ...value, subject_id: e.target.value, topic_id: '' })}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Topic (optional)</label>
          <select
            value={value.topic_id}
            onChange={(e) => setValue({ ...value, topic_id: e.target.value })}
            disabled={!value.subject_id}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-50"
          >
            <option value="">No topic</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Question text</label>
        <textarea
          required rows={3} value={value.question_text}
          onChange={(e) => setValue({ ...value, question_text: e.target.value })}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      {(['A', 'B', 'C', 'D'] as const).map((letter) => (
        <FormField
          key={letter}
          label={`Option ${letter}`}
          required
          value={value[`option_${letter.toLowerCase()}` as 'option_a']}
          onChange={(e) => setValue({ ...value, [`option_${letter.toLowerCase()}`]: e.target.value })}
        />
      ))}

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Correct answer</label>
        <div className="flex gap-2">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => (
            <button
              type="button" key={letter}
              onClick={() => setValue({ ...value, correct_answer: letter })}
              className={`h-11 w-11 rounded-lg border text-sm font-bold ${
                value.correct_answer === letter
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Explanation (optional)</label>
        <textarea
          rows={2} value={value.explanation}
          onChange={(e) => setValue({ ...value, explanation: e.target.value })}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Difficulty</label>
          <select
            value={value.difficulty}
            onChange={(e) => setValue({ ...value, difficulty: e.target.value as QuestionFormValue['difficulty'] })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Exam type</label>
          <select
            value={value.exam_type}
            onChange={(e) => setValue({ ...value, exam_type: e.target.value as QuestionFormValue['exam_type'] })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="general">General</option>
            <option value="jamb">JAMB</option>
            <option value="waec">WAEC</option>
            <option value="utme">UTME</option>
          </select>
        </div>
        <FormField
          label="Year" type="number" value={value.year}
          onChange={(e) => setValue({ ...value, year: e.target.value })}
        />
      </div>

      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
