import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tutor Recruitment — Pinnacle Tutors Academy',
  description: 'Tutor application portal for Pinnacle Tutors Academy.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
