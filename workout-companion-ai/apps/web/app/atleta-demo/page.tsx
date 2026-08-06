'use client';

/**
 * Vetrina dell'app atleta.
 * Ricostruisce quattro schermate reali dell'app dentro una cornice di telefono,
 * applicando lo stesso linguaggio del prodotto (DESIGN.md — "Glass Over Iron"):
 * il CONTENUTO vive su ferro opaco, il VETRO resta al livello dei controlli
 * (testate, barre schede, barre d'azione, timer di recupero).
 *
 * Due amplificazioni rispetto alla prima versione:
 * 1) MATERIA — la pagina non copre più il campo luminoso del layout radice, e
 *    dentro lo schermo del telefono vive un campo luminoso suo. Senza qualcosa
 *    di vivo sotto, il vetro legge come grigio piatto e il materiale sparisce.
 * 2) MOVIMENTO — ogni sezione entra allo scorrimento con `Reveal`, in cascata,
 *    così la pagina si legge in un ordine invece che tutta insieme.
 *
 * I dati mostrati sono di un atleta di esempio: è dichiarato in alto, accanto
 * ai numeri dimostrativi e sotto la cornice del telefono.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Apple,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  Home,
  LineChart,
  MessageCircle,
  Sparkles,
  Target,
  Timer,
  Trophy,
  User,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card, KpiCard, buttonPrimary, buttonSecondary } from '@/components/ui';
import { Parallax, Reveal } from '@/components/motion';
import { cn } from '@/lib/utils';

/* ============================================================
   Dati di esempio (atleta dimostrativo)
   ============================================================ */

type ScreenId = 'oggi' | 'tracker' | 'riepilogo' | 'progressi';

const workouts = [
  { day: 'LUN', name: 'Upper Strength', detail: 'Panca, rematore, military press', done: true },
  { day: 'MAR', name: 'Lower Hypertrophy', detail: 'Squat, stacco rumeno, leg press', done: true },
  { day: 'GIO', name: 'Pull Volume', detail: 'Dorso, catena posteriore, bicipiti', done: false },
  { day: 'SAB', name: 'Full Body Pump', detail: 'Richiamo metabolico, 55 min', done: false },
];

const meals = [
  { name: 'Colazione', time: '08:00', kcal: 520, foods: 'Yogurt greco, avena, frutti rossi' },
  { name: 'Pranzo', time: '13:00', kcal: 760, foods: 'Riso basmati, pollo, verdure, olio EVO' },
  { name: 'Pre workout', time: '17:00', kcal: 310, foods: 'Banana, whey, gallette' },
  { name: 'Cena', time: '20:30', kcal: 850, foods: 'Salmone, patate, insalata' },
];

const messages = [
  { from: 'Coach Luca', text: 'Oggi tieni RPE 8 sulla panca. Se senti le spalle stanche, scala di 2,5 kg.' },
  { from: 'Tu', text: 'Ok coach, carico anche il video del top set.' },
];

const APP_TABS: { label: string; icon: LucideIcon }[] = [
  { label: 'Oggi', icon: Home },
  { label: 'Scheda', icon: Dumbbell },
  { label: 'Nutrizione', icon: Utensils },
  { label: 'Progressi', icon: BarChart3 },
  { label: 'Chat', icon: MessageCircle },
  { label: 'Profilo', icon: User },
];

type SetState = 'done' | 'current' | 'todo';

const TRACKER_SETS: { n: number; load: string; reps: string; rpe: string; state: SetState }[] = [
  { n: 1, load: '80', reps: '10', rpe: '7', state: 'done' },
  { n: 2, load: '82,5', reps: '9', rpe: '8', state: 'done' },
  { n: 3, load: '85', reps: '8', rpe: '', state: 'current' },
  { n: 4, load: '', reps: '', rpe: '', state: 'todo' },
];

const SUMMARY_STATS: { label: string; value: string; unit?: string }[] = [
  { label: 'Durata', value: '58', unit: 'min' },
  { label: 'Volume', value: '8.240', unit: 'kg' },
  { label: 'Serie', value: '12' },
  { label: 'Ripetizioni', value: '96' },
  { label: 'Kcal', value: '430' },
  { label: 'Recupero', value: '48', unit: 'h' },
];

const PROGRESS_KPIS: { label: string; value: string; unit?: string }[] = [
  { label: 'Sedute', value: '34' },
  { label: 'Volume', value: '214', unit: 't' },
  { label: 'Costanza', value: '6', unit: 'sett.' },
];

/** Volume settimanale (kg × 1000) delle ultime 8 settimane. */
const VOLUME_WEEKS = [52, 58, 61, 57, 66, 71, 69, 78];

/** 1RM stimato sullo squat nelle ultime 6 sedute. */
const STRENGTH_POINTS = [128, 131, 130, 135, 138, 142];

