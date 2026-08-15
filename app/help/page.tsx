'use client';

import { useState } from 'react';

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How do I use Pinnacle Tutors?',
      answer:
        'Explore the different sections of the app to find educational resources, careers, institutions, bookmarks, and other useful features.',
    },
    {
      question: 'How do I save something to my bookmarks?',
      answer:
        'When a bookmark option is available, tap it to save the item. You can find your saved items in the Bookmarks section.',
    },
    {
      question: 'How can I send feedback?',
      answer:
        'Open the menu and select Feedback 💬. You can then tell us what you like or what you think we should improve.',
    },
    {
      question: 'I found a problem. What should I do?',
      answer:
        'Contact Pinnacle Tutors support on WhatsApp and explain the problem. We will help you as soon as possible.',
    },
  ];

  const whatsappLink =
    'https://wa.me/2347030539967?text=Hello%20Pinnacle%20Tutors%2C%20I%20need%20help%20with%20the%20app.';

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">❓</div>

          <h1 className="text-3xl font-bold text-gray-900">
            Help & Contact
          </h1>

          <p className="mt-3 text-gray-600">
            Need help? Find answers to common questions or contact us directly.
          </p>
        </div>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-gray-200"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpen(open === index ? null : index)
                  }
                  className="flex w-full items-center justify-between p-4 text-left font-semibold text-gray-900"
                >
                  <span>{faq.question}</span>

                  <span className="ml-3 text-xl">
                    {open === index ? '−' : '+'}
                  </span>
                </button>

                {open === index && (
                  <div className="border-t border-gray-200 px-4 py-4 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mb-3 text-4xl">💬</div>

          <h2 className="text-xl font-bold text-gray-900">
            Need More Help?
          </h2>

          <p className="mt-2 text-gray-600">
            Chat directly with Pinnacle Tutors support on WhatsApp.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Chat With Us on WhatsApp 💬
          </a>

          <p className="mt-3 text-sm text-gray-500">
            We’ll be happy to help you.
          </p>
        </section>
      </div>
    </main>
  );
}
