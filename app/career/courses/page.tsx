'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Course = {
  name: string;
  icon: string;
  field: string;
  description: string;
  careers: string;
};

const courses: Course[] = [
  {
    name: 'Computer Science',
    icon: '💻',
    field: 'Technology & Software',
    description:
      'Learn about computing, programming, software, algorithms and technology.',
    careers: 'Software Developer, Programmer, Data Analyst, IT Specialist',
  },
  {
    name: 'Medicine & Surgery',
    icon: '🩺',
    field: 'Healthcare',
    description:
      'Study the human body, diseases, diagnosis, treatment and healthcare.',
    careers: 'Doctor, Medical Researcher, Healthcare Specialist',
  },
  {
    name: 'Nursing',
    icon: '👩‍⚕️',
    field: 'Healthcare',
    description:
      'Learn how to provide professional care and support to patients.',
    careers: 'Registered Nurse, Community Health Specialist, Nurse Educator',
  },
  {
    name: 'Law',
    icon: '⚖️',
    field: 'Law & Government',
    description:
      'Study legal systems, principles, rights, responsibilities and justice.',
    careers: 'Lawyer, Legal Adviser, Corporate Counsel',
  },
  {
    name: 'Accounting',
    icon: '💰',
    field: 'Business & Finance',
    description:
      'Learn about financial records, accounting principles, auditing and finance.',
    careers: 'Accountant, Auditor, Financial Analyst',
  },
  {
    name: 'Business Administration',
    icon: '💼',
    field: 'Business & Finance',
    description:
      'Learn how organisations are managed and how businesses operate.',
    careers: 'Business Manager, Entrepreneur, Administrator',
  },
  {
    name: 'Civil Engineering',
    icon: '🏗️',
    field: 'Engineering & Technology',
    description:
      'Study the design and construction of buildings, roads, bridges and infrastructure.',
    careers: 'Civil Engineer, Structural Engineer, Project Manager',
  },
  {
    name: 'Electrical/Electronics Engineering',
    icon: '⚡',
    field: 'Engineering & Technology',
    description:
      'Explore electricity, electronics, circuits, systems and technology.',
    careers: 'Electrical Engineer, Electronics Engineer, Systems Engineer',
  },
  {
    name: 'Biochemistry',
    icon: '🧪',
    field: 'Science & Research',
    description:
      'Study the chemical processes and substances found in living organisms.',
    careers: 'Biochemist, Laboratory Scientist, Researcher',
  },
  {
    name: 'Microbiology',
    icon: '🔬',
    field: 'Science & Research',
    description:
      'Study microorganisms such as bacteria, fungi, viruses and their effects.',
    careers: 'Microbiologist, Laboratory Scientist, Researcher',
  },
  {
    name: 'Mass Communication',
    icon: '🎤',
    field: 'Media & Communication',
    description:
      'Learn about journalism, broadcasting, media, communication and public relations.',
    careers: 'Journalist, Broadcaster, Public Relations Specialist',
  },
  {
    name: 'Architecture',
    icon: '🏛️',
    field: 'Creative Arts & Design',
    description:
      'Study the design, planning and development of buildings and spaces.',
    careers: 'Architect, Designer, Urban Planner',
  },
  {
    name: 'Education',
    icon: '📚',
    field: 'Education',
    description:
      'Learn about teaching, learning, educational development and student support.',
    careers: 'Teacher, Education Administrator, Education Consultant',
  },
  {
    name: 'Economics',
    icon: '📈',
    field: 'Business & Finance',
    description:
      'Study how people, businesses and governments make economic decisions.',
    careers: 'Economist, Financial Analyst, Economic Researcher',
  },
  {
    name: 'Political Science',
    icon: '🏛️',
    field: 'Law & Government',
    description:
      'Explore government, politics, public policy and political systems.',
    careers: 'Political Analyst, Public Administrator, Policy Adviser',
  },
  {
    name: 'Psychology',
    icon: '🧠',
    field: 'Social & Behavioural Sciences',
    description:
      'Study human behaviour, thoughts, emotions and mental processes.',
    careers: 'Psychologist, Counsellor, Human Resources Specialist',
  },
];

export default function CoursesPage() {
  const [search, setSearch] = useState('');

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return courses;

    return courses.filter(
      (course) =>
        course.name.toLowerCase().includes(query) ||
        course.field.toLowerCase().includes(query) ||
        course.careers.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/career"
          className="mb-5 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Career & Institution
        </Link>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                📚
              </div>

              <div>
                <h1 className="text-2xl font-black md:text-3xl">
                  Courses
                </h1>

                <p className="mt-1 text-sm text-emerald-50 md:text-base">
                  Explore university courses and the careers they can lead to.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                Explore Courses
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Search through popular courses and learn about the career
                opportunities connected to them.
              </p>
            </div>

            <div className="mb-6">
              <label
                htmlFor="course-search"
                className="mb-2 block text-sm font-black text-slate-700"
              >
                Search courses
              </label>

              <input
                id="course-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search e.g. Computer Science, Medicine..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <p className="mb-4 text-sm font-semibold text-slate-500">
              {filteredCourses.length} course
              {filteredCourses.length === 1 ? '' : 's'} found
            </p>

            {filteredCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="text-4xl">🔎</div>

                <h3 className="mt-3 text-lg font-black text-slate-900">
                  No course found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Try searching for another course or career field.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredCourses.map((course) => (
                  <article
                    key={course.name}
                    className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:bg-emerald-50/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                        {course.icon}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900">
                          {course.name}
                        </h3>

                        <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                          {course.field}
                        </span>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                          {course.description}
                        </p>

                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Possible careers
                          </p>

                          <p className="mt-1 text-sm leading-5 text-slate-700">
                            {course.careers}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-900">
                💡 Important
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Course availability, admission requirements and JAMB subject
                combinations can differ between institutions. Always confirm
                the current requirements with JAMB and the university before
                applying.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
