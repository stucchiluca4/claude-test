'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  History,
  LineChart,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Badge,
  Card,
  EmptyState,
  GlassBar,
  KpiCard,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from '@/components/ui';
import { formatDate, formatKg, cn } from '@/lib/utils';
import { bodyFatJP3, bodyComposition, ageFromBirthDate, JP3_SITES } from '@wc/shared';

interface Assessment {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  sum_skinfolds_mm: number | null;
  body_fat_pct: number | null;
  fat_mass_kg: number | null;
  lean_mass_kg: number | null;
}

const SKINFOLD_SITES = [
  { key: 'tricipitale', label: 'Tricipitale' },
  { key: 'sottoscapolare', label: 'Sottoscapolare' },
  { key: 'addominale', label: 'Addominale' },
  { key: 'sovrailiaca', label: 'Sovrailiaca' },
  { key: 'coscia', label: 'Coscia' },
  { key: 'pettorale', label: 'Pettorale' },
] as const;

const CIRCUMFERENCES = [
  { key: 'collo', label: 'Collo' },
  { key: 'petto', label: 'Petto' },
  { key: 'vita', label: 'Vita' },
  { key: 'fianchi', label: 'Fianchi' },
  { key: 'coscia', label: 'Coscia' },
  { key: 'bicipite_rilassato', label: 'Bicipite rilassato' },
  { key: 'bicipite_contratto', label: 'Bicipite contratto' },
  { key: 'polpaccio', label: 'Polpaccio' },
  { key: 'spalle', label: 'Spalle', optional: true },
  { key: 'avambraccio', label: 'Avambraccio', optional: true },
] as const;

type SkinfoldState = Record<string, { dx: string; sx: string }>;

/* Il ciano è il colore del corpo: tutta questa pagina parla di composizione. */
const C_CYAN = '#64D2FF';
const C_WHITE = '#FFFFFF';
const C_LINE = '#2A3241';
const C_AXIS = '#6B7688';

/* Campi in FERRO rialzato, cifre tabulari e allineamento a destra sui numeri. */
const fieldClass = cn(inputClass, 'h-[52px]');
const numberFieldClass = cn(inputClass, 'h-[52px] tnum text-right');
const labelClass = 'block text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary';
/* Griglia della plicometria: sito · destro · sinistro · media */
const skinfoldGrid = 'sm:grid-cols-[minmax(0,1fr)_112px_112px_88px]';

function emptySkinfolds(): SkinfoldState {
  return Object.fromEntries(SKINFOLD_SITES.map((s) => [s.key, { dx: '', sx: '' }]));
}

function emptyCircumferences(): Record<string, string> {
  return Object.fromEntries(CIRCUMFERENCES.map((c) => [c.key, '']));
}

/** Media dx/sx dei valori compilati per un sito (null se vuoto). */
function siteAvg(site: { dx: string; sx: string }): number | null {
  const vals = [site.dx, site.sx]
    .filter((v) => v !== '')
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function num(v: number | null | undefined): number | null {
  return v == null ? null : Number(v);
}

function dec(n: number, digits = 1): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: digits });
}