const SCREENS: {
  id: ScreenId;
  tab: string;
  tabIcon: LucideIcon;
  eyebrow: string;
  title: string;
  lede: string;
  points: { icon: LucideIcon; tone: string; title: string; text: string }[];
}[] = [
  {
    id: 'oggi',
    tab: 'Oggi',
    tabIcon: Home,
    eyebrow: 'Schermata 1 · Oggi',
    title: 'La giornata letta in tre secondi',
    lede:
      "È la prima cosa che l'atleta vede aprendo l'app. Prontezza, allenamento del giorno, calorie e check-in: nessuna scelta da fare, solo il gesto successivo.",
    points: [
      {
        icon: Activity,
        tone: 'text-cyan',
        title: 'Prontezza calcolata',
        text: 'Sonno, stress, dolori muscolari e recupero diventano un solo indice, con il consiglio di oggi già scritto.',
      },
      {
        icon: Timer,
        tone: 'text-accent',
        title: 'Un solo pulsante',
        text: "L'allenamento previsto è il fuoco della schermata: si parte con un tocco, senza cercare nulla.",
      },
      {
        icon: Utensils,
        tone: 'text-mint',
        title: 'Macro sempre sotto gli occhi',
        text: 'Calorie e macro del giorno arrivano dal piano che hai costruito nel portale coach.',
      },
    ],
  },
  {
    id: 'tracker',
    tab: 'Tracker',
    tabIcon: Dumbbell,
    eyebrow: 'Schermata 2 · Tracker',
    title: 'Registrare una serie non deve costare pensiero',
    lede:
      'La riga di serie è il componente più usato del prodotto, quindi è progettato per il caso peggiore: mani sudate e occhio distratto. Carico, ripetizioni, spunta.',
    points: [
      {
        icon: Dumbbell,
        tone: 'text-accent',
        title: 'Carico × ripetizioni',
        text: "Campi grandi, cifre tabulari e l'ultima performance sopra la riga: sa sempre da dove ripartire.",
      },
      {
        icon: Sparkles,
        tone: 'text-violet',
        title: 'Suggerimento di carico',
        text: 'Il motore legge RPE e ripetizioni della volta scorsa e propone il carico successivo.',
      },
      {
        icon: Timer,
        tone: 'text-amber',
        title: 'Recupero automatico',
        text: 'Alla spunta parte il timer previsto dalla scheda, in una barra in vetro che resta sopra il contenuto.',
      },
    ],
  },
  {
    id: 'riepilogo',
    tab: 'Riepilogo',
    tabIcon: Trophy,
    eyebrow: 'Schermata 3 · Riepilogo',
    title: 'Chiudere la seduta con un numero che vale',
    lede:
      "A fine allenamento l'atleta riceve un punteggio, i numeri della seduta, i record appena battuti e due righe di lettura del coach AI.",
    points: [
      {
        icon: Target,
        tone: 'text-accent',
        title: 'Punteggio da 0 a 100',
        text: 'Serie completate, volume rispetto alla volta scorsa e record: una sola cifra confrontabile settimana su settimana.',
      },
      {
        icon: Trophy,
        tone: 'text-rose',
        title: 'Record automatici',
        text: 'Carico massimo, ripetizioni, volume di serie e 1RM stimato vengono confrontati e salvati da soli.',
      },
      {
        icon: Bot,
        tone: 'text-violet',
        title: 'Recap del coach AI',
        text: "Due righe che spiegano com'è andata e cosa provare la prossima volta. Le leggi anche tu dal portale.",
      },
    ],
  },
  {
    id: 'progressi',
    tab: 'Progressi',
    tabIcon: BarChart3,
    eyebrow: 'Schermata 4 · Progressi',
    title: 'La prova che il lavoro sta funzionando',
    lede:
      'Otto settimane di volume, la curva di forza per esercizio e gli insight generati dai dati: è la schermata che tiene un cliente per un anno.',
    points: [
      {
        icon: BarChart3,
        tone: 'text-amber',
        title: 'Volume settimanale',
        text: 'Tonnellaggio per settimana, con il trend e la costanza di allenamento sempre visibili.',
      },
      {
        icon: LineChart,
        tone: 'text-rose',
        title: 'Forza per esercizio',
        text: '1RM stimato nel tempo: si vede a occhio se la progressione tiene o si è fermata.',
      },
      {
        icon: Sparkles,
        tone: 'text-violet',
        title: 'Insight scritti',
        text: 'Frasi generate dai dati, non decorazioni: cosa sale, cosa è fermo, quale giorno rende di più.',
      },
    ],
  },
];

/* ============================================================
   Pagina
   ============================================================ */

