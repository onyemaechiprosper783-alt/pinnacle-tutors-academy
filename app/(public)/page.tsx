import Link from 'next/link';

const FEATURES = [
  { icon: '🎯', title: 'JAMB Preparation', desc: 'Prepare with UTME-style questions across your subjects and build the confidence you need for exam day.' },
  { icon: '📚', title: 'WAEC Preparation', desc: 'Practice with questions designed around the WAEC syllabus and strengthen your understanding.' },
  { icon: '⚡', title: 'Practice Mode', desc: 'Learn at your own pace with instant feedback, explanations and performance tracking.' },
  { icon: '🏆', title: 'Mock Exams', desc: 'Experience realistic full-length examinations and discover where you need to improve.' },
  { icon: '💻', title: 'CBT Simulation', desc: 'Get comfortable with a timed computer-based testing experience before the real examination.' },
  { icon: '🔥', title: 'UTME Challenge', desc: 'Challenge yourself, improve your score and compete with other ambitious students.' },
];

const STATS = [
  { value: 'JAMB', label: 'Exam Preparation' },
  { value: 'WAEC', label: 'Exam Preparation' },
  { value: 'CBT', label: 'Realistic Practice' },
  { value: '24/7', label: 'Learn Anytime' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-[rgb(var(--background))] to-cyan-50 dark:from-indigo-950/40 dark:via-[rgb(var(--background))] dark:to-cyan-950/30" />
        <div className="absolute -left-24 top-20 -z-10 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute -right-24 top-40 -z-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-[rgb(var(--card))]/90 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm backdrop-blur dark:border-indigo-800 dark:text-indigo-200">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                Built for Nigerian students
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 dark:text-white sm:text-5xl md:text-6xl">
                Prepare smarter.
                <span className="block bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  Score higher.
                </span>
                Reach your pinnacle.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Pinnacle Tutors Academy gives you everything you need to prepare for JAMB and WAEC — realistic CBT practice, mock exams, instant feedback and a smarter way to learn.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="rounded-2xl bg-indigo-600 px-7 py-4 text-center font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700">
                  Start Practicing →
                </Link>
                <Link href="/jamb" className="rounded-2xl border border-indigo-200 bg-[rgb(var(--card))] px-7 py-4 text-center font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:text-indigo-600 dark:border-indigo-800 dark:text-slate-100">
                  Explore JAMB
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
                <span>✓ Practice questions</span><span>✓ Mock examinations</span><span>✓ CBT simulation</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-2xl" />
              <div className="card-surface relative rounded-[2rem] p-5 backdrop-blur">
                <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-900/10">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium text-indigo-100">Your learning journey</p><h2 className="mt-1 text-2xl font-black">Keep climbing 🚀</h2></div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">🎓</div>
                  </div>
                  <div className="mt-8 rounded-2xl bg-white/10 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm"><span className="text-indigo-100">Practice progress</span><span className="font-bold">82%</span></div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full w-[82%] rounded-full bg-white" /></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-indigo-100">Questions</p><p className="mt-1 text-2xl font-black">1,250+</p></div>
                    <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-indigo-100">Mock Tests</p><p className="mt-1 text-2xl font-black">100+</p></div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-indigo-50 p-4 text-center dark:bg-indigo-950/50"><div className="text-xl">📖</div><p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">Learn</p></div>
                  <div className="rounded-2xl bg-cyan-50 p-4 text-center dark:bg-cyan-950/40"><div className="text-xl">✍️</div><p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">Practice</p></div>
                  <div className="rounded-2xl bg-indigo-50 p-4 text-center dark:bg-indigo-950/50"><div className="text-xl">🏆</div><p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">Succeed</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((stat) => <div key={stat.label} className="card-surface rounded-2xl p-5 text-center"><p className="text-xl font-black text-indigo-600 dark:text-indigo-300">{stat.value}</p><p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-slate-50/70 py-20 dark:bg-slate-950/40">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">Everything you need</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Built to help you succeed</h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400">One platform for learning, practicing and preparing with confidence.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => <div key={feature.title} className="card-surface group rounded-3xl p-7 transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-900/10"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl transition group-hover:scale-110 dark:bg-indigo-950/60">{feature.icon}</div><h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{feature.desc}</p></div>)}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6"><div className="grid gap-6 md:grid-cols-2">
          <Link href="/jamb" className="group overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 to-indigo-500 p-8 text-white shadow-xl shadow-indigo-900/10 transition hover:-translate-y-1"><div className="text-4xl">🎯</div><h2 className="mt-6 text-3xl font-black">JAMB Preparation</h2><p className="mt-3 max-w-md leading-7 text-indigo-100">Build exam confidence with realistic UTME practice and mock examinations.</p><div className="mt-6 font-bold">Explore JAMB →</div></Link>
          <Link href="/waec" className="group overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-600 to-cyan-500 p-8 text-white shadow-xl shadow-cyan-900/10 transition hover:-translate-y-1"><div className="text-4xl">📚</div><h2 className="mt-6 text-3xl font-black">WAEC Preparation</h2><p className="mt-3 max-w-md leading-7 text-cyan-50">Strengthen your knowledge and prepare for your WAEC examinations with focused practice.</p><div className="mt-6 font-bold">Explore WAEC →</div></Link>
        </div></div>
      </section>

      <section className="px-5 pb-20 sm:px-6"><div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-14 text-center text-white shadow-2xl shadow-indigo-900/20 sm:px-12"><p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-100">Your future starts here</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Ready to reach your pinnacle?</h2><p className="mx-auto mt-4 max-w-xl text-indigo-100">Create your account and start preparing smarter today.</p><Link href="/register" className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50">Create Your Account →</Link></div></section>
    </main>
  );
}