/** Blocco numerato del modulo: guida il coach passo dopo passo. */
function Step({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-[11px] font-extrabold text-text-secondary">
          {index}
        </span>
        <h4 className="text-[15px] font-bold text-white">{title}</h4>
        {hint && <span className="text-[12px] text-text-tertiary">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Riquadro risultato in ferro scuro dentro il pannello di calcolo. */
function ResultTile({
  label,
  value,
  tone = 'white',
}: {
  label: string;
  value: string;
  tone?: 'white' | 'cyan';
}) {
  return (
    <div className="rounded-xs bg-card p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
        {label}
      </div>
      <div
        className={cn(
          'font-metric tnum mt-2 whitespace-nowrap text-[24px] font-extrabold leading-none',
          tone === 'cyan' ? 'text-cyan' : 'text-white'
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Variazione rispetto alla valutazione precedente: freccia + segno + colore. */
function CellDelta({
  delta,
  unit,
  goodWhenNegative,
  align = 'right',
}: {
  delta: number | null;
  unit: string;
  goodWhenNegative: boolean;
  align?: 'right' | 'left';
}) {
  if (delta == null) return null;
  const r = round1(delta);
  if (r === 0) {
    return (
      <span
        className={cn(
          'mt-1 flex items-center gap-1 text-[12px] font-semibold text-text-tertiary',
          align === 'right' ? 'justify-end' : 'justify-start'
        )}
      >
        invariato
      </span>
    );
  }
  const good = goodWhenNegative ? r < 0 : r > 0;
  return (
    <span
      className={cn(
        'tnum mt-1 flex items-center gap-1 text-[12px] font-semibold',
        align === 'right' ? 'justify-end' : 'justify-start',
        good ? 'text-mint' : 'text-rose'
      )}
    >
      {r > 0 ? <ArrowUpRight size={12} aria-hidden /> : <ArrowDownRight size={12} aria-hidden />}
      {r > 0 ? '+' : '−'}
      {dec(Math.abs(r))} {unit}
    </span>
  );
}

/** Etichetta delta per i KPI di testa (stringa già formattata per KpiCard). */
function kpiDelta(
  cur: number | null,
  prev: number | null | undefined,
  unit: string,
  goodWhenNegative: boolean
): { delta?: string; deltaGood?: boolean } {
  if (cur == null || prev == null) return {};
  const r = round1(cur - prev);
  if (r === 0) return { delta: 'invariato vs precedente', deltaGood: true };
  const good = goodWhenNegative ? r < 0 : r > 0;
  return {
    delta: `${r > 0 ? '↑ +' : '↓ −'}${dec(Math.abs(r))} ${unit} vs precedente`,
    deltaGood: good,
  };
}

/** Barra della composizione: magra e grassa nello stesso corpo, con etichette. */
function CompositionBar({ lean, fat }: { lean: number; fat: number }) {
  const total = lean + fat;
  const leanPct = total > 0 ? (lean / total) * 100 : 0;
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-raised"
        role="img"
        aria-label={`Massa magra ${dec(lean)} chilogrammi, massa grassa ${dec(fat)} chilogrammi`}
      >
        <span className="block h-full bg-cyan" style={{ width: `${leanPct}%` }} />
        <span className="block h-full bg-cyan/25" style={{ width: `${100 - leanPct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 text-[13px] text-text-secondary">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan" aria-hidden />
          Massa magra
          <span className="tnum font-bold text-white">{formatKg(lean)}</span>
        </span>
        <span className="flex items-center gap-2 text-[13px] text-text-secondary">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan/25" aria-hidden />
          Massa grassa
          <span className="tnum font-bold text-white">{formatKg(fat)}</span>
        </span>
      </div>
    </div>
  );
}

interface TipEntry {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
}

/** Tooltip in ferro scuro: coerente con il resto del portale. */
function IronTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => p.value != null);
  if (rows.length === 0) return null;
  return (
    <div className="min-w-[168px] rounded-xs border border-line bg-raised px-3.5 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.55)]">
      <div className="tnum text-[11px] font-bold uppercase tracking-[0.06em] text-text-tertiary">
        {String(label ?? '')}
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map((p, i) => {
          const raw = Array.isArray(p.value) ? p.value[0] : p.value;
          const n = typeof raw === 'number' ? raw : Number(raw);
          const name = String(p.name ?? '');
          return (
            <div key={`${name}-${i}`} className="flex items-center gap-2.5 text-[13px]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: p.color ?? C_WHITE }}
                aria-hidden
              />
              <span className="text-text-secondary">{name}</span>
              <span className="tnum ml-auto font-bold text-white">
                {Number.isFinite(n) ? `${dec(n)} ${name === 'Peso' ? 'kg' : '%'}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AssessmentPanel({
  ccId,
  sex,
  dateOfBirth,
  assessments,
}: {
  ccId: string;
  sex: string | null;
  dateOfBirth: string | null;
  assessments: Assessment[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(assessments.length === 0);
  // Data locale (YYYY-MM-DD): con toISOString (UTC) tra mezzanotte e le 2
  // ora italiana verrebbe mostrato il giorno precedente.
  const [measuredAt, setMeasuredAt] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  });
  const [weight, setWeight] = useState('');
  const [skinfolds, setSkinfolds] = useState<SkinfoldState>(emptySkinfolds);
  const [circumferences, setCircumferences] = useState<Record<string, string>>(
    emptyCircumferences
  );
  const [stato, setStato] = useState<'digiuno' | 'post_prandiale'>('digiuno');
  const [idratazione, setIdratazione] = useState<'bassa' | 'normale' | 'alta'>('normale');
  const [faseCiclo, setFaseCiclo] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- Calcoli live -------------------------------------------------------

  const averages: Record<string, number | null> = Object.fromEntries(
    SKINFOLD_SITES.map((s) => [s.key, siteAvg(skinfolds[s.key])])
  );

  const filledAverages = Object.values(averages).filter((v): v is number => v != null);
  const sumSkinfolds =
    filledAverages.length > 0 ? round1(filledAverages.reduce((a, b) => a + b, 0)) : null;

  const validSex = sex === 'male' || sex === 'female' ? sex : null;
  const age = dateOfBirth ? ageFromBirthDate(dateOfBirth) : null;
  const jp3Sites = validSex ? JP3_SITES[validSex] : JP3_SITES.male;
  const jp3Averages = validSex ? jp3Sites.map((site) => averages[site]) : [];
  const jp3Complete = validSex && age != null && jp3Averages.every((v) => v != null);
  const jp3Filled = jp3Sites.filter((site) => averages[site] != null).length;

  const bodyFatPct = jp3Complete
    ? bodyFatJP3({
        sex: validSex!,
        age: age!,
        sum3Mm: (jp3Averages as number[]).reduce((a, b) => a + b, 0),
      })
    : null;

  const weightNum = weight !== '' && !isNaN(Number(weight)) ? Number(weight) : null;
  const composition =
    weightNum != null && weightNum > 0 && bodyFatPct != null
      ? bodyComposition(weightNum, bodyFatPct)
      : null;

  // ---- Azioni -------------------------------------------------------------

  function setSkinfold(site: string, side: 'dx' | 'sx', value: string) {
    setSkinfolds((prev) => ({ ...prev, [site]: { ...prev[site], [side]: value } }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const skinfoldsJson: Record<string, { dx?: number; sx?: number }> = {};
    for (const site of SKINFOLD_SITES) {
      const { dx, sx } = skinfolds[site.key];
      const entry: { dx?: number; sx?: number } = {};
      if (dx !== '' && !isNaN(Number(dx))) entry.dx = Number(dx);
      if (sx !== '' && !isNaN(Number(sx))) entry.sx = Number(sx);
      if (Object.keys(entry).length > 0) skinfoldsJson[site.key] = entry;
    }

    const circumferencesJson: Record<string, number> = {};
    for (const c of CIRCUMFERENCES) {
      const v = circumferences[c.key];
      if (v !== '' && !isNaN(Number(v))) circumferencesJson[c.key] = Number(v);
    }

    const supabase = createClient();
    const { error } = await supabase.from('body_assessments').insert({
      coach_client_id: ccId,
      measured_at: measuredAt,
      weight_kg: weightNum,
      skinfolds_mm: skinfoldsJson,
      circumferences_cm: circumferencesJson,
      conditions: {
        stato,
        idratazione,
        fase_ciclo: faseCiclo.trim() || null,
        note: note.trim(),
      },
      sum_skinfolds_mm: sumSkinfolds,
      body_fat_pct: bodyFatPct,
      fat_mass_kg: composition?.fatMassKg ?? null,
      lean_mass_kg: composition?.leanMassKg ?? null,
      notes: note.trim() || null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setWeight('');
    setSkinfolds(emptySkinfolds());
    setCircumferences(emptyCircumferences());
    setFaseCiclo('');
    setNote('');
    setFormOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa valutazione? L’operazione non è reversibile.')) return;
    setDeletingId(id);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from('body_assessments').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const jp3SitesLabel = jp3Sites.join(', ');

  const latest = assessments[0];
  const beforeLatest = assessments[1];

  const latestFat = num(latest?.body_fat_pct);
  const latestLean = num(latest?.lean_mass_kg);
  const latestFatMass = num(latest?.fat_mass_kg);
  const previousFat = num(beforeLatest?.body_fat_pct);
  const fatDelta =
    latestFat != null && previousFat != null ? round1(latestFat - previousFat) : null;

  // Serie storica in ordine cronologico per il grafico di andamento
  const trend = [...assessments]
    .reverse()
    .map((a) => ({
      label: formatDate(a.measured_at),
      grasso: num(a.body_fat_pct),
      peso: num(a.weight_kg),
    }));
  const hasFatTrend = trend.filter((t) => t.grasso != null).length >= 2;
  const hasWeightTrend = trend.filter((t) => t.peso != null).length >= 2;
  const showTrend = hasFatTrend || hasWeightTrend;

  return (
    <div className="space-y-5">
      {/* ---- DOMINANTE: la composizione di oggi, in un numero solo ---- */}
      {latest && (
        <>
          <Card beacon={!formOpen} className="rise">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-cyan/15">
                  <Activity size={17} className="text-cyan" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-bold leading-tight text-white">
                    Composizione attuale
                  </h3>
                  <p className="tnum mt-0.5 text-[12px] text-text-tertiary">
                    Rilevazione del {formatDate(latest.measured_at)}
                    {beforeLatest && ` · confronto con il ${formatDate(beforeLatest.measured_at)}`}
                  </p>
                </div>
              </div>
              {latestFat != null && <Badge color="cyan">Jackson-Pollock 3 pliche</Badge>}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-8">
              <div className="border-b border-line pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                <span className={labelClass}>Grasso stimato</span>
                <div className="font-metric tnum mt-3 whitespace-nowrap text-[56px] font-extrabold leading-none text-cyan">
                  {latestFat != null ? dec(latestFat) : '—'}
                  <span className="ml-1 text-[22px] font-bold text-text-tertiary">%</span>
                </div>
                {fatDelta != null ? (
                  <span
                    className={cn(
                      'tnum mt-3 flex items-center gap-1.5 text-[13px] font-semibold',
                      fatDelta === 0
                        ? 'text-text-secondary'
                        : fatDelta < 0
                          ? 'text-mint'
                          : 'text-rose'
                    )}
                  >
                    {fatDelta === 0 ? (
                      'invariato vs precedente'
                    ) : (
                      <>
                        {fatDelta < 0 ? (
                          <ArrowDownRight size={15} aria-hidden />
                        ) : (
                          <ArrowUpRight size={15} aria-hidden />
                        )}
                        {fatDelta > 0 ? '+' : '−'}
                        {dec(Math.abs(fatDelta))} punti
                        <span className="font-medium text-text-tertiary">vs precedente</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="mt-3 block text-[13px] font-semibold text-text-tertiary">
                    {latestFat != null ? 'prima rilevazione' : 'stima non disponibile'}
                  </span>
                )}
              </div>

              <div className="flex flex-col justify-center">
                {latestLean != null && latestFatMass != null ? (
                  <CompositionBar lean={latestLean} fat={latestFatMass} />
                ) : (
                  <p className="text-[15px] leading-relaxed text-text-secondary">
                    Per vedere la ripartizione tra massa magra e massa grassa servono il peso e le
                    tre pliche JP3 ({jp3SitesLabel}) nella stessa rilevazione.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* ---- I numeri di contorno ---- */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="Peso"
              value={formatKg(num(latest.weight_kg))}
              tone="cyan"
              {...kpiDelta(num(latest.weight_kg), num(beforeLatest?.weight_kg), 'kg', false)}
            />
            <KpiCard
              label="Massa magra"
              value={formatKg(latestLean)}
              tone="cyan"
              {...kpiDelta(latestLean, num(beforeLatest?.lean_mass_kg), 'kg', false)}
            />
            <KpiCard
              label="Massa grassa"
              value={formatKg(latestFatMass)}
              tone="cyan"
              {...kpiDelta(latestFatMass, num(beforeLatest?.fat_mass_kg), 'kg', true)}
            />
            <KpiCard
              label="Somma pliche"
              value={
                latest.sum_skinfolds_mm != null ? `${dec(Number(latest.sum_skinfolds_mm))} mm` : '—'
              }
              tone="cyan"
              {...kpiDelta(
                num(latest.sum_skinfolds_mm),
                num(beforeLatest?.sum_skinfolds_mm),
                'mm',
                true
              )}
            />
          </div>
        </>
      )}

      {/* ---- VETRO: la barra dei comandi galleggia sul contenuto ---- */}
      <GlassBar className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-full p-2">
        <div className="flex items-center gap-2.5 pl-3 text-[13px] font-semibold text-text-secondary">
          <ClipboardList size={16} aria-hidden />
          <span className="tnum">
            {assessments.length}{' '}
            {assessments.length === 1 ? 'valutazione in archivio' : 'valutazioni in archivio'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          aria-expanded={formOpen}
          className={formOpen ? buttonSecondary : buttonPrimary}
        >
          {formOpen ? (
            <>
              <X size={16} aria-hidden /> Chiudi il modulo
            </>
          ) : (
            <>
              <Plus size={16} aria-hidden /> Nuova valutazione
            </>
          )}
        </button>
      </GlassBar>

      {!formOpen && error && (
        <div className="flex items-start gap-2.5 rounded-md bg-rose/10 px-4 py-3.5 text-[14px] text-rose">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* ---- Modulo di rilevazione ---- */}
      {formOpen && (
        <Card className="rise">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-accent/15">
              <ClipboardList size={17} className="text-accent" aria-hidden />
            </span>
            <div>
              <h3 className="text-[17px] font-bold leading-tight text-white">Nuova valutazione</h3>
              <p className="mt-0.5 text-[12px] text-text-tertiary">
                Compila solo ciò che hai misurato: i calcoli si aggiornano mentre scrivi.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-7 space-y-8">
            <Step index={1} title="Quando e quanto pesa" hint="obbligatoria solo la data">
              <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Data</span>
                  <input
                    type="date"
                    value={measuredAt}
                    onChange={(e) => setMeasuredAt(e.target.value)}
                    className={cn(fieldClass, 'tnum mt-2 [color-scheme:dark]')}
                    required
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Peso (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={cn(numberFieldClass, 'mt-2')}
                    placeholder="72,5"
                  />
                </label>
              </div>
            </Step>

            <Step
              index={2}
              title="Pliche (mm)"
              hint={`le tre marcate JP3 alimentano la stima del grasso: ${jp3SitesLabel}`}
            >
              <div className="max-w-2xl">
                {/* Avanzamento JP3: il coach sa sempre quanto manca alla stima */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex gap-1" aria-hidden>
                    {jp3Sites.map((site) => (
                      <span
                        key={site}
                        className={cn(
                          'block h-1.5 w-8 rounded-full',
                          averages[site] != null ? 'bg-cyan' : 'bg-raised'
                        )}
                      />
                    ))}
                  </span>
                  <span className="tnum text-[12px] font-semibold text-text-secondary">
                    {jp3Filled} di 3 pliche JP3 compilate
                  </span>
                </div>

                <div
                  className={cn(
                    'hidden gap-3 pb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary sm:grid',
                    skinfoldGrid
                  )}
                >
                  <span>Sito</span>
                  <span className="text-right">Destro</span>
                  <span className="text-right">Sinistro</span>
                  <span className="text-right">Media</span>
                </div>
                <div className="space-y-2 sm:space-y-1.5">
                  {SKINFOLD_SITES.map((site) => {
                    const media = averages[site.key];
                    const isJp3 = jp3Sites.includes(site.key);
                    return (
                      <div
                        key={site.key}
                        className={cn(
                          'grid gap-2 rounded-xs bg-raised/50 p-3 sm:items-center sm:gap-3 sm:rounded-none sm:bg-transparent sm:p-0',
                          skinfoldGrid
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] text-white">{site.label}</span>
                          {isJp3 && <Badge color="cyan">JP3</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:contents">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            aria-label={`${site.label} — lato destro in millimetri`}
                            placeholder="dx"
                            value={skinfolds[site.key].dx}
                            onChange={(e) => setSkinfold(site.key, 'dx', e.target.value)}
                            className={numberFieldClass}
                          />
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            aria-label={`${site.label} — lato sinistro in millimetri`}
                            placeholder="sx"
                            value={skinfolds[site.key].sx}
                            onChange={(e) => setSkinfold(site.key, 'sx', e.target.value)}
                            className={numberFieldClass}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary sm:hidden">
                            Media
                          </span>
                          <span
                            className={cn(
                              'tnum text-[15px] font-bold',
                              media != null ? 'text-white' : 'text-text-tertiary'
                            )}
                          >
                            {media != null ? `${dec(media)} mm` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totale in coda alla colonna delle medie */}
                <div
                  className={cn(
                    'mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 sm:grid sm:items-center sm:gap-3',
                    skinfoldGrid
                  )}
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Somma pliche
                  </span>
                  <span className="hidden sm:block" aria-hidden />
                  <span className="hidden sm:block" aria-hidden />
                  <span className="tnum text-right text-[15px] font-bold text-white">
                    {sumSkinfolds != null ? `${dec(sumSkinfolds)} mm` : '—'}
                  </span>
                </div>
              </div>
            </Step>

            <Step index={3} title="Circonferenze (cm)" hint="metro a nastro, lato destro">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {CIRCUMFERENCES.map((c) => (
                  <label key={c.key} className="block">
                    <span className={labelClass}>
                      {c.label}
                      {'optional' in c && c.optional && (
                        <span className="ml-1 font-medium normal-case tracking-normal text-text-tertiary">
                          (opz.)
                        </span>
                      )}
                    </span>
                    <div className="relative mt-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        value={circumferences[c.key]}
                        onChange={(e) =>
                          setCircumferences((prev) => ({ ...prev, [c.key]: e.target.value }))
                        }
                        className={cn(numberFieldClass, 'pr-10')}
                      />
                      <span
                        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-tertiary"
                        aria-hidden
                      >
                        cm
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </Step>

            <Step index={4} title="Condizioni di misurazione" hint="rendono i confronti onesti">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className={labelClass}>Stato</span>
                  <select
                    value={stato}
                    onChange={(e) => setStato(e.target.value as typeof stato)}
                    className={cn(fieldClass, 'mt-2')}
                  >
                    <option value="digiuno">Digiuno</option>
                    <option value="post_prandiale">Post-prandiale</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Idratazione</span>
                  <select
                    value={idratazione}
                    onChange={(e) => setIdratazione(e.target.value as typeof idratazione)}
                    className={cn(fieldClass, 'mt-2')}
                  >
                    <option value="bassa">Bassa</option>
                    <option value="normale">Normale</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>
                    Fase ciclo
                    <span className="ml-1 font-medium normal-case tracking-normal text-text-tertiary">
                      (opz.)
                    </span>
                  </span>
                  <input
                    value={faseCiclo}
                    onChange={(e) => setFaseCiclo(e.target.value)}
                    className={cn(fieldClass, 'mt-2')}
                    placeholder="es. follicolare"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className={labelClass}>Note</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={cn(inputClass, 'mt-2 min-h-[88px] resize-y')}
                  placeholder="Contesto della rilevazione, sensazioni, deviazioni dal protocollo…"
                />
              </label>
            </Step>

            {/* IL FARO: l'unico elemento a fuoco mentre si compila */}
            <div className="beacon rounded-md bg-raised p-5">
              <div className="flex items-center gap-2.5">
                <Activity size={16} className="text-accent" aria-hidden />
                <h4 className="text-[15px] font-bold text-white">Risultati in tempo reale</h4>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:gap-6">
                <div className="rounded-xs bg-card p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                    Grasso stimato (JP3)
                  </div>
                  <div className="font-metric tnum mt-2 whitespace-nowrap text-[40px] font-extrabold leading-none text-cyan">
                    {bodyFatPct != null ? dec(bodyFatPct) : '—'}
                    <span className="ml-1 text-[18px] font-bold text-text-tertiary">%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  <ResultTile
                    label="Somma pliche"
                    value={sumSkinfolds != null ? `${dec(sumSkinfolds)} mm` : '—'}
                  />
                  <ResultTile
                    label="Massa grassa"
                    value={composition ? formatKg(round1(composition.fatMassKg)) : '—'}
                  />
                  <ResultTile
                    label="Massa magra"
                    value={composition ? formatKg(round1(composition.leanMassKg)) : '—'}
                    tone="cyan"
                  />
                </div>
              </div>

              {bodyFatPct == null && (
                <p className="mt-4 text-[13px] leading-snug text-text-secondary">
                  Per la stima del grasso servono le tre pliche {jp3SitesLabel} più sesso e data di
                  nascita nella scheda del cliente.
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xs bg-rose/10 px-4 py-3 text-[14px] text-rose">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving} className={buttonPrimary}>
                {saving ? 'Salvataggio…' : 'Salva valutazione'}
              </button>
              {assessments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className={buttonSecondary}
                >
                  Annulla
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* ---- Andamento nel tempo ---- */}
      {showTrend && (
        <Card className="rise">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-cyan/15">
                <LineChart size={17} className="text-cyan" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold leading-tight text-white">
                  Andamento nel tempo
                </h3>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  Ogni rilevazione registrata, dalla più vecchia alla più recente
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {hasFatTrend && (
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
                  <span className="h-[3px] w-4 rounded-full bg-cyan" aria-hidden />% grasso
                </span>
              )}
              {hasWeightTrend && (
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-text-secondary">
                  <span
                    className="h-[3px] w-4 rounded-full"
                    style={{
                      background: `repeating-linear-gradient(90deg, ${C_WHITE} 0 5px, transparent 5px 9px)`,
                    }}
                    aria-hidden
                  />
                  Peso
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
                <CartesianGrid stroke={C_LINE} strokeDasharray="2 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C_AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: C_LINE }}
                  tickMargin={8}
                  minTickGap={16}
                />
                <YAxis
                  yAxisId="grasso"
                  tick={{ fill: C_AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <YAxis
                  yAxisId="peso"
                  orientation="right"
                  tick={{ fill: C_AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip
                  cursor={{ stroke: C_LINE, strokeWidth: 1 }}
                  content={<IronTooltip />}
                />
                <Line
                  yAxisId="grasso"
                  type="monotone"
                  dataKey="grasso"
                  name="Grasso"
                  stroke={C_CYAN}
                  strokeWidth={2.5}
                  dot={{ fill: C_CYAN, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  yAxisId="peso"
                  type="monotone"
                  dataKey="peso"
                  name="Peso"
                  stroke={C_WHITE}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ fill: C_WHITE, r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ---- Storico ---- */}
      {assessments.length === 0 ? (
        <EmptyState
          emoji="📏"
          title="Nessuna valutazione registrata"
          description="Registra la prima plicometria: da lì in poi ogni rilevazione mostrerà da sola quanto è cambiata la composizione corporea del cliente."
        />
      ) : (
        <Card className="rise">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-raised">
                <History size={17} className="text-text-secondary" aria-hidden />
              </span>
              <h3 className="text-[17px] font-bold text-white">Storico valutazioni</h3>
            </div>
            {assessments.length > 1 && (
              <span className="text-[12px] font-semibold text-text-tertiary">
                ogni riga è confrontata con la rilevazione precedente
              </span>
            )}
          </div>

          {/* Tabella densa da 768px in su */}
          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  <th className="py-2.5 pr-4 font-bold">Data</th>
                  <th className="py-2.5 pr-4 text-right font-bold">Peso</th>
                  <th className="py-2.5 pr-4 text-right font-bold">Somma pliche</th>
                  <th className="py-2.5 pr-4 text-right font-bold">% grasso</th>
                  <th className="py-2.5 pr-4 text-right font-bold">Massa grassa</th>
                  <th className="py-2.5 pr-4 text-right font-bold">Massa magra</th>
                  <th className="w-12 py-2.5 font-bold">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => {
                  const prev = assessments[i + 1];
                  const d = (
                    curr: number | null,
                    old: number | null | undefined
                  ): number | null => (curr != null && old != null ? curr - old : null);
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-line/60 align-top transition-colors last:border-0 hover:bg-raised/50"
                    >
                      <td className="tnum h-14 whitespace-nowrap py-4 pr-4 font-semibold text-white">
                        {formatDate(a.measured_at)}
                        {i === 0 && (
                          <span className="ml-2 align-middle">
                            <Badge color="cyan">Ultima</Badge>
                          </span>
                        )}
                      </td>
                      <td className="tnum py-4 pr-4 text-right text-white">
                        {formatKg(num(a.weight_kg))}
                        <CellDelta
                          delta={d(num(a.weight_kg), num(prev?.weight_kg))}
                          unit="kg"
                          goodWhenNegative={false}
                        />
                      </td>
                      <td className="tnum py-4 pr-4 text-right text-white">
                        {a.sum_skinfolds_mm != null ? `${dec(Number(a.sum_skinfolds_mm))} mm` : '—'}
                        <CellDelta
                          delta={d(num(a.sum_skinfolds_mm), num(prev?.sum_skinfolds_mm))}
                          unit="mm"
                          goodWhenNegative
                        />
                      </td>
                      <td className="tnum py-4 pr-4 text-right text-white">
                        {a.body_fat_pct != null ? `${dec(Number(a.body_fat_pct))} %` : '—'}
                        <CellDelta
                          delta={d(num(a.body_fat_pct), num(prev?.body_fat_pct))}
                          unit="%"
                          goodWhenNegative
                        />
                      </td>
                      <td className="tnum py-4 pr-4 text-right text-white">
                        {formatKg(num(a.fat_mass_kg))}
                        <CellDelta
                          delta={d(num(a.fat_mass_kg), num(prev?.fat_mass_kg))}
                          unit="kg"
                          goodWhenNegative
                        />
                      </td>
                      <td className="tnum py-4 pr-4 text-right text-white">
                        {formatKg(num(a.lean_mass_kg))}
                        <CellDelta
                          delta={d(num(a.lean_mass_kg), num(prev?.lean_mass_kg))}
                          unit="kg"
                          goodWhenNegative={false}
                        />
                      </td>
                      <td className="py-3 align-middle">
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          aria-label={`Elimina la valutazione del ${formatDate(a.measured_at)}`}
                          title="Elimina valutazione"
                          className="press grid h-11 w-11 place-items-center rounded-full text-text-tertiary transition hover:bg-rose/12 hover:text-rose disabled:opacity-45"
                        >
                          <Trash2 size={17} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sotto i 768px la tabella diventa una lista di card */}
          <ul className="mt-5 space-y-3 md:hidden">
            {assessments.map((a, i) => {
              const prev = assessments[i + 1];
              const d = (curr: number | null, old: number | null | undefined): number | null =>
                curr != null && old != null ? curr - old : null;
              return (
                <li key={a.id} className="rounded-xs bg-raised p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="tnum text-[15px] font-bold text-white">
                        {formatDate(a.measured_at)}
                      </span>
                      {i === 0 && <Badge color="cyan">Ultima</Badge>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      aria-label={`Elimina la valutazione del ${formatDate(a.measured_at)}`}
                      className="press grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-tertiary transition hover:bg-rose/12 hover:text-rose disabled:opacity-45"
                    >
                      <Trash2 size={17} aria-hidden />
                    </button>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <dt className={labelClass}>Peso</dt>
                      <dd className="tnum mt-1 text-[15px] text-white">
                        {formatKg(num(a.weight_kg))}
                        <CellDelta
                          delta={d(num(a.weight_kg), num(prev?.weight_kg))}
                          unit="kg"
                          goodWhenNegative={false}
                          align="left"
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className={labelClass}>Somma pliche</dt>
                      <dd className="tnum mt-1 text-[15px] text-white">
                        {a.sum_skinfolds_mm != null
                          ? `${dec(Number(a.sum_skinfolds_mm))} mm`
                          : '—'}
                        <CellDelta
                          delta={d(num(a.sum_skinfolds_mm), num(prev?.sum_skinfolds_mm))}
                          unit="mm"
                          goodWhenNegative
                          align="left"
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className={labelClass}>% grasso</dt>
                      <dd className="tnum mt-1 text-[15px] text-white">
                        {a.body_fat_pct != null ? `${dec(Number(a.body_fat_pct))} %` : '—'}
                        <CellDelta
                          delta={d(num(a.body_fat_pct), num(prev?.body_fat_pct))}
                          unit="%"
                          goodWhenNegative
                          align="left"
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className={labelClass}>Massa magra</dt>
                      <dd className="tnum mt-1 text-[15px] text-white">
                        {formatKg(num(a.lean_mass_kg))}
                        <CellDelta
                          delta={d(num(a.lean_mass_kg), num(prev?.lean_mass_kg))}
                          unit="kg"
                          goodWhenNegative={false}
                          align="left"
                        />
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
