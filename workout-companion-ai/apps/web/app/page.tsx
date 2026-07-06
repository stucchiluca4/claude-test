import Link from 'next/link';
import { Dumbbell, Brain, LineChart, Utensils } from 'lucide-react';

/** Landing page minimale — verrà arricchita prima del lancio. */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="text-accent" size={22} />
          Workout Companion AI
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-border hover:bg-card transition"
          >
            Accedi
          </Link>
          <Link
            href="/registrati"
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover transition font-medium"
          >
            Inizia gratis
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl leading-tight">
          Il sistema operativo del <span className="text-accent">fitness coaching</span>
        </h1>
        <p className="mt-6 text-text-secondary max-w-xl text-lg">
          Allenamento, nutrizione, check-in, chat e AI Coach. Tutto in una piattaforma premium
          per coach, palestre e atleti.
        </p>
        <Link
          href="/registrati"
          className="mt-10 px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover transition text-lg font-semibold"
        >
          Prova gratis 14 giorni
        </Link>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            { icon: LineChart, title: 'Analytics reali', desc: 'Tonnellaggio, PR automatici e progressione per ogni esercizio.' },
            { icon: Utensils, title: 'Nutrizione precisa', desc: 'Macro per giorno, rotazione calorie, TDEE automatico.' },
            { icon: Brain, title: 'AI Coach', desc: 'Report automatici e suggerimenti basati sui dati dei tuoi clienti.' },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-6 text-left">
              <f.icon className="text-accent mb-3" size={26} />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
