'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function FeedbackPage() {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setLoading(true);
    setError('');

    const supabase = createClient();

    const { error } = await supabase.from('feedback').insert({
      message: message.trim(),
    });

    if (error) {
      console.error(error);
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setMessage('');
    setSent(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Feedback 💬
          </h1>

          <p className="mt-2 text-gray-600">
            We’d love to hear from you. Tell us what you think about Pinnacle
            Tutors.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {sent ? (
            <div className="py-8 text-center">
              <div className="mb-4 text-5xl">🎉</div>

              <h2 className="text-2xl font-bold text-gray-900">
                Thank You!
              </h2>

              <p className="mt-2 text-gray-600">
                Thank you for your feedback! ❤️
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Your feedback has been received successfully.
              </p>

              <button
                onClick={() => setSent(false)}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Send More Feedback
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="feedback"
                  className="mb-2 block font-semibold text-gray-800"
                >
                  Your Feedback
                </label>

                <textarea
                  id="feedback"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you like, what we can improve, or anything you'd like to see..."
                  rows={7}
                  className="w-full rounded-xl border border-gray-300 p-4 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Submit Feedback 💬'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
