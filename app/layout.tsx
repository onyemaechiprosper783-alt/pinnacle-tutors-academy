import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pinnacle Tutors Academy — Your Ultimate JAMB & WAEC Success Partner',
  description:
    'Practice questions, mock exams, and CBT-style tests for JAMB/UTME and WAEC, built for Nigerian students.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
