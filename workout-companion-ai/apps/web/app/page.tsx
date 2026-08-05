import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Flame,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Tag,
  Timer,
  Users,
  Utensils,
} from 'lucide-react';
import { Badge, Card, GlassBar, KpiCard, buttonPrimary, buttonSecondary } from '@/components/ui';

/**
 * Vetrina di vendita (modalità Persuade) — sistema "Glass Over Iron".
 * FERRO = tutto ciò che si legge (numeri, righe, grafici): opaco, mai sfocato.
 * VETRO = solo il livello dei controlli (testata ancorata, barra d'azione del tracker).
 * La pagina dimostra il meccanismo del prodotto invece di dichiarare funzioni.
 * Tutti i dati mostrati sono d'esempio e marcati come tali.
 */

/* ------------------------------------------------------------------ dati */

type Step = {
  n: string;
  title: string;
  body: string;
  icon: LucideIcon;
  tile: string;
};

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Prescrizione',
    body: 'Costruisci il programma: blocchi, settimane, esercizi, serie, carichi e RPE target. Accanto, il piano alimentare con i macro del giorno.',
    icon: ClipboardList,
    tile: 'bg-accent/15 text-accent',
  },
  {
    n: '02',
    title: 'Esecuzione',
    body: 'L’atleta apre l’app in palestra e chiude serie per serie. Quello che arriva è il carico reale sollevato, non quello previsto.',
    icon: Check,
    tile: 'bg-mint/15 text-mint',
  },
  {
    n: '03',
    title: 'Feedback',
    body: 'A fine esercizio risponde su quattro scale — sforzo, difficoltà, energia, dolore — più una nota libera. Dieci secondi, e sai com’è andata davvero.',
    icon: Flame,
    tile: 'bg-amber/15 text-amber',
  },
  {
    n: '04',
    title: 'Analisi',
    body: 'Il portale incrocia volume, aderenza, peso, sonno e recupero. La tendenza si vede prima che diventi un infortunio o un abbandono.',
    icon: BarChart3,
    tile: 'bg-raised text-white',
  },
  {
    n: '05',
    title: 'Aggiustamento',
    body: 'Chiedi al coach AI cosa cambiare: risponde sui dati di quel cliente. Tu decidi, la scheda della settimana dopo parte già corretta.',
    icon: Sparkles,
    tile: 'bg-violet/15 text-violet',
  },
];

const CHAIN = ['Prescrizione', 'Esecuzione', 'Feedback', 'Analisi', 'Aggiustamento'];

type SetRow = {
  n: number;
  kg: string;
  reps: number;
  state: 'done' | 'live' | 'todo';
};

const SET_ROWS: SetRow[] = [
  { n: 1, kg: '90,0', reps: 8, state: 'done' },
  { n: 2, kg: '95,0', reps: 8, state: 'done' },
  { n: 3, kg: '100,0', reps: 6, state: 'live' },
  { n: 4, kg: '100,0', reps: 6, state: 'todo' },
];

/** Le quattro scale reali del feedback per esercizio (packages/shared → FEEDBACK_SCALES). */
type Scale = {
  label: string;
  value: number;
  band: string;
  bar: string;
  text: string;
};

const SCALES: Scale[] = [
  {
    label: 'Sforzo percepito',
    value: 8,
    band: 'massimale',
    bar: 'bg-amber',
    text: 'text-amber',
  },
  {
    label: 'Difficoltà',
    value: 6,
    band: 'giusta',
    bar: 'bg-accent',
    text: 'text-accent',
  },
  {
    label: 'Energia',
    value: 6,
    band: 'discreta',
    bar: 'bg-mint',
    text: 'text-mint',
  },
  {
    label: 'Dolore o fastidio',
    value: 2,
    band: 'nessuno',
    bar: 'bg-cyan',
    text: 'text-cyan',
  },
];

type Chain = {
  label: string;
  value: string;
  width: number;
  delta: string;
  good: boolean;
};

