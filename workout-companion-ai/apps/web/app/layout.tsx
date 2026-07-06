import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Workout Companion AI',
  description:
    'La piattaforma premium per coach, palestre e atleti: allenamento, nutrizione, check-in e AI Coach.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
