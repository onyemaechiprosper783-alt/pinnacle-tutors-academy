import Link from 'next/link';
import { notFound } from 'next/navigation';

type Career = {
  title: string;
  icon: string;
  description: string;
  careers: string[];
  courses: string[];
  subjects: string[];
};

const careerData: Record<string, Career> = {
  'medicine-healthcare': {
    title: 'Medicine & Healthcare',
    icon: '🩺',
    description:
      'Explore careers that focus on helping people stay healthy, treating illnesses and improving healthcare.',
    careers: [
      'Doctor / Medical Doctor',
      'Nurse',
      'Pharmacist',
      'Medical Laboratory Scientist',
      'Physiotherapist',
      'Radiographer',
      'Dentist',
      'Optometrist',
      'Public Health Specialist',
      'Nutritionist / Dietitian',
    ],
    courses: [
      'Medicine and Surgery',
      'Nursing Science',
      'Pharmacy',
      'Medical Laboratory Science',
      'Physiotherapy',
      'Radiography',
      'Dentistry',
      'Optometry',
      'Public Health',
      'Human Nutrition and Dietetics',
    ],
    subjects: [
      'Biology',
      'Chemistry',
      'Physics',
      'English Language',
      'Mathematics',
    ],
  },

  'engineering-technology': {
    title: 'Engineering & Technology',
    icon: '💻',
    description:
      'Explore careers involving engineering, computers, software, technology and innovation.',
    careers: [
      'Software Developer',
      'Computer Engineer',
      'Civil Engineer',
      'Electrical Engineer',
      'Mechanical Engineer',
      'Chemical Engineer',
      'Cybersecurity Specialist',
      'Data Analyst',
      'Network Engineer',
      'Systems Analyst',
    ],
    courses: [
      'Computer Science',
      'Software Engineering',
      'Computer Engineering',
      'Civil Engineering',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Chemical Engineering',
      'Cybersecurity',
      'Information Technology',
      'Data Science',
    ],
    subjects: [
      'Mathematics',
      'Physics',
      'Chemistry',
      'English Language',
      'Further Mathematics',
    ],
  },

  'business-finance': {
    title: 'Business & Finance',
    icon: '💼',
    description:
      'Explore careers in accounting, banking, finance, economics, management and entrepreneurship.',
    careers: [
      'Accountant',
      'Banker',
      'Financial Analyst',
      'Economist',
      'Business Manager',
      'Entrepreneur',
      'Auditor',
      'Investment Analyst',
      'Marketing Specialist',
      'Human Resources Specialist',
    ],
    courses: [
      'Accounting',
      'Banking and Finance',
      'Economics',
      'Business Administration',
      'Finance',
      'Marketing',
      'Entrepreneurship',
      'Management',
      'Insurance',
      'Human Resources Management',
    ],
    subjects: [
      'Mathematics',
      'English Language',
      'Economics',
      'Government',
      'Commerce',
    ],
  },

  'law-government': {
    title: 'Law & Government',
    icon: '⚖️',
    description:
      'Explore careers involving law, government, politics, public administration and international affairs.',
    careers: [
      'Lawyer',
      'Legal Adviser',
      'Judge',
      'Public Administrator',
      'Diplomat',
      'Political Analyst',
      'Government Officer',
      'Human Rights Advocate',
      'Policy Analyst',
      'International Relations Specialist',
    ],
    courses: [
      'Law',
      'Political Science',
      'Public Administration',
      'International Relations',
      'Public Policy',
      'Peace and Conflict Studies',
      'Criminology',
      'Human Rights',
    ],
    subjects: [
      'English Language',
      'Government',
      'Literature in English',
      'History',
      'Economics',
    ],
  },

  education: {
    title: 'Education',
    icon: '📚',
    description:
      'Explore careers focused on teaching, learning, educational management and helping students develop.',
    careers: [
      'Teacher',
      'School Administrator',
      'Education Consultant',
      'Guidance Counsellor',
      'Educational Psychologist',
      'Curriculum Developer',
      'Lecturer',
      'Education Officer',
      'Special Education Teacher',
      'Educational Researcher',
    ],
    courses: [
      'Education',
      'Educational Management',
      'Guidance and Counselling',
      'Educational Psychology',
      'Early Childhood Education',
      'Primary Education',
      'Special Education',
      'Adult Education',
      'Science Education',
      'Mathematics Education',
    ],
    subjects: [
      'English Language',
      'Mathematics',
      'Biology',
      'Chemistry',
      'Physics',
    ],
  },

  'science-research': {
    title: 'Science & Research',
    icon: '🔬',
    description:
      'Explore careers in scientific discovery, laboratory work, mathematics and research.',
    careers: [
      'Scientist',
      'Biologist',
      'Chemist',
      'Physicist',
      'Mathematician',
      'Laboratory Scientist',
      'Research Scientist',
      'Environmental Scientist',
      'Microbiologist',
      'Biotechnologist',
    ],
    courses: [
      'Biology',
      'Chemistry',
      'Physics',
      'Mathematics',
      'Microbiology',
      'Biochemistry',
      'Biotechnology',
      'Environmental Science',
      'Geology',
      'Statistics',
    ],
    subjects: [
      'Biology',
      'Chemistry',
      'Physics',
      'Mathematics',
      'English Language',
    ],
  },

  'media-communication': {
    title: 'Media & Communication',
    icon: '🎤',
    description:
      'Explore careers in journalism, broadcasting, public relations, digital media and communication.',
    careers: [
      'Journalist',
      'Broadcaster',
      'News Reporter',
      'Public Relations Specialist',
      'Content Creator',
      'Copywriter',
      'Digital Media Specialist',
      'Radio Presenter',
      'TV Presenter',
      'Communication Specialist',
    ],
    courses: [
      'Mass Communication',
      'Journalism',
      'Public Relations',
      'Broadcasting',
      'Communication Arts',
      'Media Studies',
      'Advertising',
      'Film and Television Production',
    ],
    subjects: [
      'English Language',
      'Literature in English',
      'Government',
      'History',
      'Economics',
    ],
  },

  'creative-arts-design': {
    title: 'Creative Arts & Design',
    icon: '🎨',
    description:
      'Explore careers involving creativity, visual design, architecture, fashion, animation and the arts.',
    careers: [
      'Graphic Designer',
      'Architect',
      'Fashion Designer',
      'Animator',
      'Illustrator',
      'Interior Designer',
      'Photographer',
      'Fine Artist',
      'UI/UX Designer',
      'Creative Director',
    ],
    courses: [
      'Architecture',
      'Graphic Design',
      'Fine Arts',
      'Industrial Design',
      'Fashion Design',
      'Interior Design',
      'Creative Arts',
      'Visual Arts',
      'Theatre Arts',
      'Film Production',
    ],
    subjects: [
      'English Language',
      'Mathematics',
      'Fine Arts',
      'Technical Drawing',
      'Literature in English',
    ],
  },
};

export default async function CareerDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const career = careerData[slug];

  if (!career) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/career/guidance"
          className="mb-5 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Career Guidance
        </Link>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                {career.icon}
              </div>

              <div>
                <h1 className="text-2xl font-black md:text-3xl">
                  {career.title}
                </h1>

                <p className="mt-1 text-sm text-emerald-50 md:text-base">
                  Career information and possible academic paths.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <div className="rounded-2xl bg-emerald-50 p-5">
              <h2 className="text-lg font-black text-emerald-950">
                About this career area
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                {career.description}
              </p>
            </div>

            <section className="mt-7">
              <h2 className="text-xl font-black text-slate-900">
                💼 Possible Careers
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {career.careers.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-800"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-black text-slate-900">
                🎓 Related Courses
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {career.courses.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-blue-100 bg-blue-50 p-4 font-semibold text-blue-900"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-black text-slate-900">
                📖 Useful Subjects
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {career.subjects.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-900">
                💡 Important
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                JAMB subject combinations and university admission
                requirements can differ between courses and institutions.
                Always confirm the current requirements before applying.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