const CHAINS: Chain[] = [
  { label: 'Spinta', value: '42.300', width: 79, delta: '+6%', good: true },
  { label: 'Trazione', value: '38.900', width: 73, delta: '+11%', good: true },
  { label: 'Gambe', value: '53.300', width: 100, delta: '−3%', good: false },
];

const WEEKS: { w: string; v: string; h: number }[] = [
  { w: 'S1', v: '28.400', h: 80 },
  { w: 'S2', v: '30.100', h: 85 },
  { w: 'S3', v: '31.600', h: 89 },
  { w: 'S4', v: '30.200', h: 85 },
  { w: 'S5', v: '32.400', h: 92 },
  { w: 'S6', v: '33.800', h: 95 },
  { w: 'S7', v: '32.900', h: 93 },
  { w: 'S8', v: '35.400', h: 100 },
];

const AI_QUESTIONS = [
  'Analizza i progressi delle ultime 4 settimane',
  'Il cliente sta recuperando bene?',
  'Suggerisci aggiustamenti per la prossima settimana',
];

const PORTAL: { icon: LucideIcon; label: string; body: string }[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    body: 'Chi è a rischio, chi ha consegnato il check, cosa scade questa settimana.',
  },
  {
    icon: Users,
    label: 'Clienti',
    body: 'Anagrafica, intake, plicometria, TDEE e storico peso in una scheda sola.',
  },
  {
    icon: Dumbbell,
    label: 'Allenamenti',
    body: 'Programmi periodizzati: blocchi, serie, carichi e RPE target per esercizio.',
  },
  {
    icon: Utensils,
    label: 'Piani alimentari',
    body: 'Macro per giorno, progressioni di carico e scarico, TDEE Katch-McArdle.',
  },
  {
    icon: ClipboardCheck,
    label: 'Check & progressi',
    body: 'Foto, misure, peso e note: revisione settimanale con la tua risposta scritta.',
  },
  {
    icon: MessageSquare,
    label: 'Messaggi',
    body: 'Chat per cliente, con il programma e i suoi numeri sempre accanto.',
  },
  {
    icon: Tag,
    label: 'Listino',
    body: 'I tuoi pacchetti di coaching: nomi, durate e prezzi li decidi tu.',
  },
  {
    icon: CreditCard,
    label: 'Pagamenti',
    body: 'Abbonamenti e rinnovi gestiti con Stripe, senza fogli di calcolo.',
  },
];

/* ------------------------------------------------------------- primitive */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
      {children}
    </p>
  );
}

function DemoTag() {
  return <Badge>Dati d’esempio</Badge>;
}

