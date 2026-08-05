'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BatteryCharging,
  CalendarRange,
  CheckCircle2,
  Flame,
  Footprints,
  Gauge,
  Info,
  Minus,
  Moon,
  NotebookPen,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Card, EmptyState, GlassBar } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';

export interface BiofeedbackEntry {
  id: string;
  log_date: string;
  sleep_quality: number | null;
  sleep_hours: number | null;
  stress_level: number | null;
  energy_level: number | null;
  muscle_soreness: number | null;
  joint_stress: number | null;
  recovery: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  kcal_consumed: number | null;
  hydration_l: number | null;
  steps: number | null;
  weight_kg: number | null;
  notes: string | null;
}

const WINDOWS = [7, 14, 30] as const;
type WindowDays = (typeof WINDOWS)[number];

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

/* I segnali portano significato: ciano = corpo (sonno, recupero, nutrizione),
   ambra = sforzo (stress, dolore), menta = energia. Il resto è ferro neutro. */
const C_CYAN = '#64D2FF';
const C_MINT = '#32D74B';
const C_AMBER = '#FF9F0A';
const C_WHITE = '#FFFFFF';
const C_MIST = '#9BA6B8';
const C_LINE = '#2A3241';
const C_AXIS = '#6B7688';

const xAxisProps = {
  dataKey: 'label',
  tick: { fill: C_AXIS, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: C_LINE },
  tickMargin: 8,
  minTickGap: 14,
};

const yAxisProps = {
  tick: { fill: C_AXIS, fontSize: 11 },
  tickLine: false,
  axisLine: false,
  width: 40,
};

type Tone = 'cyan' | 'mint' | 'amber' | 'rose' | 'violet' | 'neutral';

const TONE: Record<Tone, { text: string; chip: string; bar: string; edge: string }> = {
  cyan: { text: 'text-cyan', chip: 'bg-cyan/15', bar: 'bg-cyan', edge: 'border-cyan' },
  mint: { text: 'text-mint', chip: 'bg-mint/15', bar: 'bg-mint', edge: 'border-mint' },
  amber: { text: 'text-amber', chip: 'bg-amber/15', bar: 'bg-amber', edge: 'border-amber' },
  rose: { text: 'text-rose', chip: 'bg-rose/15', bar: 'bg-rose', edge: 'border-rose' },
  violet: { text: 'text-violet', chip: 'bg-violet/15', bar: 'bg-violet', edge: 'border-violet' },
  neutral: {
    text: 'text-text-secondary',
    chip: 'bg-raised',
    bar: 'bg-text-tertiary',
    edge: 'border-line',
  },
};

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Etichetta asse X breve in italiano, es. "Lun 13". */
function shortDay(iso: string): string {
  const d = parseDate(iso);
  return `${DAYS_IT[d.getDay()]} ${d.getDate()}`;
}