export default function AthleteDemoPage() {
  const [active, setActive] = useState<ScreenId>('oggi');
  const screen = SCREENS.find((s) => s.id === active) ?? SCREENS[0];

  return (
    // Nessun fondo opaco qui: il campo luminoso del layout radice deve restare
    // visibile — è ciò che il vetro rifrange.
    <main className="min-h-screen text-text-primary">
      {/* VETRO — testata ancorata: livello dei controlli.
          È una superficie molto grande, quindi ferma (`glass-still`): il
          riflesso che scorre resta ai comandi, dove porta significato. */}
      <header className="glass-chrome glass-still sticky top-0 z-50 !border-x-0 !border-t-0">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-4 px-5">
          <Link href="/" className="press flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-accent text-white">
              <Dumbbell size={20} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-tight text-white">
                Workout Companion AI
              </span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                Anteprima app atleta
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/demo"
              className={cn(buttonSecondary, 'hidden px-4 py-2.5 text-[13px] sm:inline-flex')}
            >
              Portale coach
            </Link>
            <Link href="/registrati" className={cn(buttonPrimary, 'px-5 py-2.5 text-[13px]')}>
              Attiva la prova
            </Link>
          </div>
        </div>
      </header>

      {/* Apertura — entra in cascata mentre lo sguardo scende */}
      <section className="mx-auto max-w-[1200px] px-5 pb-8 pt-12">
        <Reveal>
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-accent">
            Esperienza atleta
          </p>
        </Reveal>
        <Reveal delay={70} className="mt-3">
          <h1 className="max-w-3xl text-[34px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white md:text-[46px]">
            Quello che riceve il tuo atleta, schermata per schermata.
          </h1>
        </Reveal>
        <Reveal delay={140} className="mt-5">
          <p className="max-w-2xl text-[17px] leading-[1.5] text-text-secondary">
            Il coach lavora dal portale, l&apos;atleta vive nell&apos;app. Qui sotto trovi quattro
            schermate reali dell&apos;app mobile, ricostruite fedelmente: scegli quella che vuoi
            vedere e leggi accanto cosa succede davvero.
          </p>
        </Reveal>
        <Reveal delay={210} className="mt-4">
          <p className="max-w-2xl text-[13px] leading-relaxed text-text-tertiary">
            Un&apos;avvertenza onesta: i numeri di queste schermate sono di un atleta di esempio.
            Nell&apos;app reale sono quelli del tuo cliente, aggiornati mentre si allena.
          </p>
        </Reveal>
      </section>

      {/* KPI dell'atleta di esempio: in alto, prima del contenuto */}
      <section className="mx-auto max-w-[1200px] px-5 pb-12">
        <Reveal className="mb-4 flex items-center gap-2.5">
          <span className="h-px w-7 shrink-0 bg-line" aria-hidden />
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-tertiary">
            Atleta di esempio · numeri dimostrativi
          </p>
        </Reveal>
        {/* Cascata 0 · 70 · 140 · 210 ms: le card arrivano una dopo l'altra */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Reveal className="h-full [&>*]:h-full">
            <KpiCard label="Peso corporeo" value="76,1 kg" delta="−0,4 kg in 7 giorni" deltaGood tone="cyan" />
          </Reveal>
          <Reveal delay={70} className="h-full [&>*]:h-full">
            <KpiCard label="Aderenza al piano" value="94%" delta="+6% sul mese" deltaGood tone="mint" />
          </Reveal>
          <Reveal delay={140} className="h-full [&>*]:h-full">
            <KpiCard label="Volume 4 settimane" value="+12%" delta="Progressione in salita" deltaGood tone="amber" />
          </Reveal>
          <Reveal delay={210} className="h-full [&>*]:h-full">
            <KpiCard label="Record del mese" value="3" delta="Ultimo: squat 142 kg" deltaGood tone="rose" />
          </Reveal>
        </div>
      </section>

      {/* Vetrina: cornice telefono + spiegazione */}
      <section className="relative isolate mx-auto max-w-[1200px] px-5 pb-16">
        {/* Fondo vivo: uno strato che scorre più lentamente della pagina.
            Serve alla cornice — il vetro deve avere sotto qualcosa che si muove. */}
        <Parallax
          speed={0.14}
          className="pointer-events-none absolute inset-x-0 top-10 -z-10 flex justify-center lg:justify-start lg:pl-20"
        >
          <span className="block h-[560px] w-[560px] rounded-full bg-accent/[0.16] blur-[110px]" aria-hidden />
        </Parallax>

        {/* VETRO — selettore di schermata */}
        <Reveal className="mb-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Schermate dell'app atleta"
            className="glass-chrome grid w-full grid-cols-2 gap-1.5 rounded-2xl p-1.5 sm:w-auto sm:grid-cols-4 sm:rounded-full"
          >
            {SCREENS.map((s) => {
              const on = s.id === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`tab-${s.id}`}
                  aria-selected={on}
                  aria-controls="pannello-schermata"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    'press relative z-10 flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[14px] font-bold transition sm:px-6',
                    on ? 'bg-accent text-white' : 'text-text-secondary hover:text-white',
                  )}
                >
                  <s.tabIcon size={16} aria-hidden />
                  {s.tab}
                </button>
              );
            })}
          </div>
        </Reveal>

        <div
          id="pannello-schermata"
          role="tabpanel"
          aria-labelledby={`tab-${screen.id}`}
          className="grid grid-cols-1 gap-10 lg:grid-cols-[352px_minmax(0,1fr)] lg:gap-14"
        >
          {/* La cornice: resta ancorata solo se la finestra è alta abbastanza da contenerla.
              Il `Reveal` sta DENTRO il contenitore ancorato, così l'entrata non
              interferisce con lo `sticky`. Entra "pop": arriva in scala e si mette
              a fuoco, come un oggetto che si avvicina. */}
          <div className="lg:self-start [@media(min-width:1024px)_and_(min-height:880px)]:sticky [@media(min-width:1024px)_and_(min-height:880px)]:top-6">
            <Reveal variant="pop" delay={70} amount={0.08}>
              <PhoneFrame>
                <div key={active} className="rise h-full">
                  {active === 'oggi' && <ScreenOggi />}
                  {active === 'tracker' && <ScreenTracker />}
                  {active === 'riepilogo' && <ScreenRiepilogo />}
                  {active === 'progressi' && <ScreenProgressi />}
                </div>
              </PhoneFrame>
            </Reveal>
            <Reveal delay={210}>
              <p className="mt-5 text-center text-[13px] leading-relaxed text-text-tertiary">
                Ricostruzione fedele dell&apos;app mobile — iPhone 15, tema scuro.
                <span className="mt-1 block">Numeri, nomi e grafici sono di esempio.</span>
              </p>
            </Reveal>
          </div>

          {/* Il racconto — arriva di lato, dopo la cornice */}
          <Reveal variant="slide" delay={140}>
            <div key={`testo-${active}`} className="rise">
              <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-accent">
                {screen.eyebrow}
              </p>
              <h2 className="mt-3 text-[30px] font-extrabold leading-[1.12] tracking-[-0.02em] text-white md:text-[34px]">
                {screen.title}
              </h2>
              <p className="mt-4 max-w-xl text-[17px] leading-[1.5] text-text-secondary">
                {screen.lede}
              </p>

              {/* Le tre spiegazioni entrano a cascata a ogni cambio di schermata */}
              <div className="mt-8 space-y-3">
                {screen.points.map((p, i) => (
                  <Card key={p.title} className={cn('flex items-start gap-4 p-5 rise', `rise-${i + 1}`)}>
                    <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-sm bg-raised">
                      <p.icon size={20} className={p.tone} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-bold text-white">{p.title}</span>
                      <span className="mt-1 block text-[15px] leading-[1.45] text-text-secondary">
                        {p.text}
                      </span>
                    </span>
                  </Card>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/registrati" className={buttonPrimary}>
                  Attiva la prova gratuita
                </Link>
                <Link href="/demo" className={buttonSecondary}>
                  Guarda il portale coach
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Il resto dell'app */}
      <section className="mx-auto max-w-[1200px] px-5 pb-20">
        <Reveal>
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-white">
            E tutto il resto che l&apos;atleta si porta in tasca
          </h2>
        </Reveal>
        <Reveal delay={70} className="mt-2">
          <p className="max-w-2xl text-[15px] leading-relaxed text-text-secondary">
            L&apos;app è organizzata in sei schede — Oggi, Scheda, Nutrizione, Progressi, Chat e
            Profilo — con il diario di salute collegato ai dati del telefono.
          </p>
        </Reveal>

        {/* Elenco delle schede: sono etichette, non comandi — restano su ferro */}
        <Reveal delay={140} className="mt-5 flex flex-wrap gap-2">
          {APP_TABS.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-2 rounded-full bg-raised px-3.5 py-2 text-[13px] font-semibold text-text-secondary"
            >
              <t.icon size={15} className="text-text-tertiary" aria-hidden />
              {t.label}
            </span>
          ))}
        </Reveal>

        {/* Cascata 0 · 70 · 140 ms */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Reveal className="h-full [&>*]:h-full">
            <Card className="min-w-0 p-5">
              <SectionTitle icon={Dumbbell} tone="text-accent" title="Scheda della settimana" />
              <ul className="mt-4 space-y-2">
                {workouts.map((w) => (
                  <li
                    key={w.day}
                    className="flex min-h-[56px] items-center gap-3 rounded-sm bg-raised px-3.5 py-2.5"
                  >
                    <span className="w-11 shrink-0 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      {w.day}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-white">{w.name}</span>
                      <span className="block truncate text-[13px] text-text-secondary">{w.detail}</span>
                    </span>
                    {w.done ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-mint">
                        <Check size={15} aria-hidden />
                        Fatto
                      </span>
                    ) : (
                      <ChevronRight size={18} className="shrink-0 text-text-tertiary" aria-hidden />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={70} className="h-full [&>*]:h-full">
            <Card className="min-w-0 p-5">
              <SectionTitle icon={Apple} tone="text-mint" title="Piano alimentare" />
              <ul className="mt-4 space-y-2">
                {meals.map((m) => (
                  <li key={m.name} className="min-h-[56px] rounded-sm bg-raised px-3.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[15px] font-bold text-white">
                        {m.name} <span className="text-text-tertiary tnum">· {m.time}</span>
                      </span>
                      <span className="shrink-0 text-[14px] font-bold text-mint tnum">
                        {m.kcal} kcal
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-text-secondary">{m.foods}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={140} className="h-full [&>*]:h-full">
            <Card className="min-w-0 p-5">
              <SectionTitle icon={MessageCircle} tone="text-accent" title="Chat con il coach" />
              <div className="mt-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.from === 'Tu';
                  return (
                    <div
                      key={m.text}
                      className={cn(
                        'max-w-[88%] rounded-sm px-3.5 py-3',
                        mine ? 'ml-auto bg-accent text-white' : 'bg-raised text-text-primary',
                      )}
                    >
                      <p
                        className={cn(
                          'text-[12px] font-bold uppercase tracking-[0.06em]',
                          mine ? 'text-white/70' : 'text-text-secondary',
                        )}
                      >
                        {m.from}
                      </p>
                      <p className="mt-1 text-[15px] leading-[1.45]">{m.text}</p>
                    </div>
                  );
                })}
                <p className="pt-1 text-[13px] text-text-tertiary">
                  Foto, video del top set e note del check-in viaggiano nello stesso filo.
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Chiusura */}
      <Reveal as="section" className="mx-auto max-w-[1200px] px-5 pb-24">
        <Card className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-white">
              Dai ai tuoi atleti un&apos;app che vogliono aprire
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
              Costruisci schede e piani dal portale, loro trovano tutto qui dentro. Prova
              gratuitamente, senza carta di credito.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/registrati" className={buttonPrimary}>
              Attiva la prova
            </Link>
            <Link href="/demo" className={buttonSecondary}>
              Portale coach
            </Link>
          </div>
        </Card>
      </Reveal>
    </main>
  );
}

/* ============================================================
   Cornice del telefono
   ============================================================ */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[352px]">
      <div className="rounded-[44px] bg-void p-[10px] shadow-[0_50px_90px_-40px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.07]">
        {/* 332×720: le proporzioni reali di un iPhone 15.
            Lo schermo è appena translucido e ha un campo luminoso suo: è la
            materia che la testata e la barra schede in vetro rifrangono. Senza,
            il vetro dentro la cornice leggerebbe come grigio piatto.
            `isolate` tiene il campo dietro al contenuto ma davanti al fondo. */}
        <div className="relative isolate h-[720px] overflow-hidden rounded-2xl bg-background/[0.88]">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <span className="absolute -left-14 -top-20 block h-52 w-52 rounded-full bg-accent/40 blur-[62px]" />
            <span className="absolute -right-16 top-[38%] block h-44 w-44 rounded-full bg-violet/25 blur-[62px]" />
            <span className="absolute -bottom-16 left-6 block h-52 w-52 rounded-full bg-cyan/25 blur-[62px]" />
          </div>
          {/* isola dinamica */}
          <div
            className="pointer-events-none absolute left-1/2 top-2.5 z-30 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-void"
            aria-hidden
          />
          {children}
        </div>
      </div>
    </div>
  );
}

/** Impalcatura di una schermata: testata in vetro, contenuto in ferro, barra in vetro. */
function ScreenShell({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* VETRO — la testata ancorata: si sfoca, prende luce sul bordo alto e
          lascia intravedere il campo luminoso dello schermo. */}
      <div className="glass-chrome relative z-20 !border-x-0 !border-t-0 px-4 pb-3 pt-[40px]">
        {header}
      </div>
      {/* FERRO — il contenuto scorre SOTTO il vetro, non ci vive sopra. */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full space-y-2 px-4 pb-[104px] pt-3">{children}</div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/90 via-background/45 to-transparent"
          aria-hidden
        />
      </div>
      {/* VETRO — barra schede o barra d'azione, ancorata sopra la safe area */}
      <div className="absolute inset-x-3 bottom-3 z-20">{footer}</div>
    </div>
  );
}

/** FERRO: la superficie del contenuto dentro il telefono. */
function PhoneCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('iron rounded-lg p-4', className)}>{children}</div>;
}

