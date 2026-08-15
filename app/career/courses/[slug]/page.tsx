import Link from 'next/link';
import { notFound } from 'next/navigation';

type Course = {
  name: string;
  icon: string;
  field: string;
  overview: string;
  careers: string[];
  subjects: string[];
  skills: string[];
};

const courseData: Record<string, Course> = {
  'computer-science': {
    name: 'Computer Science',
    icon: '💻',
    field: 'Technology & Software',
    overview:
      'Computer Science focuses on computing, programming, software development, algorithms, data and computer systems.',
    careers: [
      'Software Developer',
      'Web Developer',
      'Mobile App Developer',
      'Data Analyst',
      'Cybersecurity Specialist',
      'Systems Analyst',
      'Database Administrator',
      'IT Specialist',
    ],
    subjects: [
      'Mathematics',
      'English Language',
      'Physics',
      'Further Mathematics',
    ],
    skills: [
      'Programming',
      'Problem solving',
      'Logical thinking',
      'Computer literacy',
      'Data analysis',
    ],
  },

  'medicine-surgery': {
    name: 'Medicine & Surgery',
    icon: '🩺',
    field: 'Healthcare',
    overview:
      'Medicine and Surgery focuses on understanding the human body, diagnosing diseases, treating patients and promoting good health.',
    careers: [
      'Medical Doctor',
      'Surgeon',
      'Medical Researcher',
      'Public Health Specialist',
      'Medical Consultant',
    ],
    subjects: [
      'Biology',
      'Chemistry',
      'Physics',
      'English Language',
    ],
    skills: [
      'Communication',
      'Critical thinking',
      'Scientific reasoning',
      'Compassion',
      'Decision making',
    ],
  },

  nursing: {
    name: 'Nursing',
    icon: '👩‍⚕️',
    field: 'Healthcare',
    overview:
      'Nursing prepares students to provide professional care, support patients and contribute to healthcare services.',
    careers: [
      'Registered Nurse',
      'Community Health Nurse',
      'Nurse Educator',
      'Public Health Nurse',
      'Clinical Nurse',
    ],
    subjects: [
      'Biology',
      'Chemistry',
      'Physics',
      'English Language',
    ],
    skills: [
      'Patient care',
      'Communication',
      'Teamwork',
      'Observation',
      'Compassion',
    ],
  },

  law: {
    name: 'Law',
    icon: '⚖️',
    field: 'Law & Government',
    overview:
      'Law focuses on legal systems, rights, responsibilities, justice and the rules that guide society.',
    careers: [
      'Lawyer',
      'Legal Adviser',
      'Corporate Counsel',
      'Legal Researcher',
      'Human Rights Advocate',
    ],
    subjects: [
      'English Language',
      'Literature in English',
      'Government',
      'History',
      'Economics',
    ],
    skills: [
      'Critical thinking',
      'Research',
      'Communication',
      'Argumentation',
      'Problem solving',
    ],
  },

  accounting: {
    name: 'Accounting',
    icon: '💰',
    field: 'Business & Finance',
    overview:
      'Accounting focuses on financial records, reporting, auditing, budgeting and financial decision-making.',
    careers: [
      'Accountant',
      'Auditor',
      'Financial Analyst',
      'Tax Consultant',
      'Management Accountant',
    ],
    subjects: [
      'Mathematics',
      'English Language',
      'Economics',
      'Commerce',
    ],
    skills: [
      'Numerical ability',
      'Attention to detail',
      'Financial analysis',
      'Organisation',
      'Problem solving',
    ],
  },

  'business-administration': {
    name: 'Business Administration',
    icon: '💼',
    field: 'Business & Finance',
    overview:
      'Business Administration focuses on how organisations operate, how people are managed and how businesses make decisions.',
    careers: [
      'Business Manager',
      'Entrepreneur',
      'Administrator',
      'Marketing Manager',
      'Human Resources Specialist',
    ],
    subjects: [
      'Mathematics',
      'English Language',
      'Economics',
      'Commerce',
    ],
    skills: [
      'Leadership',
      'Communication',
      'Planning',
      'Teamwork',
      'Decision making',
    ],
  },

  'civil-engineering': {
    name: 'Civil Engineering',
    icon: '🏗️',
    field: 'Engineering & Technology',
    overview:
      'Civil Engineering involves designing, constructing and maintaining buildings, roads, bridges and other infrastructure.',
    careers: [
      'Civil Engineer',
      'Structural Engineer',
      'Construction Manager',
      'Project Manager',
      'Site Engineer',
    ],
    subjects: [
      'Mathematics',
      'Physics',
      'Chemistry',
      'English Language',
      'Further Mathematics',
    ],
    skills: [
      'Mathematics',
      'Technical drawing',
      'Problem solving',
      'Project planning',
      'Engineering analysis',
    ],
  },

  'electrical-electronics-engineering': {
    name: 'Electrical/Electronics Engineering',
    icon: '⚡',
    field: 'Engineering & Technology',
    overview:
      'This course focuses on electricity, electronic systems, circuits, communication systems and electrical technology.',
    careers: [
      'Electrical Engineer',
      'Electronics Engineer',
      'Control Systems Engineer',
      'Telecommunications Engineer',
      'Systems Engineer',
    ],
    subjects: [
      'Mathematics',
      'Physics',
      'Chemistry',
      'English Language',
      'Further Mathematics',
    ],
    skills: [
      'Circuit analysis',
      'Mathematics',
      'Problem solving',
      'Technical thinking',
      'Computer skills',
    ],
  },

  biochemistry: {
    name: 'Biochemistry',
    icon: '🧪',
    field: 'Science & Research',
    overview:
      'Biochemistry studies the chemical processes and substances that occur inside living organisms.',
    careers: [
      'Biochemist',
      'Laboratory Scientist',
      'Researcher',
      'Pharmaceutical Scientist',
      'Quality Control Scientist',
    ],
    subjects: [
      'Biology',
      'Chemistry',
      'Physics',
      'English Language',
    ],
    skills: [
      'Laboratory skills',
      'Scientific analysis',
      'Research',
      'Observation',
      'Problem solving',
    ],
  },

  microbiology: {
    name: 'Microbiology',
    icon: '🔬',
    field: 'Science & Research',
    overview:
      'Microbiology focuses on microorganisms such as bacteria, fungi and other microscopic organisms.',
    careers: [
      'Microbiologist',
      'Laboratory Scientist',
      'Research Scientist',
      'Quality Control Scientist',
      'Public Health Scientist',
    ],
    subjects: [
      'Biology',
      'Chemistry',
      'Physics',
      'English Language',
    ],
    skills: [
      'Laboratory work',
      'Research',
      'Observation',
      'Scientific reasoning',
      'Data analysis',
    ],
  },

  'mass-communication': {
    name: 'Mass Communication',
    icon: '🎤',
    field: 'Media & Communication',
    overview:
      'Mass Communication focuses on journalism, broadcasting, public relations, media and communication.',
    careers: [
      'Journalist',
      'Broadcaster',
      'News Reporter',
      'Public Relations Specialist',
      'Content Creator',
      'Media Producer',
    ],
    subjects: [
      'English Language',
      'Literature in English',
      'Government',
      'History',
    ],
    skills: [
      'Writing',
      'Public speaking',
      'Research',
      'Communication',
      'Creativity',
    ],
  },

  architecture: {
    name: 'Architecture',
    icon: '🏛️',
    field: 'Creative Arts & Design',
    overview:
      'Architecture focuses on designing buildings and spaces while considering function, safety, beauty and the environment.',
    careers: [
      'Architect',
      'Architectural Designer',
      'Urban Planner',
      'Interior Designer',
      'Project Designer',
    ],
    subjects: [
      'Mathematics',
      'Physics',
      'English Language',
      'Technical Drawing',
      'Fine Arts',
    ],
    skills: [
      'Design',
      'Technical drawing',
      'Creativity',
      'Spatial thinking',
      'Problem solving',
    ],
  },

  education: {
    name: 'Education',
    icon: '📚',
    field: 'Education',
    overview:
      'Education focuses on teaching, learning, educational development and supporting students.',
    careers: [
      'Teacher',
      'Education Administrator',
      'Education Consultant',
      'Guidance Counsellor',
      'Education Researcher',
    ],
    subjects: [
      'English Language',
      'Mathematics',
      'Biology',
      'Chemistry',
      'Physics',
    ],
    skills: [
      'Communication',
      'Teaching',
      'Leadership',
      'Patience',
      'Organisation',
    ],
  },

  economics: {
    name: 'Economics',
    icon: '📈',
    field: 'Business & Finance',
    overview:
      'Economics studies how individuals, businesses and governments make decisions about resources and markets.',
    careers: [
      'Economist',
      'Financial Analyst',
      'Economic Researcher',
      'Policy Analyst',
      'Business Analyst',
    ],
    subjects: [
      'Mathematics',
      'English Language',
      'Economics',
      'Government',
    ],
    skills: [
      'Data analysis',
      'Mathematics',
      'Research',
      'Critical thinking',
      'Problem solving',
    ],
  },

  'political-science': {
    name: 'Political Science',
    icon: '🏛️',
    field: 'Law & Government',
    overview:
      'Political Science explores government, politics, political institutions, public policy and political systems.',
    careers: [
      'Political Analyst',
      'Public Administrator',
      'Policy Adviser',
      'Government Officer',
      'Political Researcher',
    ],
    subjects: [
      'English Language',
      'Government',
      'History',
      'Economics',
      'Literature in English',
    ],
    skills: [
      'Research',
      'Communication',
      'Critical thinking',
      'Public speaking',
      'Analysis',
    ],
  },

  psychology: {
    name: 'Psychology',
    icon: '🧠',
    field: 'Social & Behavioural Sciences',
    overview:
      'Psychology studies human behaviour, thoughts, emotions and mental processes.',
    careers: [
      'Psychologist',
      'Counsellor',
      'Human Resources Specialist',
      'Researcher',
      'Behavioural Specialist',
    ],
    subjects: [
      'English Language',
      'Biology',
      'Government',
      'Economics',
    ],
    skills: [
      'Communication',
      'Observation',
      'Research',
      'Empathy',
      'Critical thinking',
    ],
  },
};

export default async function CourseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const course = courseData[slug];

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/career/courses"
          className="mb-5 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Courses
        </Link>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                {course.icon}
              </div>

              <div>
                <h1 className="text-2xl font-black md:text-3xl">
                  {course.name}
                </h1>

                <p className="mt-1 text-sm text-emerald-50 md:text-base">
                  {course.field}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <section className="rounded-2xl bg-emerald-50 p-5">
              <h2 className="text-lg font-black text-emerald-950">
                📖 Course Overview
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                {course.overview}
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-black text-slate-900">
                💼 Career Opportunities
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {course.careers.map((career) => (
                  <div
                    key={career}
                    className="rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-800"
                  >
                    {career}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-black text-slate-900">
                📚 Useful Subjects
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {course.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-black text-slate-900">
                ⭐ Useful Skills
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {course.skills.map((skill) => (
                  <div
                    key={skill}
                    className="rounded-xl border border-purple-100 bg-purple-50 p-4 font-semibold text-purple-800"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-900">
                💡 Important
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Admission requirements, JAMB subject combinations and course
                availability can differ between universities. Always confirm
                the current requirements with JAMB and the institution before
                applying.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
