import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Workout Companion AI — il portale di chi allena davvero',
    template: '%s · Workout Companion AI',
  },
  description:
    'Prescrivi la scheda, l’atleta la esegue dall’app e chiude ogni esercizio con sforzo, energia e dolore. Il portale trasforma il feedback in analisi e il coach AI propone l’aggiustamento.',
  applicationName: 'Workout Companion AI',
  keywords: [
    'personal trainer',
    'software coaching online',
    'schede allenamento',
    'piani alimentari',
    'check-in atleti',
    'coach AI',
  ],
  authors: [{ name: 'Workout Companion AI' }],
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: 'Workout Companion AI',
    title: 'Workout Companion AI — il portale di chi allena davvero',
    description:
      'Prescrizione, esecuzione, feedback, analisi, aggiustamento: il ciclo del coaching in un solo posto. Due demo aperte, senza registrazione.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workout Companion AI',
    description:
      'Prescrizione, esecuzione, feedback, analisi, aggiustamento: il ciclo del coaching in un solo posto.',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0C1017',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-background text-text-primary antialiased selection:bg-accent/30 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
