import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pinnacle Tutors Academy | Tutor Recruitment',
  description: 'Join a growing community of exceptional educators at Pinnacle Tutors Academy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}