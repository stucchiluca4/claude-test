'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  MessageSquare,
  Smartphone,
  Sparkles,
  Utensils,
  WalletCards,
} from 'lucide-react';

const SCREENS = [
  {
    id: 'coach_dashboard',
    title: 'Control room coach',
    path: '/stitch-demo/coach_dashboard/code.html',
    icon: Gauge,
    metric: '42 clienti attivi',
    promise: 'Priorita, alert, ricavi, aderenza e prossime azioni in una sola schermata.',
  },
  {
    id: 'workout_program_detail',
    title: 'Programmazione avanzata',
    path: '/stitch-demo/workout_program_detail/code.html',
    icon: Dumbbell,
    metric: '8 settimane periodizzate',
    promise: 'Blocchi, esercizi, volume, intensita e logica progressiva per ogni atleta.',
  },
  {
    id: 'nutrition_plan',
    title: 'Nutrizione completa',
    path: '/stitch-demo/nutrition_plan/code.html',
    icon: Utensils,
    metric: '2.740 kcal target',
    promise: 'Macro, pasti, compliance e modifiche rapide per coaching alimentare premium.',
  },
  {
    id: 'biofeedback_monitoring',
    title: 'Biofeedback e readiness',
    path: '/stitch-demo/biofeedback_monitoring/code.html',
    icon: Activity,
    metric: '86% readiness',
    promise: 'Sonno, stress, DOMS, energia e trend per decidere quando spingere o scaricare.',
  },
  {
    id: 'weekly_summary',
    title: 'Report settimanale',
    path: '/stitch-demo/weekly_summary/code.html',
    icon: BarChart3,
    metric: '+12% volume',
    promise: 'Sintesi professionale pronta da condividere con atleta o direzione palestra.',
  },
  {
    id: 'client_intake_form',
    title: 'Intake cliente',
    path: '/stitch-demo/client_intake_form/code.html',
    icon: ClipboardCheck,
    metric: '15 dati iniziali',
    promise: 'Anamnesi, obiettivi, preferenze e vincoli raccolti in modo ordinato.',
  },
  {
    id: 'workout_session_active_feedback',
    title: 'Workout live feedback',
    path: '/stitch-demo/workout_session_active_feedback/code.html',
    icon: MessageSquare,
    metric: 'RPE in tempo reale',
    promise: 'Feedback durante la sessione, note tecniche e correzioni del coach.',
  },
  {
    id: 'workout_session_timer_media',
    title: 'Timer e media esercizi',
    path: '/stitch-demo/workout_session_timer_media/code.html',
    icon: Smartphone,
    metric: 'Rest timer smart',
    promise: 'Esperienza atleta da mobile con timer, video, set e recuperi guidati.',
  },
  {
    id: 'daily_biofeedback_check_in',
    title: 'Check-in giornaliero',
    path: '/stitch-demo/daily_biofeedback_check_in/code.html',
    icon: Sparkles,
    metric: '2 minuti al giorno',
    promise: 'Input rapidi per alimentare decisioni del coach e suggerimenti AI.',
  },
  {
    id: 'coaching_plans_pricing',
    title: 'Listino coaching',
    path: '/stitch-demo/coaching_plans_pricing/code.html',
    icon: WalletCards,
    metric: '3 offerte premium',
    promise: 'Pacchetti, pricing e posizionamento commerciale gia pronti da mostrare.',
  },
] as const;

const DEMO_STATS = [
  { label: 'Cliente demo', value: 'Marco Bellini', detail: 'Ipertrofia + performance' },
  { label: 'Aderenza media', value: '91%', detail: '+7% nelle ultime 4 settimane' },
  { label: 'Ricavi simulati', value: '8.420 euro', detail: 'MRR coach studio' },
  { label: 'Alert gestiti', value: '14', detail: 'Sonno, DOMS, check-in, messaggi' },
];

export default function DemoPage() {
  const [activeId, setActiveId] = useState<(typeof SCREENS)[number]['id']>('coach_dashboard');

  useEffect(() => {
    const screen = new URLSearchParams(window.location.search).get('screen');
    if (screen && SCREENS.some((item) => item.id === screen)) {
      setActiveId(screen as (typeof SCREENS)[number]['id']);
    }
  }, []);

  const activeScreen = useMemo(
    () => SCREENS.find((screen) => screen.id === activeId) ?? SCREENS[0],
    [activeId]
  );

  const ActiveIcon = activeScreen.icon;

  return (
    <main className="min-h-screen bg-[#0b0e14] text-[#dfe2ec]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0e14]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e5af0] text-white">
              <Dumbbell size={20} />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.18em] text-[#b6c4ff]">
                PT Coach Pro
              </span>
              <span className="block text-xs uppercase tracking-[0.2em] text-[#8d90a1]">
                Demo avanzata
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/registrati"
              className="rounded-lg bg-[#1e5af0] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              Attiva prova
            </Link>
            <Link
              href="/login"
              className="hidden rounded-lg border border-white/10 px-4 py-2 text-sm text-[#c3c5d8] transition hover:bg-white/5 sm:block"
            >
              Accedi
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#151920] p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1e5af0] text-white">
                <ActiveIcon size={22} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d90a1]">
                  Scenario selezionato
                </p>
                <h1 className="text-2xl font-bold text-white">{activeScreen.title}</h1>
              </div>
            </div>
            <p className="text-sm leading-6 text-[#c3c5d8]">{activeScreen.promise}</p>
            <div className="mt-5 rounded-lg border border-[#1e5af0]/35 bg-[#1e5af0]/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b6c4ff]">
                Dato demo
              </p>
              <p className="mt-1 text-2xl font-black text-white">{activeScreen.metric}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEMO_STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-[#151920] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d90a1]">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg font-black text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-[#c3c5d8]">{stat.detail}</p>
              </div>
            ))}
          </div>

          <nav className="rounded-xl border border-white/10 bg-[#151920] p-2">
            {SCREENS.map((screen) => {
              const Icon = screen.icon;
              const active = screen.id === activeId;

              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => {
                    setActiveId(screen.id);
                    window.history.replaceState(null, '', `/demo?screen=${screen.id}`);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                    active
                      ? 'bg-[#1e5af0] font-bold text-white'
                      : 'text-[#c3c5d8] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{screen.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 rounded-xl border border-white/10 bg-[#151920] p-3 shadow-2xl shadow-black/30">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d90a1]">
                Anteprima fedele dal file Stitch
              </p>
              <h2 className="text-lg font-bold text-white">{activeScreen.title}</h2>
            </div>
            <a
              href={activeScreen.path}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#b6c4ff] transition hover:bg-white/5"
            >
              Apri a tutto schermo
            </a>
          </div>

          <div className="h-[calc(100vh-140px)] min-h-[640px] overflow-hidden rounded-lg border border-white/10 bg-[#0b0e14]">
            <iframe
              key={activeScreen.path}
              src={activeScreen.path}
              title={activeScreen.title}
              className="h-full w-full bg-[#0b0e14]"
            />
          </div>
        </section>
      </section>
    </main>
  );
}
