import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '../components/PwaRegister';
import ThemeProvider from '../components/ThemeProvider';
import RoutePrefetcher from '../components/layout/RoutePrefetcher';

export const metadata: Metadata = {
  title: 'Pinnacle Tutors Academy — Your Ultimate JAMB & WAEC Success Partner',
  description:
    'Practice questions, mock exams, and CBT-style tests for JAMB/UTME and WAEC, built for Nigerian students.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <PwaRegister />
          <RoutePrefetcher />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