/* -------------------------------------------------------------- pagina */

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* VETRO — la testata è un controllo che galleggia sul contenuto che scorre */}
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <GlassBar className="mx-auto flex max-w-[1240px] items-center gap-3 px-3 py-2.5 sm:px-4">
          <Link
            href="/"
            className="press flex min-h-[44px] items-center gap-2.5 rounded-full pr-2"
            aria-label="Workout Companion AI — home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xs bg-accent text-white">
              <Dumbbell size={19} />
            </span>
            <span className="hidden text-[15px] font-extrabold tracking-[-0.01em] text-white sm:block">
              Workout Companion
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Sezioni della pagina">
            {[
              { href: '#meccanismo', label: 'Come funziona' },
              { href: '#tracker', label: 'Tracker' },
              { href: '#analisi', label: 'Analisi' },
              { href: '#portale', label: 'Portale' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="press inline-flex min-h-[44px] items-center rounded-full px-3.5 text-[15px] font-medium text-text-secondary transition hover:bg-white/[0.06] hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="press hidden min-h-[44px] items-center rounded-full px-4 text-[15px] font-semibold text-text-secondary transition hover:bg-white/[0.06] hover:text-white sm:inline-flex"
            >
              Accedi
            </Link>
            <Link href="/registrati" className={buttonPrimary}>
              Inizia gratis
            </Link>
          </div>
        </GlassBar>
      </header>

      <main>
        {/* ============================================================ HERO */}
        <section className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:gap-16 lg:pb-32 lg:pt-24">
          <div>
            <div className="rise inline-flex items-center gap-2.5 rounded-full bg-raised px-3.5 py-2 text-[13px] font-semibold text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
              Due demo aperte, senza registrazione
            </div>

            <h1 className="rise rise-1 mt-6 max-w-[15ch] text-[clamp(42px,6.4vw,72px)] font-extrabold leading-[0.98] tracking-[-0.035em] text-white">
              Ogni serie torna indietro come dato.
            </h1>

            <p className="rise rise-2 mt-6 max-w-[58ch] text-[17px] leading-[1.5] text-text-secondary">
              Tu prescrivi la scheda, l’atleta la esegue dall’app e chiude ogni esercizio con
              sforzo, difficoltà, energia e dolore. Il portale trasforma quel feedback in analisi, e
              il coach AI ti propone l’aggiustamento della settimana dopo.{' '}
              <span className="font-semibold text-white">Cinque passaggi, un solo posto.</span>
            </p>

            {/* La catena del meccanismo, resa visibile */}
            <ol className="rise rise-3 mt-7 flex flex-wrap items-center gap-x-2 gap-y-2">
              {CHAIN.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="iron rounded-full px-3 py-1.5 text-[13px] font-semibold text-white">
                    {s}
                  </span>
                  {i < CHAIN.length - 1 && (
                    <ChevronRight size={15} className="text-text-tertiary" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>

            <div className="rise rise-4 mt-9 flex flex-wrap gap-3">
              <Link href="/demo" className={`${buttonPrimary} h-14 px-8 text-[17px]`}>
                Prova la demo coach
                <ArrowRight size={18} />
              </Link>
              <Link href="/atleta-demo" className={`${buttonSecondary} h-14 px-7 text-[17px]`}>
                Vedi l’app atleta
              </Link>
            </div>

            <p className="rise rise-5 mt-5 text-[13px] text-text-tertiary">
              Nessuna carta, nessun account: entri, giri il portale con un cliente d’esempio,
              decidi.
            </p>
          </div>

          {/* DIMOSTRAZIONE — vetro che galleggia su ferro */}
          <figure className="rise rise-2 m-0">
            <div className="relative pb-10">
              <Card beacon className="p-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Seduta in corso
                    </p>
                    <p className="mt-1 text-[22px] font-bold tracking-[-0.01em] text-white">
                      Upper Strength · Marco B.
                    </p>
                  </div>
                  <DemoTag />
                </div>

                <div className="mt-6 flex items-end justify-between gap-4 px-6">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Volume seduta
                    </p>
                    <p className="font-metric tnum mt-2 text-[56px] font-extrabold leading-none text-white">
                      14.280
                    </p>
                  </div>
                  <p className="pb-2 text-[15px] font-semibold text-text-secondary">kg</p>
                </div>

                <div className="mt-6 border-t border-line px-6 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-bold text-white">Panca piana</p>
                    <p className="tnum text-[13px] font-semibold text-text-secondary">
                      target 3×8 @ RPE 8
                    </p>
                  </div>

                  <ul className="mt-3 space-y-1.5 pb-16">
                    {SET_ROWS.map((r) => (
                      <li
                        key={r.n}
                        className={`flex min-h-[52px] items-center gap-3 rounded-xs px-3 ${
                          r.state === 'todo' ? 'bg-transparent' : 'bg-raised'
                        }`}
                      >
                        <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background text-[13px] font-bold text-text-secondary">
                          {r.n}
                        </span>
                        <span className="tnum font-metric text-[19px] font-bold text-white">
                          {r.kg}
                          <span className="ml-1 text-[13px] font-semibold text-text-tertiary">
                            kg
                          </span>
                        </span>
                        <span className="text-text-tertiary" aria-hidden="true">
                          ×
                        </span>
                        <span className="tnum font-metric text-[19px] font-bold text-white">
                          {r.reps}
                        </span>
                        <span className="ml-auto flex items-center gap-2 text-[13px] font-bold">
                          {r.state === 'done' && (
                            <>
                              <span className="text-mint">fatta</span>
                              <Check size={17} className="text-mint" aria-hidden="true" />
                            </>
                          )}
                          {r.state === 'live' && <span className="text-accent">in corso</span>}
                          {r.state === 'todo' && (
                            <span className="text-text-tertiary">da fare</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* VETRO — barra d'azione del tracker: solo comandi, mai dati da leggere.
                Il posizionamento sta sul contenitore: `.glass-chrome` impone position:relative. */}
              <div className="pointer-events-none absolute inset-x-5 bottom-4" aria-hidden="true">
                <GlassBar className="flex items-center gap-2 px-2.5 py-2.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint text-[#06210C]">
                    <Check size={22} strokeWidth={3} />
                  </span>
                  <span className="flex h-11 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-[15px] font-semibold text-white">
                    <Timer size={17} />
                    Recupero
                  </span>
                  <span className="ml-auto flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[15px] font-bold text-white">
                    Avanti
                    <ChevronRight size={17} />
                  </span>
                </GlassBar>
              </div>
            </div>

            <figcaption className="mt-3 text-[13px] leading-relaxed text-text-tertiary">
              Ferro sotto, vetro sopra: i numeri restano opachi e leggibili, i comandi galleggiano.
              È la stessa regola in tutto il prodotto.
            </figcaption>
          </figure>
        </section>

        {/* ====================================================== MECCANISMO */}
        <section id="meccanismo" className="border-t border-line bg-void/40">
          <div className="mx-auto max-w-[1240px] px-5 py-20 lg:py-24">
            <SectionLabel>Il meccanismo</SectionLabel>
            <h2 className="mt-3 max-w-[22ch] text-[clamp(30px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white">
              Un anello chiuso, non una scheda spedita e poi il silenzio.
            </h2>
            <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.5] text-text-secondary">
              La maggior parte del lavoro di un coach si perde tra la palestra e il foglio di
              calcolo. Qui i cinque passaggi vivono nello stesso sistema, quindi nessuno si perde
              per strada.
            </p>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.n}>
                  <Card className={`rise rise-${i + 1} h-full p-5`}>
                    <div className="flex items-center justify-between">
                      <span className={`grid h-10 w-10 place-items-center rounded-xs ${s.tile}`}>
                        <s.icon size={20} aria-hidden="true" />
                      </span>
                      <span className="tnum text-[13px] font-bold text-text-tertiary">{s.n}</span>
                    </div>
                    <h3 className="mt-4 text-[17px] font-bold tracking-[-0.01em] text-white">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.45] text-text-secondary">{s.body}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ========================================================= TRACKER */}
        <section id="tracker" className="border-t border-line">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <Card className="order-2 rise lg:order-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Riga di serie
                  </p>
                  <p className="mt-1 text-[22px] font-bold tracking-[-0.01em] text-white">
                    Rematore con bilanciere
                  </p>
                </div>
                <DemoTag />
              </div>

              <ul className="mt-5 space-y-2">
                {[
                  { n: 1, kg: '70,0', reps: 10, done: true },
                  { n: 2, kg: '72,5', reps: 10, done: true },
                  { n: 3, kg: '75,0', reps: 9, done: true },
                  { n: 4, kg: '75,0', reps: 8, done: false },
                ].map((r) => (
                  <li
                    key={r.n}
                    className="flex min-h-[64px] items-center gap-3 rounded-sm bg-raised px-4"
                  >
                    <span className="tnum grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-[15px] font-bold text-text-secondary">
                      {r.n}
                    </span>
                    <span className="tnum font-metric text-[26px] font-extrabold leading-none text-white">
                      {r.kg}
                    </span>
                    <span className="text-[13px] font-semibold text-text-tertiary">kg</span>
                    <span className="text-text-tertiary" aria-hidden="true">
                      ×
                    </span>
                    <span className="tnum font-metric text-[26px] font-extrabold leading-none text-white">
                      {r.reps}
                    </span>
                    <span
                      className={`ml-auto grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                        r.done ? 'bg-mint/15 text-mint' : 'bg-background text-text-tertiary'
                      }`}
                      aria-label={r.done ? `Serie ${r.n} completata` : `Serie ${r.n} da completare`}
                    >
                      <Check size={22} strokeWidth={3} aria-hidden="true" />
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[13px] text-text-tertiary">
                Bersaglio di conferma da 48px, cifre tabulari: il numero non balla mentre cambia.
              </p>
            </Card>

            <div className="order-1 lg:order-2">
              <SectionLabel>In palestra</SectionLabel>
              <h2 className="mt-3 max-w-[18ch] text-[clamp(30px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white">
                Progettato per mani sudate e testa altrove.
              </h2>
              <p className="mt-4 max-w-[54ch] text-[17px] leading-[1.5] text-text-secondary">
                La riga di serie è il componente che il tuo atleta tocca più di ogni altro. Carico e
                ripetizioni in cifre grandi, un bersaglio circolare per confermare, e la riga passa
                a verde con un colpo aptico. Nessun menù, nessuna finestra: si segna e si torna
                sotto il bilanciere.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  'Arrivano i carichi realmente sollevati, non quelli che avevi previsto.',
                  'Storico dell’esercizio a un tocco: sa sempre cosa ha fatto la volta prima.',
                  'Timer di recupero, cronometro, EMOM e AMRAP già dentro la seduta.',
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-[17px] leading-[1.45] text-text-secondary">
                    <Check size={19} className="mt-1 shrink-0 text-mint" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ======================================================== FEEDBACK */}
        <section className="border-t border-line bg-void/40">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div>
              <SectionLabel>Feedback per esercizio</SectionLabel>
              <h2 className="mt-3 max-w-[20ch] text-[clamp(30px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white">
                Sapere che ha finito non basta. Serve sapere a che prezzo.
              </h2>
              <p className="mt-4 max-w-[54ch] text-[17px] leading-[1.5] text-text-secondary">
                Alla fine di ogni esercizio l’atleta risponde su quattro scale da 1 a 10 e può
                lasciare una nota. Dieci secondi per lui, un quadro completo per te: due sedute con
                lo stesso volume ma sforzo diverso non sono la stessa seduta.
              </p>
              <p className="mt-4 max-w-[54ch] text-[17px] leading-[1.5] text-text-secondary">
                È il dato che manca a chi guarda solo le spunte di completamento — ed è quello che
                ti fa scalare il carico <span className="font-semibold text-white">prima</span> che
                l’atleta si faccia male o smetta di rispondere ai messaggi.
              </p>
            </div>

            <Card className="rise">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Esercizio chiuso · giovedì
                  </p>
                  <p className="mt-1 text-[22px] font-bold tracking-[-0.01em] text-white">
                    Panca piana
                  </p>
                </div>
                <DemoTag />
              </div>

              <ul className="mt-6 space-y-5">
                {SCALES.map((s) => (
                  <li key={s.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold text-white">{s.label}</span>
                      <span className="flex items-baseline gap-2">
                        <span className={`tnum font-metric text-[22px] font-extrabold ${s.text}`}>
                          {s.value}
                        </span>
                        <span className="tnum text-[13px] font-semibold text-text-tertiary">
                          /10
                        </span>
                        <span className="text-[13px] font-semibold text-text-secondary">
                          {s.band}
                        </span>
                      </span>
                    </div>
                    <div
                      className="mt-2 flex gap-1"
                      role="img"
                      aria-label={`${s.label}: ${s.value} su 10, ${s.band}`}
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <span
                          key={i}
                          className={`h-2 flex-1 rounded-full ${i < s.value ? s.bar : 'bg-raised'}`}
                        />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-sm bg-raised p-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Nota dell’atleta
                </p>
                <p className="mt-2 text-[15px] leading-[1.45] text-white">
                  “Ultima serie tirata, ho perso la spinta a metà. Spalla destra tranquilla.”
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* ========================================================= ANALISI */}
        <section id="analisi" className="border-t border-line">
          <div className="mx-auto max-w-[1240px] px-5 py-20 lg:py-28">
            <div className="max-w-[62ch]">
              <SectionLabel>Analisi</SectionLabel>
              <h2 className="mt-3 text-[clamp(30px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white">
                Il quadro del cliente in tre secondi, non in tre fogli di calcolo.
              </h2>
              <p className="mt-4 text-[17px] leading-[1.5] text-text-secondary">
                Volume, aderenza, record, recupero: quello che ti serve per decidere sta sopra; il
                dettaglio scorre sotto. Ogni numero è in cifre tabulari, così non balla mentre
                cambia.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Aderenza"
                value="94%"
                tone="mint"
                delta="+6% su 4 settimane"
                deltaGood
              />
              <KpiCard label="RPE medio" value="8,2" tone="amber" />
              <KpiCard label="Record del mese" value="3" tone="rose" />
              <KpiCard label="Recupero medio" value="86%" tone="cyan" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <Card className="rise rise-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[17px] font-bold text-white">Volume per catena</h3>
                  <DemoTag />
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">Ultime 4 settimane, in kg</p>

                <ul className="mt-6 space-y-5">
                  {CHAINS.map((c) => (
                    <li key={c.label}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] font-semibold text-white">{c.label}</span>
                        <span className="flex items-baseline gap-3">
                          <span className="tnum font-metric text-[19px] font-bold text-white">
                            {c.value}
                          </span>
                          <span
                            className={`tnum text-[13px] font-bold ${
                              c.good ? 'text-mint' : 'text-amber'
                            }`}
                          >
                            {c.delta}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-raised">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${c.width}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 flex items-start gap-2.5 text-[13px] leading-relaxed text-text-secondary">
                  <Activity size={16} className="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
                  Gambe in calo del 3% mentre la trazione cresce dell’11%: lo squilibrio si vede
                  prima che diventi un problema di postura.
                </p>
              </Card>

              <Card className="rise rise-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[17px] font-bold text-white">Tonnellaggio settimanale</h3>
                  <DemoTag />
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">Ultime 8 settimane, in kg</p>

                <div className="mt-8 flex h-[200px] items-end gap-2 sm:gap-3">
                  {WEEKS.map((w, i) => (
                    <div key={w.w} className="flex h-full flex-1 flex-col justify-end gap-2">
                      <span
                        className={`w-full rounded-t-xs ${
                          i === WEEKS.length - 1 ? 'bg-accent' : 'bg-raised'
                        }`}
                        style={{ height: `${w.h}%` }}
                        role="img"
                        aria-label={`Settimana ${i + 1}: ${w.v} kg`}
                      />
                      <span className="tnum text-center text-[11px] font-bold text-text-tertiary">
                        {w.w}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      Settimana corrente
                    </p>
                    <p className="tnum font-metric mt-2 text-[40px] font-extrabold leading-none text-white">
                      35.400
                      <span className="ml-1.5 text-[15px] font-semibold text-text-secondary">
                        kg
                      </span>
                    </p>
                  </div>
                  <p className="tnum text-[15px] font-bold text-mint">+24,6% su otto settimane</p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ============================================================== AI */}
        <section className="border-t border-line bg-void/40">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16 lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-violet/15 px-3 py-1.5 text-[13px] font-bold text-violet">
                <Sparkles size={15} aria-hidden="true" />
                Coach AI
              </span>
              <h2 className="mt-4 max-w-[18ch] text-[clamp(30px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white">
                Legge i dati di quel cliente. Non il web.
              </h2>
              <p className="mt-4 max-w-[54ch] text-[17px] leading-[1.5] text-text-secondary">
                Fai una domanda e la risposta arriva dai check-in, dagli allenamenti registrati e
                dal feedback per esercizio di quella persona. Niente consigli generici: numeri suoi,
                periodo suo, proposta concreta.
              </p>
              <p className="mt-4 max-w-[54ch] text-[17px] leading-[1.5] text-text-secondary">
                Resta un assistente: la proposta la valuti tu, e la scheda la firmi tu.
              </p>
            </div>

            <Card className="rise">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[17px] font-bold text-white">
                  <Sparkles size={17} className="text-violet" aria-hidden="true" />
                  Chiedi al coach AI
                </h3>
                <DemoTag />
              </div>

              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Domande frequenti">
                {AI_QUESTIONS.map((q, i) => (
                  <li
                    key={q}
                    className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${
                      i === 0 ? 'bg-violet/15 text-violet' : 'bg-raised text-text-secondary'
                    }`}
                  >
                    {q}
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-sm bg-raised p-5">
                <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-violet">
                  Risposta d’esempio
                </p>
                <p className="mt-3 text-[15px] leading-[1.5] text-white">
                  Nelle ultime quattro settimane la trazione è cresciuta dell’11% con sforzo
                  percepito stabile: quella progressione regge, tienila. Sulla panca invece l’RPE è
                  passato da 7,5 a 8,6 a parità di carico e Marco ha segnalato fastidio alla spalla
                  in due sedute su sei.
                </p>
                <p className="mt-3 text-[15px] leading-[1.5] text-white">
                  Proposta: una settimana di scarico sui distensori — volume a −15%, RPE target 6 —
                  e lavoro di dorso invariato. Rivalutiamo giovedì prossimo dopo il check-in.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* ========================================================= PORTALE */}
        <section id="portale" className="border-t border-line">
          <div className="mx-auto max-w-[1240px] px-5 py-20 lg:py-28">
            <div className="max-w-[62ch]">
              <SectionLabel>Il resto del portale</SectionLabel>
              <h2 className="mt-3 text-[clamp(30px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white">
                Otto sezioni, un solo strumento da aprire la mattina.
              </h2>
              <p className="mt-4 text-[17px] leading-[1.5] text-text-secondary">
                Tutto quello che oggi vive tra chat, fogli di calcolo e note vocali sta qui dentro,
                con lo stesso cliente al centro.
              </p>
            </div>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PORTAL.map((p) => (
                <li key={p.label}>
                  <Card className="h-full p-5">
                    <p.icon size={20} className="text-accent" aria-hidden="true" />
                    <h3 className="mt-4 text-[17px] font-bold tracking-[-0.01em] text-white">
                      {p.label}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-[1.45] text-text-secondary">
                      {p.body}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ======================================================== CHIUSURA */}
        <section className="border-t border-line bg-void/40">
          <div className="mx-auto max-w-[1240px] px-5 py-24 lg:py-32">
            <Card className="flex flex-col items-center px-6 py-16 text-center">
              <SectionLabel>Provalo adesso</SectionLabel>
              <h2 className="mt-4 max-w-[16ch] text-[clamp(32px,4.4vw,52px)] font-extrabold leading-[1.03] tracking-[-0.03em] text-white">
                Aprila e guardala lavorare.
              </h2>
              <p className="mt-5 max-w-[54ch] text-[17px] leading-[1.5] text-text-secondary">
                Le due demo sono complete e già popolate con un cliente d’esempio: il portale coach
                da una parte, l’esperienza dell’atleta dall’altra. Cinque minuti bastano per capire
                se è il tuo modo di lavorare.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/demo" className={`${buttonPrimary} h-14 px-8 text-[17px]`}>
                  Prova la demo coach
                  <ArrowRight size={18} />
                </Link>
                <Link href="/atleta-demo" className={`${buttonSecondary} h-14 px-7 text-[17px]`}>
                  Vedi l’app atleta
                </Link>
              </div>
              <Link
                href="/registrati"
                className="press mt-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-accent transition hover:text-accent-hover"
              >
                Oppure crea subito il tuo account
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xs bg-raised text-accent">
              <Dumbbell size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[15px] font-extrabold tracking-[-0.01em] text-white">
                Workout Companion AI
              </span>
              <span className="block text-[13px] text-text-tertiary">
                Portale coach + app atleta
              </span>
            </span>
          </div>

          <nav className="flex flex-wrap gap-x-1 gap-y-1" aria-label="Collegamenti principali">
            {[
              { href: '/demo', label: 'Demo coach' },
              { href: '/atleta-demo', label: 'App atleta' },
              { href: '/login', label: 'Accedi' },
              { href: '/registrati', label: 'Crea account' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="press inline-flex min-h-[44px] items-center rounded-full px-3.5 text-[15px] font-medium text-text-secondary transition hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