function PhoneLabel({ children, tone = 'text-text-secondary' }: { children: React.ReactNode; tone?: string }) {
  return (
    <p className={cn('text-[10px] font-bold uppercase tracking-[0.06em]', tone)}>{children}</p>
  );
}

/** VETRO: la barra schede flottante dell'app (presentazionale). */
function TabBarMock({ current }: { current: string }) {
  return (
    <div className="glass-chrome flex items-center gap-0.5 rounded-2xl px-1.5 py-2" aria-hidden>
      {APP_TABS.map((t) => {
        const on = t.label === current;
        return (
          <div
            key={t.label}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-xs py-1.5',
              on && 'bg-accent/15',
            )}
          >
            <t.icon size={17} className={on ? 'text-accent' : 'text-text-secondary'} />
            <span
              className={cn(
                'text-[9px] font-bold leading-none tracking-tight',
                on ? 'text-accent' : 'text-text-secondary',
              )}
            >
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Schermata 1 — OGGI
   ============================================================ */

function ScreenOggi() {
  const r = 30;
  const c = 2 * Math.PI * r;

  return (
    <ScreenShell
      header={
        <div className="flex items-end justify-between gap-3">
          <div>
            <PhoneLabel>Giovedì 28 luglio</PhoneLabel>
            <p className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
              Ciao, Marco
            </p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-[13px] font-bold text-white">
            M
          </span>
        </div>
      }
      footer={<TabBarMock current="Oggi" />}
    >
      {/* Prontezza — ciano: metriche del corpo */}
      <PhoneCard className="p-3.5">
        <PhoneLabel>Prontezza di oggi</PhoneLabel>
        <div className="mt-2.5 flex items-center gap-3.5">
          <div className="relative shrink-0">
            <svg viewBox="0 0 72 72" className="h-[62px] w-[62px] -rotate-90 text-cyan" aria-hidden>
              <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="9" />
              <circle
                cx="36"
                cy="36"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - 0.86)}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center">
              <span className="font-metric text-[19px] font-extrabold leading-none text-white tnum">
                8,6
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-white">Pronto a spingere</p>
            <p className="mt-0.5 text-[12px] leading-[1.35] text-text-secondary">
              Recupero ottimo: oggi puoi cercare il carico o le ripetizioni in più.
            </p>
          </div>
        </div>
      </PhoneCard>

      {/* IL FARO della pagina: l'unico elemento a fuoco */}
      <PhoneCard className="beacon p-3.5">
        <PhoneLabel>Allenamento di oggi</PhoneLabel>
        <p className="mt-1.5 text-[20px] font-bold leading-tight tracking-[-0.01em] text-white">
          Pull Volume
        </p>
        <p className="mt-0.5 text-[12px] text-text-secondary">
          Dorso e catena posteriore · ~65 min
        </p>
        <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-[1.3] text-amber">
          <Timer size={13} className="mt-0.5 shrink-0" aria-hidden />
          Note del coach: tieni RPE 8, ultima serie in stripping.
        </p>
        <div className="mt-2.5 flex h-11 items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-bold text-white">
          <Timer size={17} aria-hidden />
          Inizia allenamento
        </div>
      </PhoneCard>

      {/* Nutrizione */}
      <PhoneCard className="p-3.5">
        <PhoneLabel>Nutrizione di oggi</PhoneLabel>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-metric text-[30px] font-extrabold leading-none text-white tnum">
            2.440
          </span>
          <span className="text-[13px] font-semibold text-text-secondary">kcal</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {[
            { l: 'Proteine', v: '180 g' },
            { l: 'Carbo', v: '250 g' },
            { l: 'Grassi', v: '70 g' },
          ].map((m) => (
            <div key={m.l} className="rounded-xs bg-raised px-2 py-1.5 text-center">
              <p className="font-metric text-[15px] font-bold leading-none text-white tnum">{m.v}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                {m.l}
              </p>
            </div>
          ))}
        </div>
      </PhoneCard>

      {/* Check-in */}
      <PhoneCard className="flex items-center gap-3 p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint/15">
          <Check size={17} className="text-mint" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-mint">Check-in inviato</p>
          <p className="truncate text-[12px] text-text-secondary">Il coach lo sta esaminando.</p>
        </div>
      </PhoneCard>
    </ScreenShell>
  );
}

/* ============================================================
   Schermata 2 — TRACKER
   ============================================================ */

function ScreenTracker() {
  return (
    <ScreenShell
      header={
        <div className="flex items-center gap-3">
          <X size={18} className="shrink-0 text-text-secondary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-white">Pull Volume</p>
            <p className="text-[11px] font-semibold text-text-secondary tnum">6 / 12 serie</p>
          </div>
          <span className="font-metric text-[20px] font-extrabold leading-none text-accent tnum">
            24:18
          </span>
        </div>
      }
      footer={
        // VETRO — il timer di recupero galleggia sopra il contenuto
        <div className="glass-chrome flex items-center gap-3 rounded-2xl px-4 py-3">
          <div className="min-w-0 flex-1">
            <PhoneLabel tone="text-amber">Recupero</PhoneLabel>
            <p className="font-metric text-[28px] font-extrabold leading-none text-amber tnum">
              01:28
            </p>
          </div>
          <span className="inline-flex h-11 items-center rounded-full bg-white/10 px-4 text-[13px] font-bold text-white">
            Salta
          </span>
        </div>
      }
    >
      <PhoneCard>
        <p className="text-[16px] font-bold leading-tight text-white">
          1. Rematore con bilanciere
        </p>
        <p className="mt-0.5 text-[11px] text-text-tertiary">Dorso · Bilanciere</p>
        <p className="mt-2 text-[12px] text-text-secondary tnum">
          Ultima seduta: 80×10 @7 · 82,5×9 @8
        </p>
        <p className="mt-2 flex items-start gap-1.5 rounded-xs bg-violet/10 px-2.5 py-1.5 text-[12px] leading-[1.35] text-violet">
          <Sparkles size={13} className="mt-0.5 shrink-0" aria-hidden />
          Hai chiuso il tetto di ripetizioni: sali a 85 kg.
        </p>

        <div className="mt-2.5 space-y-2">
          {TRACKER_SETS.map((s) => (
            <SetRowMock key={s.n} set={s} />
          ))}
        </div>
      </PhoneCard>

      {/* Esercizio successivo, ancora chiuso */}
      <PhoneCard className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-white">2. Lat machine presa larga</p>
          <p className="text-[11px] text-text-tertiary">Dorso · Cavi · 4 serie</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-text-tertiary" aria-hidden />
      </PhoneCard>

      {/* Azione di chiusura: menta = fatto */}
      <div className="flex h-12 items-center justify-center gap-2 rounded-full bg-mint text-[15px] font-bold text-void">
        <Check size={18} aria-hidden />
        Completa allenamento
      </div>
    </ScreenShell>
  );
}

/** La riga di serie: il componente firma del prodotto. */
function SetRowMock({ set }: { set: { n: number; load: string; reps: string; rpe: string; state: SetState } }) {
  const done = set.state === 'done';
  const current = set.state === 'current';

  return (
    <div
      className={cn(
        'flex h-14 items-center gap-2 rounded-sm px-2.5',
        done ? 'bg-mint/10' : 'bg-raised',
        current && 'ring-1 ring-accent',
      )}
    >
      <span
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold tnum',
          done ? 'bg-mint text-void' : current ? 'bg-accent text-white' : 'bg-card text-text-secondary',
        )}
      >
        {set.n}
      </span>

      <div className="flex flex-1 items-center justify-center gap-1.5">
        <span className="flex min-w-[58px] items-baseline justify-end gap-1 rounded-xs bg-card px-2 py-1.5">
          <span className={cn('font-metric text-[16px] font-bold leading-none tnum', set.load ? 'text-white' : 'text-text-tertiary')}>
            {set.load || '—'}
          </span>
          <span className="text-[10px] font-semibold text-text-tertiary">kg</span>
        </span>
        <span className="text-[12px] font-bold text-text-tertiary">×</span>
        <span className="min-w-[44px] rounded-xs bg-card px-2 py-1.5 text-right">
          <span className={cn('font-metric text-[16px] font-bold leading-none tnum', set.reps ? 'text-white' : 'text-text-tertiary')}>
            {set.reps || '—'}
          </span>
        </span>
        <span className="w-8 shrink-0 text-center">
          {set.rpe ? (
            <span className="text-[11px] font-bold text-amber tnum">@{set.rpe}</span>
          ) : null}
        </span>
      </div>

      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-full',
          done ? 'bg-mint text-void' : current ? 'border border-accent text-accent' : 'border border-line text-text-tertiary',
        )}
      >
        <Check size={18} aria-hidden />
      </span>
    </div>
  );
}

