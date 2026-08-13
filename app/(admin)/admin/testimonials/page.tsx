'use client';

import { FormEvent, useEffect, useState } from 'react';

type Testimonial = {
  id: string;
  student_name: string;
  exam_type: 'jamb' | 'waec';
  score: string;
  year: number;
  message: string;
  is_published: boolean;
};

export default function TestimonialsAdminPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [studentName, setStudentName] = useState('');
  const [examType, setExamType] = useState<'jamb' | 'waec'>('jamb');
  const [score, setScore] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [testimonial, setTestimonial] = useState('');

  async function loadTestimonials() {
    try {
      const response = await fetch('/api/testimonials');

      if (!response.ok) {
        setTestimonials([]);
        return;
      }

      const data = await response.json();
      setTestimonials(data.testimonials ?? []);
    } catch {
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTestimonials();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentName.trim() || !score.trim() || !testimonial.trim()) {
      setMessage('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_name: studentName.trim(),
          exam_type: examType,
          score: score.trim(),
          year,
          message: testimonial.trim(),
          is_published: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? 'Could not save testimonial.');
        return;
      }

      setStudentName('');
      setScore('');
      setTestimonial('');
      setMessage('Testimonial added successfully!');

      await loadTestimonials();
    } catch {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/testimonials/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_published: !published,
      }),
    });

    await loadTestimonials();
  }

  async function deleteTestimonial(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this testimonial?'
    );

    if (!confirmed) return;

    await fetch(`/api/testimonials/${id}`, {
      method: 'DELETE',
    });

    await loadTestimonials();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
          Admin Management
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-900">
          Testimonials
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Add JAMB and WAEC success stories that can appear on the student
          dashboard.
        </p>
      </div>

      {/* Add testimonial */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          Add Success Story
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Published testimonials will be shown to students.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Student Name
              </label>

              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="e.g. Chinedu Okafor"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Exam
              </label>

              <select
                value={examType}
                onChange={(event) =>
                  setExamType(event.target.value as 'jamb' | 'waec')
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="jamb">JAMB</option>
                <option value="waec">WAEC</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Score / Result
              </label>

              <input
                value={score}
                onChange={(event) => setScore(event.target.value)}
                placeholder="e.g. 375"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Year
              </label>

              <input
                type="number"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Testimonial
            </label>

            <textarea
              value={testimonial}
              onChange={(event) => setTestimonial(event.target.value)}
              rows={5}
              placeholder="Tell students how Pinnacle Tutors Academy helped this student..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {message && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add Testimonial'}
          </button>
        </form>
      </section>

      {/* Existing testimonials */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-900">
            Existing Testimonials
          </h2>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Loading testimonials...
          </div>
        ) : testimonials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-4xl">⭐</div>

            <p className="mt-3 font-bold text-slate-800">
              No testimonials yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add your first JAMB or WAEC success story above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900">
                        {item.student_name}
                      </h3>

                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700">
                        {item.exam_type}
                      </span>

                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        {item.score}
                      </span>

                      <span className="text-xs font-medium text-slate-400">
                        {item.year}
                      </span>
                    </div>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      “{item.message}”
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() =>
                        togglePublished(item.id, item.is_published)
                      }
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${
                        item.is_published
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.is_published ? 'Published' : 'Hidden'}
                    </button>

                    <button
                      onClick={() => deleteTestimonial(item.id)}
                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
