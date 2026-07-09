'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, EmptyState, buttonSecondary } from '@/components/ui';
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

const GRID = '#1F2937';
const AXIS = '#9CA3AF';
const tooltipStyle = {
  background: '#111827',
  border: '1px solid #1F2937',
  borderRadius: 8,
  color: '#F9FAFB',
} as const;

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

/** Tile KPI con sottotitolo e delta vs finestra precedente. */
function Kpi({
  label,
  value,
  sub,
  deltaPct,
  downIsGood = false,
  goodOverride,
}: {
  label: string;
  value: string;
  sub?: string;
  deltaPct: number | null;
  downIsGood?: boolean;
  goodOverride?: boolean;
}) {
  const rounded = deltaPct == null ? null : Math.round(deltaPct);
  return (
    <Card>
      <div className="text-sm text-text-secondary">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-1 tabular-nums">{sub}</div>}
      {rounded != null &&
        (rounded === 0 ? (
          <div className="text-xs mt-1 text-text-secondary tabular-nums">= stabile</div>
        ) : (
          <div
            className={cn(
              'text-xs mt-1 tabular-nums',
              (goodOverride ?? (downIsGood ? rounded < 0 : rounded > 0))
                ? 'text-success'
                : 'text-danger'
            )}
          >
            {rounded > 0 ? '↑' : '↓'} {Math.abs(rounded)}% vs periodo prec.
          </div>
        ))}
    </Card>
  );
}