/* ============================================================
   Schermata 3 — RIEPILOGO
   ============================================================ */

function ScreenRiepilogo() {
  return (
    <ScreenShell
      header={
        <div>
          <PhoneLabel>Riepilogo seduta</PhoneLabel>
          <p className="mt-1 text-[17px] font-bold leading-tight text-white">
            Pull Volume · giovedì
          </p>
        </div>
      }
      footer={
        <div className="glass-chrome flex items-center justify-center rounded-2xl p-2">
          <span className="inline-flex h-11 w-full items-center justify-center rounded-full bg-white/10 text-[14px] font-bold text-white">
            Torna alla home
          </span>
        </div>
      }
    >
      {/* Il numero dominante della schermata */}
      <PhoneCard>
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-rose" aria-hidden />
          <PhoneLabel>Allenamento completato</PhoneLabel>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-metric text-[56px] font-extrabold leading-none text-white tnum">
            87
          </span>
          <span className="text-[15px] font-semibold text-text-secondary tnum">/100</span>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold text-mint tnum">
          Volume +6% rispetto alla volta scorsa
        </p>
      </PhoneCard>

      <div className="grid grid-cols-3 gap-2">
        {SUMMARY_STATS.map((s) => (
          <div key={s.label} className="rounded-sm bg-card px-2 py-1.5 text-center">
            <p
              className={cn(
                'font-metric text-[17px] font-bold leading-none tnum',
                // ciano = corpo: il recupero è una metrica del corpo, non della seduta
                s.label === 'Recupero' ? 'text-cyan' : 'text-white',
              )}
            >
              {s.value}
              {s.unit ? <span className="ml-0.5 text-[10px] font-semibold text-text-secondary">{s.unit}</span> : null}
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Record: rosa */}
      <PhoneCard className="p-3">
        <PhoneLabel tone="text-rose">Nuovi record · 2</PhoneLabel>
        <div className="mt-2 space-y-2">
          {[
            { ex: 'Rematore con bilanciere', kind: 'Carico massimo', val: '85 kg' },
            { ex: 'Lat machine', kind: '1RM stimato', val: '96 kg' },
          ].map((p) => (
            <div key={p.ex} className="flex items-center gap-2.5 rounded-xs bg-rose/10 px-2.5 py-1.5">
              <Trophy size={15} className="shrink-0 text-rose" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-white">{p.ex}</span>
                <span className="block text-[11px] text-text-secondary">{p.kind}</span>
              </span>
              <span className="font-metric shrink-0 text-[15px] font-bold text-rose tnum">
                {p.val}
              </span>
            </div>
          ))}
        </div>
      </PhoneCard>

      {/* Recap AI: viola */}
      <PhoneCard className="p-3">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-violet" aria-hidden />
          <PhoneLabel tone="text-violet">Il recap del coach AI</PhoneLabel>
        </div>
        <p className="mt-2 text-[12px] leading-[1.4] text-text-primary">
          Seduta solida: RPE nella fascia richiesta e volume in crescita. Giovedì prova 87,5 kg sul
          rematore.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
          <HeartPulse size={13} className="shrink-0 text-cyan" aria-hidden />
          Recupero previsto: 48 ore su questi muscoli.
        </p>
      </PhoneCard>
    </ScreenShell>
  );
}

/* ============================================================
   Schermata 4 — PROGRESSI
   ============================================================ */

function ScreenProgressi() {
  const maxVol = Math.max(...VOLUME_WEEKS);
  const minStr = Math.min(...STRENGTH_POINTS);
  const maxStr = Math.max(...STRENGTH_POINTS);
  const rangeStr = maxStr - minStr || 1;
  const line = STRENGTH_POINTS.map((v, i) => {
    const x = (i / (STRENGTH_POINTS.length - 1)) * 240;
    const y = 56 - ((v - minStr) / rangeStr) * 48;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <ScreenShell
      header={
        <div className="flex items-end justify-between gap-3">
          <div>
            <PhoneLabel>Andamento</PhoneLabel>
            <p className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
              Progressi
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white">
            8 settimane
          </span>
        </div>
      }
      footer={<TabBarMock current="Progressi" />}
    >
      <div className="grid grid-cols-3 gap-2">
        {PROGRESS_KPIS.map((k) => (
          <div key={k.label} className="rounded-sm bg-card px-2 py-3 text-center">
            <p className="font-metric text-[22px] font-extrabold leading-none text-white tnum">
              {k.value}
              {k.unit ? (
                <span className="ml-0.5 text-[10px] font-semibold text-text-secondary">{k.unit}</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.06em] text-text-secondary">
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Volume settimanale: ambra = sforzo */}
      <PhoneCard className="p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <PhoneLabel>Volume settimanale</PhoneLabel>
          <span className="text-[12px] font-bold text-mint tnum">+12%</span>
        </div>
        <div className="mt-3 flex h-[86px] items-end gap-1.5" aria-hidden>
          {VOLUME_WEEKS.map((v, i) => (
            <div key={i} className="flex-1">
              <div
                className={cn(
                  'w-full rounded-xs',
                  i === VOLUME_WEEKS.length - 1 ? 'bg-amber' : 'bg-amber/35',
                )}
                style={{ height: `${Math.round((v / maxVol) * 86)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-semibold text-text-secondary">
          <span>8 settimane fa</span>
          <span>questa settimana</span>
        </div>
      </PhoneCard>

      {/* Forza: rosa = record */}
      <PhoneCard className="p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <PhoneLabel>Squat · 1RM stimato</PhoneLabel>
          <span className="font-metric text-[15px] font-bold text-rose tnum">142 kg</span>
        </div>
        <div className="relative mt-3 h-14">
          <svg
            viewBox="0 0 240 64"
            preserveAspectRatio="none"
            className="h-full w-full text-rose"
            aria-hidden
          >
            <polyline
              points={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            className="absolute right-0 top-[8px] h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-rose ring-4 ring-rose/20"
            aria-hidden
          />
        </div>
        <p className="mt-2 text-[11px] text-text-secondary tnum">+14 kg in 6 sedute</p>
      </PhoneCard>

      {/* Insight: viola = generato dal motore */}
      <PhoneCard className="p-3.5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet" aria-hidden />
          <PhoneLabel tone="text-violet">Cosa dicono i dati</PhoneLabel>
        </div>
        <ul className="mt-2 space-y-1.5">
          <li className="flex items-start gap-2 text-[12px] leading-[1.4] text-text-primary">
            <Flame size={13} className="mt-0.5 shrink-0 text-amber" aria-hidden />
            Il volume sale da 3 settimane: la progressione sta funzionando.
          </li>
          <li className="flex items-start gap-2 text-[12px] leading-[1.4] text-text-primary">
            <Target size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            Il lunedì è il tuo giorno migliore: ci concentri il 38% del volume.
          </li>
        </ul>
      </PhoneCard>
    </ScreenShell>
  );
}

/* ============================================================
   Utility di sezione
   ============================================================ */

function SectionTitle({ icon: Icon, tone, title }: { icon: LucideIcon; tone: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={19} className={tone} aria-hidden />
      <h3 className="text-[17px] font-bold text-white">{title}</h3>
    </div>
  );
}
