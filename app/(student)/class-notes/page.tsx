import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile, createClient } from '@/lib/supabase/server';
import { hasActiveStudentAccess } from '@/lib/access/student-access';

type ClassNote = {
  id: string;
  title: string;
  description: string | null;
  exam_type: 'jamb' | 'waec' | 'both';
  subject: string;
  topic: string | null;
  file_name: string;
  video_url: string | null;
  created_at: string;
};

const CLASSROOM_STYLES = [
  { gradient: 'from-sky-600 via-blue-600 to-indigo-600', soft: 'bg-sky-50 text-sky-700', icon: '📘' },
  { gradient: 'from-emerald-600 via-green-600 to-teal-500', soft: 'bg-emerald-50 text-emerald-700', icon: '🧬' },
  { gradient: 'from-orange-500 via-amber-500 to-yellow-400', soft: 'bg-orange-50 text-orange-700', icon: '🧮' },
  { gradient: 'from-violet-600 via-purple-600 to-fuchsia-500', soft: 'bg-violet-50 text-violet-700', icon: '📚' },
  { gradient: 'from-rose-500 via-pink-600 to-red-500', soft: 'bg-rose-50 text-rose-700', icon: '🧪' },
  { gradient: 'from-cyan-600 via-teal-600 to-emerald-500', soft: 'bg-cyan-50 text-cyan-700', icon: '🌍' },
];

function classroomIcon(subject: string, fallback: string) {
  const value = subject.toLowerCase();
  if (value.includes('english')) return '📖';
  if (value.includes('math')) return '∑';
  if (value.includes('physics')) return '⚛️';
  if (value.includes('chem')) return '🧪';
  if (value.includes('bio')) return '🧬';
  if (value.includes('computer')) return '💻';
  if (value.includes('government')) return '🏛️';
  if (value.includes('econom')) return '📈';
  if (value.includes('geography')) return '🌍';
  if (value.includes('literature')) return '📚';
  return fallback;
}

export default async function ClassNotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  const hasAccess = await hasActiveStudentAccess();
  const supabase = await createClient();
  let notes: ClassNote[] = [];

  if (hasAccess) {
    const { data } = await supabase
      .from('class_notes')
      .select('id, title, description, exam_type, subject, topic, file_name, video_url, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    notes = (data ?? []) as ClassNote[];
  }

  const activationStart = new Date('2026-09-17T00:00:00+01:00');
  const showActivationRequest = new Date() >= activationStart;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-700 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10">
        <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-emerald-400/15 blur-2xl" />
        <div className="absolute -bottom-20 left-1/2 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Pinnacle Classroom</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Study Plan & Lessons 📚</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">Your notes, teacher lessons and revision materials — organized visually so you can find what you need faster.</p>
          </div>
          <div className="hidden text-7xl opacity-90 sm:block">🎓</div>
        </div>
        {hasAccess && <div className="relative z-10 mt-6 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-2 backdrop-blur">📖 {notes.length} lesson{notes.length === 1 ? '' : 's'}</span><span className="rounded-full bg-white/10 px-3 py-2 backdrop-blur">🎥 Video lessons</span><span className="rounded-full bg-white/10 px-3 py-2 backdrop-blur">📝 JAMB & WAEC</span></div>}
      </section>

      {!hasAccess ? (
        <section className="rounded-[26px] border border-amber-200 bg-amber-50 p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl">🔒</div>
          <h2 className="mt-4 text-xl font-black text-slate-900">Your access has expired</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Your access is no longer active.{showActivationRequest ? ' Request an Activation Key to continue accessing Class Notes.' : ' Product Key access is currently required.'}</p>
          <Link href="/register" className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-700">{showActivationRequest ? 'Request Activation Key' : 'Request Product Key'}</Link>
        </section>
      ) : notes.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm sm:p-14"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-emerald-50 to-cyan-50 text-5xl">📖</div><h2 className="mt-5 text-xl font-black text-slate-900">Your classroom is ready</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Your teachers haven't published any notes or video lessons yet. Check back soon.</p></section>
      ) : (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Learning library</p><h2 className="mt-1 text-2xl font-black text-slate-900">Available Lessons</h2><p className="mt-1 text-sm text-slate-500">Pick a subject and jump straight into your lesson.</p></div><span className="hidden rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 sm:block">{notes.length} available</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note, index) => {
              const style = CLASSROOM_STYLES[index % CLASSROOM_STYLES.length];
              return (
                <article key={note.id} className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                  <div className={`relative overflow-hidden bg-gradient-to-br ${style.gradient} px-5 pb-5 pt-5 text-white`}>
                    <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
                    <div className="relative z-10 flex items-start justify-between gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl shadow-inner backdrop-blur">{classroomIcon(note.subject, style.icon)}</div><span className="rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider backdrop-blur">{note.exam_type}</span></div>
                    <div className="relative z-10 mt-5"><h3 className="line-clamp-2 text-lg font-black leading-6">{note.title}</h3><p className="mt-1.5 text-sm font-bold text-white/85">{note.subject}{note.topic ? ` • ${note.topic}` : ''}</p></div>
                  </div>
                  <div className="p-5">
                    {note.description && <p className="line-clamp-3 text-sm leading-5 text-slate-500">{note.description}</p>}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-2xl bg-slate-50 px-2 py-2.5"><div className="text-lg">📄</div><div className="mt-1 text-[10px] font-black uppercase text-slate-500">Study Note</div></div><div className="rounded-2xl bg-slate-50 px-2 py-2.5"><div className="text-lg">{note.video_url ? '🎥' : '📝'}</div><div className="mt-1 text-[10px] font-black uppercase text-slate-500">{note.video_url ? 'Video Ready' : 'Read & Revise'}</div></div></div>
                    <div className="mt-4 grid gap-2"><Link href={`/class-notes/${note.id}`} className={`inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r ${style.gradient} px-4 py-3 text-sm font-black text-white shadow-md transition group-hover:shadow-lg`}>Open Lesson →</Link>{note.video_url && <a href={note.video_url} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100">▶ Watch Video Lesson</a>}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