type InsightColor = 'success' | 'warning' | 'danger' | 'accent';
const DOT_COLOR: Record<InsightColor, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  accent: 'bg-accent',
};

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
        description="Il cliente registra ogni giorno sonno, stress, energia, alimentazione e passi dall'app mobile. Appena arriveranno i primi dati li vedrai qui."
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
  const insights: { color: InsightColor; text: string }[] = [];
  const dSleepQ = pctDelta(curSleepQ, prevSleepQ);
  if (dSleepQ != null && dSleepQ >= 5) {
    insights.push({
      color: 'success',
      text: `Qualità del sonno in miglioramento (+${Math.round(dSleepQ)}% rispetto al periodo precedente).`,
    });
  } else if (dSleepQ != null && dSleepQ <= -5) {
    insights.push({
      color: 'warning',
      text: `Qualità del sonno in peggioramento (${Math.round(dSleepQ)}%): indaga su routine serale e recupero.`,
    });
  }
  const dStress = pctDelta(curStress, prevStress);
  if (dStress != null && dStress >= 5) {
    insights.push({
      color: 'warning',
      text: `Stress medio in aumento (+${Math.round(dStress)}%): valuta di ridurre il carico di allenamento.`,
    });
  } else if (dStress != null && dStress <= -5) {
    insights.push({
      color: 'success',
      text: `Stress medio in calo (${Math.round(dStress)}%): buona gestione del carico.`,
    });
  }
  if (kcalTarget != null && kcalTarget > 0 && curKcal != null) {
    const adherence = Math.round((curKcal / kcalTarget) * 100);
    if (Math.abs(adherence - 100) <= 5) {
      insights.push({
        color: 'success',
        text: `Ottima aderenza calorica: introito medio al ${adherence}% del target.`,
      });
    } else if (adherence > 105) {
      insights.push({
        color: 'warning',
        text: `Introito calorico sopra il target (${adherence}%): rivedi porzioni o extra fuori piano.`,
      });
    } else {
      insights.push({
        color: 'warning',
        text: `Introito calorico sotto il target (${adherence}%): verifica che il piano sia sostenibile.`,
      });
    }
  }
  if (curSteps != null) {
    if (curSteps >= 10_000) {
      insights.push({
        color: 'success',
        text: `Media passi sopra 10.000 (${fmtInt(curSteps)}): ottimo livello di attività quotidiana.`,
      });
    } else {
      insights.push({
        color: 'accent',
        text: `Media passi sotto 10.000 (${fmtInt(curSteps)}): incoraggia più movimento quotidiano.`,
      });
    }
  }
  if (curRecovery != null && curRecovery < 5) {
    insights.push({
      color: 'danger',
      text: `Recupero medio basso (${fmt1(curRecovery)}/10): valuta una settimana di scarico (deload).`,
    });
  }

  const weightSeries = chartData.filter((d) => d.peso != null);
  const recent = entries.slice(-7).reverse();

  const smallBars = [
    { key: 'stress', title: 'Stress giornaliero', color: '#F97316', domain10: true },
    { key: 'energia', title: 'Energia', color: '#22C55E', domain10: true },
    { key: 'recupero', title: 'Recupero', color: '#2563EB', domain10: true },
    { key: 'passi', title: 'Passi giornalieri', color: '#3B82F6', domain10: false },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Selettore finestra temporale */}
      <div className="flex gap-2">
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setDays(w)}
            className={cn(
              buttonSecondary,
              days === w && 'border-accent bg-accent/10 text-accent font-semibold'
            )}
          >
            {w} giorni
          </button>
        ))}
      </div>

      {current.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">
            Nessun biofeedback negli ultimi {days} giorni. Prova ad allargare la finestra
            temporale.
          </p>
        </Card>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Kpi
              label="Sonno medio"
              value={formatSleep(curSleepH)}
              sub={curSleepQ != null ? `Qualità: ${fmt1(curSleepQ)}/10` : undefined}
              deltaPct={pctDelta(curSleepH, prevSleepH)}
            />
            <Kpi
              label="Stress medio"
              value={curStress != null ? `${fmt1(curStress)}/10` : '—'}
              deltaPct={dStress}
              downIsGood
            />
            <Kpi
              label="Kcal medie"
              value={fmtInt(curKcal)}
              sub={
                kcalTarget != null && kcalTarget > 0 && curKcal != null
                  ? `${Math.round((curKcal / kcalTarget) * 100)}% del target`
                  : undefined
              }
              deltaPct={dKcal}
              goodOverride={kcalGood}
            />
            <Kpi label="Passi medi" value={fmtInt(curSteps)} deltaPct={pctDelta(curSteps, prevSteps)} />
            <Kpi
              label="Recupero medio"
              value={curRecovery != null ? `${fmt1(curRecovery)}/10` : '—'}
              deltaPct={pctDelta(curRecovery, prevRecovery)}
            />
            <Kpi
              label="Energia media"
              value={curEnergy != null ? `${fmt1(curEnergy)}/10` : '—'}
              deltaPct={pctDelta(curEnergy, prevEnergy)}
            />
          </div>

          {/* Grafici principali */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold mb-4">Andamento sonno</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} minTickGap={16} />
                    <YAxis yAxisId="ore" stroke={AXIS} fontSize={12} tickLine={false} />
                    <YAxis
                      yAxisId="qualita"
                      orientation="right"
                      domain={[0, 10]}
                      stroke={AXIS}
                      fontSize={12}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: '#1F2937', opacity: 0.4 }}
                      formatter={(value: number, name: string) =>
                        name === 'Ore di sonno' ? [formatSleep(value), name] : [`${value}/10`, name]
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      yAxisId="ore"
                      dataKey="ore"
                      name="Ore di sonno"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                    />
                    <Line
                      yAxisId="qualita"
                      type="monotone"
                      dataKey="qualita"
                      name="Qualità"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ fill: '#22C55E', r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold mb-4">Introito calorico</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} minTickGap={16} />
                    <YAxis stroke={AXIS} fontSize={12} tickLine={false} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${fmtInt(value)} kcal`, 'Kcal']}
                    />
                    {kcalTarget != null && (
                      <ReferenceLine
                        y={kcalTarget}
                        stroke="#9CA3AF"
                        strokeDasharray="6 4"
                        ifOverflow="extendDomain"
                        label={{ value: 'Target', fill: '#9CA3AF', fontSize: 11, position: 'insideTopRight' }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="kcal"
                      name="Kcal"
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={{ fill: '#F97316', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold mb-4">Macronutrienti</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} minTickGap={16} />
                    <YAxis stroke={AXIS} fontSize={12} tickLine={false} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [`${fmtInt(value)} g`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="carboidrati"
                      name="Carboidrati"
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={{ fill: '#F97316', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="proteine"
                      name="Proteine"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ fill: '#22C55E', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="grassi"
                      name="Grassi"
                      stroke="#EAB308"
                      strokeWidth={2}
                      dot={{ fill: '#EAB308', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {weightSeries.length >= 2 && (
              <Card>
                <h3 className="font-semibold mb-4">Trend peso corporeo</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightSeries} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} minTickGap={16} />
                      <YAxis
                        stroke={AXIS}
                        fontSize={12}
                        tickLine={false}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${value} kg`, 'Peso']}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        name="Peso"
                        stroke="#2563EB"
                        strokeWidth={2}
                        dot={{ fill: '#2563EB', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* Grafici a barre piccoli */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {smallBars.map((cfg) => (
              <Card key={cfg.key}>
                <h3 className="font-semibold mb-4">{cfg.title}</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} minTickGap={16} />
                      <YAxis
                        stroke={AXIS}
                        fontSize={11}
                        tickLine={false}
                        domain={cfg.domain10 ? [0, 10] : [0, 'auto']}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: '#1F2937', opacity: 0.4 }}
                        formatter={(value: number) => [
                          cfg.domain10 ? `${value}/10` : fmtInt(value),
                          cfg.title,
                        ]}
                      />
                      <Bar dataKey={cfg.key} fill={cfg.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>

          {/* Insights automatici */}
          <Card>
            <h3 className="font-semibold mb-4">Insights automatici</h3>
            {insights.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nessun insight particolare per questo periodo: i valori sono stabili. Continua
                così! 👍
              </p>
            ) : (
              <ul className="space-y-2.5">
                {insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', DOT_COLOR[ins.color])} />
                    <span>{ins.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* Ultimi biofeedback */}
      <Card>
        <h3 className="font-semibold mb-4">Ultimi biofeedback</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">😴 Sonno</th>
                <th className="py-2 pr-4 font-medium">⚡ Stress</th>
                <th className="py-2 pr-4 font-medium">🔥 Kcal</th>
                <th className="py-2 pr-4 font-medium">👣 Passi</th>
                <th className="py-2 pr-4 font-medium">💪 Recupero</th>
                <th className="py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                    {formatDate(e.log_date)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{formatSleep(e.sleep_hours, true)}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {e.stress_level != null ? `${e.stress_level}/10` : '—'}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{fmtInt(e.kcal_consumed)}</td>
                  <td className="py-2 pr-4 tabular-nums">{fmtInt(e.steps)}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {e.recovery != null ? `${e.recovery}/10` : '—'}
                  </td>
                  <td className="py-2 text-text-secondary">
                    {e.notes ? (
                      <span className="block max-w-[16rem] truncate" title={e.notes}>
                        {e.notes}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