function avg(entries: BiofeedbackEntry[], key: keyof BiofeedbackEntry): number | null {
  const vals = entries
    .map((e) => e[key])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function pctDelta(cur: number | null, prev: number | null): number | null {
  if (cur == null || prev == null || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/** "7h 23m" (o "7h23m" in versione compatta) da ore decimali. */
function formatSleep(hours: number | null | undefined, compact = false): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = String(total % 60).padStart(2, '0');
  return compact ? `${h}h${m}m` : `${h}h ${m}m`;
}

function fmtInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('it-IT');
}

function fmt1(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/* ------------------------------------------------------------------ */
/* Cronografia dei grafici — tutto poggia su FERRO opaco               */
/* ------------------------------------------------------------------ */

interface TipEntry {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  dataKey?: string | number;
}

/** Tooltip in ferro scuro: nessuna sfocatura sotto ai numeri. */
function IronTooltip({
  active,
  payload,
  label,
  render,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  render?: (name: string, value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => p.value != null);
  if (rows.length === 0) return null;
  return (
    <div className="min-w-[168px] rounded-xs border border-line bg-raised px-3.5 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.55)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-tertiary">
        {String(label ?? '')}
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map((p, i) => {
          const raw = Array.isArray(p.value) ? p.value[0] : p.value;
          const num = typeof raw === 'number' ? raw : Number(raw);
          const name = String(p.name ?? '');
          return (
            <div key={`${name}-${i}`} className="flex items-center gap-2.5 text-[13px]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: p.color ?? C_MIST }}
                aria-hidden
              />
              <span className="text-text-secondary">{name}</span>
              <span className="tnum ml-auto font-bold text-white">
                {Number.isFinite(num)
                  ? render
                    ? render(name, num)
                    : num.toLocaleString('it-IT')
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Chip di legenda: replica tratto e tratteggio della serie. */
function LegendChip({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
      <span
        className="h-[3px] w-4 rounded-full"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 9px)`
            : color,
        }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** Testata comune ai pannelli grafico: icona segnale, titolo, legenda a destra. */
function ChartHead({
  icon: Icon,
  tone,
  title,
  hint,
  legend,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint?: string;
  legend?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xs', TONE[tone].chip)}
        >
          <Icon size={17} className={TONE[tone].text} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-bold leading-tight text-white">{title}</h3>
          {hint && <p className="mt-0.5 truncate text-[12px] text-text-tertiary">{hint}</p>}
        </div>
      </div>
      {legend && <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">{legend}</div>}
    </div>
  );
}

/** Pannello grafico in ferro: testata, legenda esplicita, tela sotto. */
function ChartCard({
  icon,
  tone,
  title,
  hint,
  legend,
  height,
  className,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint?: string;
  legend?: React.ReactNode;
  height: number;
  className?: string;
  children: React.ReactElement;
}) {
  return (
    <Card className={cn('rise', className)}>
      <ChartHead icon={icon} tone={tone} title={title} hint={hint} legend={legend} />
      <div className="mt-6" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* KPI                                                                 */
/* ------------------------------------------------------------------ */

/** Confronto con la finestra precedente: freccia + segno + colore, mai il solo colore. */
function DeltaLine({
  deltaPct,
  downIsGood = false,
  goodOverride,
  size = 'sm',
}: {
  deltaPct: number | null;
  downIsGood?: boolean;
  goodOverride?: boolean;
  size?: 'sm' | 'md';
}) {
  const rounded = deltaPct == null ? null : Math.round(deltaPct);
  const good = goodOverride ?? (rounded == null ? false : downIsGood ? rounded < 0 : rounded > 0);
  const text = size === 'md' ? 'text-[13px]' : 'text-[12px]';
  const icon = size === 'md' ? 15 : 13;

  if (rounded == null) {
    return (
      <span className={cn('font-semibold text-text-tertiary', text)}>nessun confronto</span>
    );
  }
  if (rounded === 0) {
    return (
      <span className={cn('flex items-center gap-1.5 font-semibold text-text-secondary', text)}>
        <Minus size={icon} aria-hidden /> stabile
      </span>
    );
  }
  return (
    <span
      className={cn(
        'tnum flex items-center gap-1.5 font-semibold',
        text,
        good ? 'text-mint' : 'text-rose'
      )}
    >
      {rounded > 0 ? <TrendingUp size={icon} aria-hidden /> : <TrendingDown size={icon} aria-hidden />}
      {Math.abs(rounded)}%
      <span className="font-medium text-text-tertiary">vs periodo prec.</span>
    </span>
  );
}

/** Tile KPI (scala di KpiCard) con sottotitolo e delta vs finestra precedente. */
function BioKpi({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  deltaPct,
  downIsGood = false,
  goodOverride,
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub?: string;
  deltaPct: number | null;
  downIsGood?: boolean;
  goodOverride?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col p-5 rise', className)}>
      <div className="flex items-center gap-2">
        <Icon size={15} className={cn('shrink-0', TONE[tone].text)} aria-hidden />
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
          {label}
        </span>
      </div>
      <div
        className={cn(
          'font-metric tnum mt-3 whitespace-nowrap text-[26px] font-extrabold leading-none',
          TONE[tone].text
        )}
      >
        {value}
      </div>
      {sub && <div className="tnum mt-1.5 truncate text-[12px] text-text-tertiary">{sub}</div>}
      <div className="mt-auto pt-3">
        <DeltaLine deltaPct={deltaPct} downIsGood={downIsGood} goodOverride={goodOverride} />
      </div>
    </Card>
  );
}

/** Lettura di supporto nel blocco dominante: etichetta, valore e barra 0-10. */
function HeroReading({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number | null;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon size={14} className={cn('shrink-0', TONE[tone].text)} aria-hidden />
        <span className="text-[13px] font-semibold text-text-secondary">{label}</span>
        <span className="tnum ml-auto text-[15px] font-bold text-white">
          {value != null ? fmt1(value) : '—'}
          <span className="text-[12px] font-semibold text-text-tertiary">/10</span>
        </span>
      </div>
      <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-raised" aria-hidden>
        <span
          className={cn('block h-full rounded-full', TONE[tone].bar)}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

/** Valore 0-10 con barretta: il colore non è mai l'unico portatore d'informazione. */
function Score({ value, tone }: { value: number | null; tone: Tone }) {
  if (value == null) return <span className="text-text-tertiary">—</span>;
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <span className="flex items-center gap-2.5">
      <span className="tnum min-w-[44px] font-semibold text-white">
        {value.toLocaleString('it-IT')}/10
      </span>
      <span
        className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-raised lg:block"
        aria-hidden
      >
        <span
          className={cn('block h-full rounded-full', TONE[tone].bar)}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

type InsightTone = 'mint' | 'amber' | 'rose' | 'cyan';
interface Insight {
  tone: InsightTone;
  icon: LucideIcon;
  title: string;
  text: string;
}

/* Le righe più gravi salgono in cima: il coach legge prima ciò che scotta. */
const SEVERITY: Record<InsightTone, number> = { rose: 0, amber: 1, cyan: 2, mint: 3 };
const SEVERITY_LABEL: Record<InsightTone, string> = {
  rose: 'Da gestire subito',
  amber: 'Da tenere d’occhio',
  cyan: 'Margine di crescita',
  mint: 'Sta funzionando',
};

/* ------------------------------------------------------------------ */

export function BiofeedbackDashboard({
  entries,
  kcalTarget,
}: {
  entries: BiofeedbackEntry[];
  kcalTarget: number | null;
}) {
  const [days, setDays] = useState<WindowDays>(7);

  const { current, previous } = useMemo(() => {
    if (entries.length === 0) {
      return { current: [] as BiofeedbackEntry[], previous: [] as BiofeedbackEntry[] };
    }
    const anchor = parseDate(entries[entries.length - 1].log_date).getTime();
    const diffDays = (e: BiofeedbackEntry) =>
      Math.round((anchor - parseDate(e.log_date).getTime()) / 86_400_000);
    return {
      current: entries.filter((e) => diffDays(e) < days),
      previous: entries.filter((e) => diffDays(e) >= days && diffDays(e) < days * 2),
    };
  }, [entries, days]);

  const chartData = useMemo(
    () =>
      current.map((e) => ({
        label: shortDay(e.log_date),
        ore: e.sleep_hours,
        qualita: e.sleep_quality,
        kcal: e.kcal_consumed,
        carboidrati: e.carbs_g,
        proteine: e.protein_g,
        grassi: e.fat_g,
        stress: e.stress_level,
        energia: e.energy_level,
        recupero: e.recovery,
        dolore: e.muscle_soreness,
        articolazioni: e.joint_stress,
        passi: e.steps,
        peso: e.weight_kg,
      })),
    [current]
  );

  if (entries.length === 0) {
    return (
      <EmptyState
        emoji="📊"
        title="Nessun biofeedback registrato"
        description="Il cliente registra ogni giorno sonno, stress, energia, alimentazione e passi dall'app mobile. Appena arriveranno i primi dati li vedrai qui, giorno per giorno."
      />
    );
  }

  // Medie della finestra corrente e di quella precedente (stessa lunghezza)
  const curSleepH = avg(current, 'sleep_hours');
  const curSleepQ = avg(current, 'sleep_quality');
  const curStress = avg(current, 'stress_level');
  const curEnergy = avg(current, 'energy_level');
  const curRecovery = avg(current, 'recovery');
  const curKcal = avg(current, 'kcal_consumed');
  const curSteps = avg(current, 'steps');

  const prevSleepH = avg(previous, 'sleep_hours');
  const prevSleepQ = avg(previous, 'sleep_quality');
  const prevStress = avg(previous, 'stress_level');
  const prevEnergy = avg(previous, 'energy_level');
  const prevRecovery = avg(previous, 'recovery');
  const prevKcal = avg(previous, 'kcal_consumed');
  const prevSteps = avg(previous, 'steps');

  const dKcal = pctDelta(curKcal, prevKcal);
  // Per le kcal "meglio" = più vicino al target (se esiste), altrimenti in aumento
  const kcalGood =
    dKcal == null
      ? undefined
      : kcalTarget != null && curKcal != null && prevKcal != null
        ? Math.abs(curKcal - kcalTarget) <= Math.abs(prevKcal - kcalTarget)
        : dKcal > 0;

  // Insights automatici (finestra corrente vs precedente)
  const insights: Insight[] = [];
  const dSleepQ = pctDelta(curSleepQ, prevSleepQ);
  if (dSleepQ != null && dSleepQ >= 5) {
    insights.push({
      tone: 'mint',
      icon: CheckCircle2,
      title: 'Sonno in miglioramento',
      text: `Qualità del sonno +${Math.round(dSleepQ)}% sul periodo precedente: la routine serale sta funzionando, non cambiarla.`,
    });
  } else if (dSleepQ != null && dSleepQ <= -5) {
    insights.push({
      tone: 'amber',
      icon: AlertTriangle,
      title: 'Sonno in calo',
      text: `Qualità del sonno ${Math.round(dSleepQ)}%: indaga su routine serale, orari e carico degli ultimi giorni.`,
    });
  }
  const dStress = pctDelta(curStress, prevStress);
  if (dStress != null && dStress >= 5) {
    insights.push({
      tone: 'amber',
      icon: AlertTriangle,
      title: 'Stress in aumento',
      text: `Stress medio +${Math.round(dStress)}%: valuta di alleggerire il volume o spostare la seduta pesante.`,
    });
  } else if (dStress != null && dStress <= -5) {
    insights.push({
      tone: 'mint',
      icon: CheckCircle2,
      title: 'Stress in calo',
      text: `Stress medio ${Math.round(dStress)}%: la gestione del carico sta reggendo bene.`,
    });
  }
  if (kcalTarget != null && kcalTarget > 0 && curKcal != null) {
    const adherence = Math.round((curKcal / kcalTarget) * 100);
    if (Math.abs(adherence - 100) <= 5) {
      insights.push({
        tone: 'mint',
        icon: CheckCircle2,
        title: 'Aderenza calorica solida',
        text: `Introito medio al ${adherence}% del target (${fmtInt(kcalTarget)} kcal): il piano viene seguito.`,
      });
    } else if (adherence > 105) {
      insights.push({
        tone: 'amber',
        icon: AlertTriangle,
        title: 'Introito sopra il target',
        text: `Media al ${adherence}% delle kcal previste: rivedi porzioni, condimenti ed extra fuori piano.`,
      });
    } else {
      insights.push({
        tone: 'amber',
        icon: AlertTriangle,
        title: 'Introito sotto il target',
        text: `Media al ${adherence}% delle kcal previste: verifica che il piano sia sostenibile e davvero tracciato.`,
      });
    }
  }
  if (curSteps != null) {
    if (curSteps >= 10_000) {
      insights.push({
        tone: 'mint',
        icon: CheckCircle2,
        title: 'Attività quotidiana alta',
        text: `Media di ${fmtInt(curSteps)} passi al giorno: ottimo livello di movimento fuori dalla palestra.`,
      });
    } else {
      insights.push({
        tone: 'cyan',
        icon: Info,
        title: 'Passi sotto quota 10.000',
        text: `Media di ${fmtInt(curSteps)} passi: c'è margine per alzare il dispendio senza toccare gli allenamenti.`,
      });
    }
  }
  if (curRecovery != null && curRecovery < 5) {
    insights.push({
      tone: 'rose',
      icon: AlertOctagon,
      title: 'Recupero insufficiente',
      text: `Recupero medio a ${fmt1(curRecovery)}/10: metti in agenda una settimana di scarico prima che diventi un infortunio.`,
    });
  }
  insights.sort((a, b) => SEVERITY[a.tone] - SEVERITY[b.tone]);

  const weightSeries = chartData.filter((d) => d.peso != null);
  const hasWeight = weightSeries.length >= 2;
  const hasPain = chartData.some((d) => d.dolore != null || d.articolazioni != null);
  const recent = entries.slice(-7).reverse();

  // Oltre due settimane di punti i pallini diventano rumore: restano le linee.
  const dense = chartData.length > 14;
  const dot = (color: string, r = 2.5) => (dense ? false : { fill: color, r, strokeWidth: 0 });

  const scoreTip = (_name: string, v: number) => `${v.toLocaleString('it-IT')}/10`;

  return (
    <div className="space-y-5">
      {/* VETRO — il livello dei controlli galleggia sul contenuto che scorre */}
      <GlassBar className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-full p-2">
        <div className="flex items-center gap-1" role="group" aria-label="Finestra temporale">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              aria-pressed={days === w}
              className={cn(
                'press min-h-[44px] rounded-full px-4 text-[14px] font-bold transition sm:px-5',
                days === w
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-white/[0.06] hover:text-white'
              )}
            >
              {w} giorni
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 text-[12px] font-semibold text-text-secondary">
          <CalendarRange size={14} aria-hidden />
          <span className="tnum">
            {current.length} {current.length === 1 ? 'giorno compilato' : 'giorni compilati'}
          </span>
        </div>
      </GlassBar>

      {current.length === 0 ? (
        <Card className="rise flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xs bg-raised">
            <CalendarRange size={20} className="text-text-secondary" aria-hidden />
          </span>
          <div>
            <h3 className="text-[17px] font-bold text-white">
              Nessun dato negli ultimi {days} giorni
            </h3>
            <p className="mt-1 text-[15px] text-text-secondary">
              Allarga la finestra temporale qui sopra, oppure ricorda al cliente di compilare il
              diario giornaliero dall&apos;app.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI — la fotografia del periodo, in alto */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <BioKpi
              icon={Moon}
              tone="cyan"
              label="Sonno medio"
              value={formatSleep(curSleepH)}
              sub={curSleepQ != null ? `Qualità ${fmt1(curSleepQ)}/10` : undefined}
              deltaPct={pctDelta(curSleepH, prevSleepH)}
              className="rise-1"
            />
            <BioKpi
              icon={Zap}
              tone="amber"
              label="Stress medio"
              value={curStress != null ? `${fmt1(curStress)}/10` : '—'}
              deltaPct={dStress}
              downIsGood
              className="rise-1"
            />
            <BioKpi
              icon={BatteryCharging}
              tone="mint"
              label="Energia media"
              value={curEnergy != null ? `${fmt1(curEnergy)}/10` : '—'}
              deltaPct={pctDelta(curEnergy, prevEnergy)}
              className="rise-2"
            />
            <BioKpi
              icon={Flame}
              tone="neutral"
              label="Kcal medie"
              value={fmtInt(curKcal)}
              sub={
                kcalTarget != null && kcalTarget > 0 && curKcal != null
                  ? `${Math.round((curKcal / kcalTarget) * 100)}% del target`
                  : undefined
              }
              deltaPct={dKcal}
              goodOverride={kcalGood}
              className="rise-2"
            />
            <BioKpi
              icon={Footprints}
              tone="cyan"
              label="Passi medi"
              value={fmtInt(curSteps)}
              deltaPct={pctDelta(curSteps, prevSteps)}
              className="col-span-2 rise-3 md:col-span-1"
            />
          </div>

          {/* DOMINANTE — un solo numero comanda la lettura, e il grafico lo spiega */}
          <Card className="rise rise-3">
            <ChartHead
              icon={Gauge}
              tone="cyan"
              title="Stato del corpo"
              hint="Recupero, energia e stress sulla stessa scala 0-10"
              legend={
                <>
                  <LegendChip color={C_CYAN} label="Recupero" />
                  <LegendChip color={C_MINT} label="Energia" />
                  <LegendChip color={C_AMBER} label="Stress" dashed />
                </>
              }
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,212px)_minmax(0,1fr)] lg:gap-8">
              <div className="flex flex-col justify-center border-b border-line pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Recupero medio
                </span>
                <div className="font-metric tnum mt-3 whitespace-nowrap text-[56px] font-extrabold leading-none text-cyan">
                  {curRecovery != null ? fmt1(curRecovery) : '—'}
                  <span className="ml-1 text-[22px] font-bold text-text-tertiary">/10</span>
                </div>
                <div className="mt-3">
                  <DeltaLine deltaPct={pctDelta(curRecovery, prevRecovery)} size="md" />
                </div>
                <div className="mt-6 space-y-4 border-t border-line pt-5">
                  <HeroReading
                    icon={BatteryCharging}
                    tone="mint"
                    label="Energia"
                    value={curEnergy}
                  />
                  <HeroReading icon={Zap} tone="amber" label="Stress" value={curStress} />
                </div>
              </div>

              <div className="h-[268px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="bioRecupero" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C_CYAN} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={C_CYAN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                    <Tooltip
                      cursor={{ stroke: C_LINE, strokeWidth: 1 }}
                      content={<IronTooltip render={scoreTip} />}
                    />
                    <ReferenceLine y={5} stroke={C_LINE} strokeDasharray="4 6" />
                    <Area
                      type="monotone"
                      dataKey="recupero"
                      name="Recupero"
                      stroke="none"
                      fill="url(#bioRecupero)"
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="recupero"
                      name="Recupero"
                      stroke={C_CYAN}
                      strokeWidth={2.5}
                      dot={dot(C_CYAN, 3)}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="energia"
                      name="Energia"
                      stroke={C_MINT}
                      strokeWidth={2}
                      dot={dot(C_MINT)}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="stress"
                      name="Stress"
                      stroke={C_AMBER}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={dot(C_AMBER)}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* IL FARO — la lettura che il motore fa del periodo */}
          <Card beacon className="rise rise-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-violet/15">
                <Sparkles size={17} className="text-violet" aria-hidden />
              </span>
              <h3 className="text-[17px] font-bold text-white">Lettura del periodo</h3>
              <Badge color="violet">Generato dal motore</Badge>
            </div>

            {insights.length === 0 ? (
              <p className="mt-5 text-[15px] leading-relaxed text-text-secondary">
                Niente da segnalare: i valori restano nella norma e non ci sono scostamenti
                significativi rispetto al periodo precedente. Tieni la rotta.
              </p>
            ) : (
              <ul className="mt-5 grid gap-2.5 lg:grid-cols-2">
                {insights.map((ins, i) => (
                  <li
                    key={i}
                    className={cn(
                      'flex items-start gap-3 rounded-xs border-l-[3px] bg-raised px-4 py-3.5',
                      TONE[ins.tone].edge
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[9px]',
                        TONE[ins.tone].chip
                      )}
                    >
                      <ins.icon size={15} className={TONE[ins.tone].text} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[14px] font-bold text-white">{ins.title}</span>
                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-[0.06em]',
                            TONE[ins.tone].text
                          )}
                        >
                          {SEVERITY_LABEL[ins.tone]}
                        </span>
                      </p>
                      <p className="mt-1 text-[14px] leading-snug text-text-secondary">
                        {ins.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Sonno e nutrizione */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              icon={Moon}
              tone="cyan"
              title="Andamento sonno"
              hint="Durata in ore, qualità percepita 0-10"
              height={260}
              legend={
                <>
                  <LegendChip color={C_CYAN} label="Ore" />
                  <LegendChip color={C_WHITE} label="Qualità" dashed />
                </>
              }
            >
              <ComposedChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} yAxisId="ore" />
                <YAxis
                  {...yAxisProps}
                  yAxisId="qualita"
                  orientation="right"
                  domain={[0, 10]}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: C_WHITE, opacity: 0.04 }}
                  content={
                    <IronTooltip
                      render={(name, v) =>
                        name === 'Ore di sonno' ? formatSleep(v) : `${v.toLocaleString('it-IT')}/10`
                      }
                    />
                  }
                />
                <Bar
                  yAxisId="ore"
                  dataKey="ore"
                  name="Ore di sonno"
                  fill={C_CYAN}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={20}
                />
                <Line
                  yAxisId="qualita"
                  type="monotone"
                  dataKey="qualita"
                  name="Qualità"
                  stroke={C_WHITE}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={dot(C_WHITE)}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ChartCard>

            <ChartCard
              icon={Flame}
              tone="cyan"
              title="Introito calorico"
              hint={
                kcalTarget != null ? `Target del piano attivo: ${fmtInt(kcalTarget)} kcal` : undefined
              }
              height={260}
              legend={
                <>
                  <LegendChip color={C_CYAN} label="Kcal" />
                  {kcalTarget != null && <LegendChip color={C_MIST} label="Target" dashed />}
                </>
              }
            >
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -6 }}>
                <defs>
                  <linearGradient id="bioKcal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C_CYAN} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={C_CYAN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} domain={[0, 'auto']} width={46} />
                <Tooltip
                  cursor={{ stroke: C_LINE, strokeWidth: 1 }}
                  content={<IronTooltip render={(_n, v) => `${fmtInt(v)} kcal`} />}
                />
                {kcalTarget != null && (
                  <ReferenceLine
                    y={kcalTarget}
                    stroke={C_MIST}
                    strokeDasharray="6 4"
                    ifOverflow="extendDomain"
                    label={{
                      value: 'Target',
                      fill: C_MIST,
                      fontSize: 11,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="kcal"
                  name="Kcal"
                  stroke="none"
                  fill="url(#bioKcal)"
                  isAnimationActive={false}
                  legendType="none"
                  tooltipType="none"
                />
                <Line
                  type="monotone"
                  dataKey="kcal"
                  name="Kcal"
                  stroke={C_CYAN}
                  strokeWidth={2.5}
                  dot={dot(C_CYAN, 3)}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ChartCard>
          </div>

          {/* Macro e movimento */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              icon={Utensils}
              tone="cyan"
              title="Macronutrienti"
              hint="Grammi al giorno"
              height={260}
              legend={
                <>
                  <LegendChip color={C_CYAN} label="Carboidrati" />
                  <LegendChip color={C_WHITE} label="Proteine" dashed />
                  <LegendChip color={C_MIST} label="Grassi" dashed />
                </>
              }
            >
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} domain={[0, 'auto']} />
                <Tooltip
                  cursor={{ stroke: C_LINE, strokeWidth: 1 }}
                  content={<IronTooltip render={(_n, v) => `${fmtInt(v)} g`} />}
                />
                <Line
                  type="monotone"
                  dataKey="carboidrati"
                  name="Carboidrati"
                  stroke={C_CYAN}
                  strokeWidth={2.5}
                  dot={dot(C_CYAN)}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="proteine"
                  name="Proteine"
                  stroke={C_WHITE}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={dot(C_WHITE)}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="grassi"
                  name="Grassi"
                  stroke={C_MIST}
                  strokeWidth={2}
                  strokeDasharray="2 5"
                  dot={dot(C_MIST)}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ChartCard>

            <ChartCard
              icon={Footprints}
              tone="cyan"
              title="Passi giornalieri"
              hint="Soglia di riferimento: 10.000 passi"
              height={260}
              legend={
                <>
                  <LegendChip color={C_CYAN} label="Passi" />
                  <LegendChip color={C_MIST} label="Soglia" dashed />
                </>
              }
            >
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -6 }}>
                <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} domain={[0, 'auto']} width={46} />
                <Tooltip
                  cursor={{ fill: C_WHITE, opacity: 0.04 }}
                  content={<IronTooltip render={(_n, v) => `${fmtInt(v)} passi`} />}
                />
                <ReferenceLine y={10_000} stroke={C_MIST} strokeDasharray="6 4" />
                <Bar
                  dataKey="passi"
                  name="Passi"
                  fill={C_CYAN}
                  fillOpacity={0.65}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={20}
                />
              </ComposedChart>
            </ChartCard>
          </div>

          {/* Corpo che si logora e peso: la coda lunga del monitoraggio */}
          {(hasPain || hasWeight) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {hasPain && (
                <ChartCard
                  icon={Activity}
                  tone="amber"
                  title="Dolori e articolazioni"
                  hint="Indolenzimento muscolare e stress articolare, scala 0-10"
                  height={240}
                  className={hasWeight ? undefined : 'lg:col-span-2'}
                  legend={
                    <>
                      <LegendChip color={C_AMBER} label="Muscoli" />
                      <LegendChip color={C_AMBER} label="Articolazioni" dashed />
                    </>
                  }
                >
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
                  >
                    <defs>
                      <linearGradient id="bioDolore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C_AMBER} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={C_AMBER} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                    <Tooltip
                      cursor={{ stroke: C_LINE, strokeWidth: 1 }}
                      content={<IronTooltip render={scoreTip} />}
                    />
                    <ReferenceLine y={7} stroke={C_LINE} strokeDasharray="4 6" />
                    <Area
                      type="monotone"
                      dataKey="dolore"
                      name="Muscoli"
                      stroke="none"
                      fill="url(#bioDolore)"
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="dolore"
                      name="Muscoli"
                      stroke={C_AMBER}
                      strokeWidth={2.5}
                      dot={dot(C_AMBER, 3)}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="articolazioni"
                      name="Articolazioni"
                      stroke={C_AMBER}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={dot(C_AMBER)}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ChartCard>
              )}

              {hasWeight && (
                <ChartCard
                  icon={Scale}
                  tone="cyan"
                  title="Peso corporeo"
                  hint="Trend nella finestra selezionata"
                  height={240}
                  className={hasPain ? undefined : 'lg:col-span-2'}
                  legend={<LegendChip color={C_CYAN} label="kg" />}
                >
                  <ComposedChart
                    data={weightSeries}
                    margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
                  >
                    <defs>
                      <linearGradient id="bioPeso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C_CYAN} stopOpacity={0.24} />
                        <stop offset="100%" stopColor={C_CYAN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip
                      cursor={{ stroke: C_LINE, strokeWidth: 1 }}
                      content={
                        <IronTooltip
                          render={(_n, v) =>
                            `${v.toLocaleString('it-IT', { maximumFractionDigits: 1 })} kg`
                          }
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="peso"
                      name="Peso"
                      stroke="none"
                      fill="url(#bioPeso)"
                      isAnimationActive={false}
                      legendType="none"
                      tooltipType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="peso"
                      name="Peso"
                      stroke={C_CYAN}
                      strokeWidth={2.5}
                      dot={dot(C_CYAN, 3)}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ChartCard>
              )}
            </div>
          )}
        </>
      )}

      {/* Diario grezzo: la tabella è FERRO, righe alte e cifre tabulari */}
      <Card className="rise">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-raised">
              <NotebookPen size={17} className="text-text-secondary" aria-hidden />
            </span>
            <h3 className="text-[17px] font-bold text-white">Ultimi biofeedback</h3>
          </div>
          <span className="tnum text-[12px] font-semibold text-text-tertiary">
            ultimi {recent.length} giorni registrati
          </span>
        </div>

        {/* Tabella densa da 768px in su */}
        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                <th className="py-2.5 pr-4 font-bold">Data</th>
                <th className="py-2.5 pr-4 font-bold">Sonno</th>
                <th className="py-2.5 pr-4 font-bold">Stress</th>
                <th className="py-2.5 pr-4 font-bold">Recupero</th>
                <th className="py-2.5 pr-4 text-right font-bold">Kcal</th>
                <th className="py-2.5 pr-4 text-right font-bold">Passi</th>
                <th className="py-2.5 font-bold">Note</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-raised/60"
                >
                  <td className="tnum h-12 whitespace-nowrap py-3.5 pr-4 font-semibold text-white">
                    {formatDate(e.log_date)}
                  </td>
                  <td className="tnum whitespace-nowrap py-3.5 pr-4 text-white">
                    {formatSleep(e.sleep_hours, true)}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Score value={e.stress_level} tone="amber" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <Score value={e.recovery} tone="cyan" />
                  </td>
                  <td className="tnum py-3.5 pr-4 text-right text-white">
                    {fmtInt(e.kcal_consumed)}
                  </td>
                  <td className="tnum py-3.5 pr-4 text-right text-white">{fmtInt(e.steps)}</td>
                  <td className="py-3.5 text-text-secondary">
                    {e.notes ? (
                      <span className="block max-w-[18rem] truncate" title={e.notes}>
                        {e.notes}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sotto i 768px la tabella diventa una lista di card */}
        <ul className="mt-5 space-y-2.5 md:hidden">
          {recent.map((e) => (
            <li key={e.id} className="rounded-xs bg-raised p-4">
              <div className="tnum text-[15px] font-bold text-white">{formatDate(e.log_date)}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[15px]">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Sonno
                  </dt>
                  <dd className="tnum mt-1 text-white">{formatSleep(e.sleep_hours, true)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Stress
                  </dt>
                  <dd className="mt-1">
                    <Score value={e.stress_level} tone="amber" />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Recupero
                  </dt>
                  <dd className="mt-1">
                    <Score value={e.recovery} tone="cyan" />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Kcal
                  </dt>
                  <dd className="tnum mt-1 text-white">{fmtInt(e.kcal_consumed)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Passi
                  </dt>
                  <dd className="tnum mt-1 text-white">{fmtInt(e.steps)}</dd>
                </div>
              </dl>
              {e.notes && (
                <p className="mt-3 border-t border-line pt-3 text-[14px] leading-snug text-text-secondary">
                  {e.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
