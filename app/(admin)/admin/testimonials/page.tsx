'use client';

import { FormEvent, useEffect, useState } from 'react';

type Testimonial = {
  id: string;
  student_name: string;
  exam_type: 'jamb' | 'waec';
  score: string;
  year: number;
  message: string;
  photo_url: string | null;
  is_published: boolean;
};

export default function TestimonialsAdminPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.');
      event.target.value = '';
      setPhotoPreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Photo must be 5MB or smaller.');
      event.target.value = '';
      setPhotoPreview(null);
      return;
    }
    setMessage('');
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentName.trim() || !score.trim() || !testimonial.trim()) {
      setMessage('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setMessage('');

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      formData.set('student_name', studentName.trim());
      formData.set('exam_type', examType);
      formData.set('score', score.trim());
      formData.set('year', String(year));
      formData.set('message', testimonial.trim());
      formData.set('is_published', 'true');

      const response = await fetch('/api/testimonials', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? 'Could not save testimonial.');
        return;
      }

      setStudentName('');
      setScore('');
      setTestimonial('');
      setYear(new Date().getFullYear());
      setPhotoPreview(null);
      form.reset();
      setExamType('jamb');
      setMessage('Testimonial added successfully! 🎉');
      await loadTestimonials();
    } catch {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(id: string, published: boolean) {
    try {
      const response = await fetch(`/api/testimonials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !published }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? 'Could not update testimonial.');
        return;
      }
      await loadTestimonials();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update testimonial.');
    }
  }

  async function deleteTestimonial(id: string) {
    const confirmed = window.confirm('Are you sure you want to delete this testimonial?');
    if (!confirmed) return;

    setMessage('Deleting testimonial...');

    try {
      const response = await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('TESTIMONIAL DELETE RESPONSE:', response.status, data);
        setMessage(data.error ? `Could not delete testimonial: ${data.error}` : `Could not delete testimonial (HTTP ${response.status}).`);
        return;
      }

      setMessage('Testimonial deleted successfully.');
      await loadTestimonials();
    } catch (error) {
      console.error('TESTIMONIAL DELETE REQUEST ERROR:', error);
      setMessage(error instanceof Error ? `Could not delete testimonial: ${error.message}` : 'Could not delete testimonial.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Admin Management</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Testimonials</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Add JAMB and WAEC success stories that can appear on the student dashboard.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Add Success Story</h2>
        <p className="mt-1 text-sm text-slate-500">Add a student photo, result and testimonial.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
