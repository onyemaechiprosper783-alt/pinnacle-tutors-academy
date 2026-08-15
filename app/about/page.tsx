'use client';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🎓</div>

          <h1 className="text-3xl font-bold text-gray-900">
            About Pinnacle Tutors
          </h1>

          <p className="mt-3 text-gray-600">
            Helping students learn, grow, and reach their academic goals.
          </p>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-gray-900">
              What is Pinnacle Tutors?
            </h2>

            <p className="leading-7 text-gray-600">
              Pinnacle Tutors is an educational platform designed to help
              students discover learning resources, improve their knowledge,
              and make better decisions about their education.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-gray-900">
              Our Mission
            </h2>

            <p className="leading-7 text-gray-600">
              Our mission is to make learning easier and more accessible by
              providing students with useful educational tools, resources,
              guidance, and opportunities.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-gray-900">
              What You Can Do
            </h2>

            <div className="space-y-3 text-gray-600">
              <p>📚 Discover educational resources.</p>
              <p>🎓 Explore careers and institutions.</p>
              <p>🔖 Save useful content with bookmarks.</p>
              <p>💬 Send feedback and suggestions.</p>
              <p>🚀 Continue building your academic future.</p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-gray-900">
              Built for Students ❤️
            </h2>

            <p className="leading-7 text-gray-600">
              Pinnacle Tutors is built with students in mind. We want to
              create a simple, helpful, and welcoming place where students
              can learn and plan for their future.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
