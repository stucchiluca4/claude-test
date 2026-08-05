'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { weeklyAverage, carbFatRatio } from '@wc/shared';

interface DayRow {
  week_number: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/* I grafici vivono su FERRO: assi e griglia usano i token del sistema. */
const AXIS = { stroke: '#6B7688', fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = '#2A3241';
const TOOLTIP_STYLE = {
  background: '#1E2531',
  border: '1px solid #2A3241',
  borderRadius: 14,
  color: '#FFFFFF',
  fontSize: 13,
  padding: '10px 12px',
} as const;

/* Il segnale di ogni macro è lo stesso in tutto il prodotto. */
const MACRO_SERIES = [
  { key: 'proteine', label: 'Proteine', color: '#0A84FF', text: 'text-accent', dash: undefined },
  { key: 'carboidrati', label: 'Carboidrati', color: '#FF9F0A', text: 'text-amber', dash: '7 4' },
  { key: 'grassi', label: 'Grassi', color: '#64D2FF', text: 'text-cyan', dash: '2 5' },
] as const;

const columnLabel = 'text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';

/**
 * Panoramica del piano: andamento di calorie e macro settimana per
 * settimana + distribuzione media dei macronutrienti.
 */
export function PlanOverview({
  days,
  tdeeKcal,
  targetKcal,
}: {
  days: DayRow[];
  tdeeKcal: number | null;
  targetKcal: number | null;
}) {
  const weeks = Array.from(new Set(days.map((d) => d.week_number))).sort((a, b) => a - b);
  if (weeks.length < 2) return null; // con una sola settimana i grafici non dicono nulla

  const series = weeks.map((w) => {
    const wd = days.filter((d) => d.week_number === w);
    return {
      settimana: `Sett. ${w}`,
      kcal: weeklyAverage(wd.map((d) => d.kcal)),
      carboidrati: weeklyAverage(wd.map((d) => d.carbs_g)),
      proteine: weeklyAverage(wd.map((d) => d.protein_g)),
      grassi: weeklyAverage(wd.map((d) => d.fat_g)),
    };
  });

  const avgProtein = weeklyAverage(series.map((s) => s.proteine));
  const avgCarbs = weeklyAverage(series.map((s) => s.carboidrati));
  const avgFat = weeklyAverage(series.map((s) => s.grassi));
  const avgKcal = weeklyAverage(series.map((s) => s.kcal));

  const donut = [
    { name: 'Proteine', kcal: avgProtein * 4, grams: avgProtein, color: '#0A84FF', text: 'text-accent' },
    { name: 'Carboidrati', kcal: avgCarbs * 4, grams: avgCarbs, color: '#FF9F0A', text: 'text-amber' },
    { name: 'Grassi', kcal: avgFat * 9, grams: avgFat, color: '#64D2FF', text: 'text-cyan' },
  ];
  const donutTotal = donut.reduce((a, d) => a + d.kcal, 0) || 1;
  const surplus = tdeeKcal != null ? avgKcal - tdeeKcal : null;
  const reference = targetKcal ?? tdeeKcal;

  return (
    <Card className="rise">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <TrendingUp size={19} className="shrink-0 text-text-secondary" aria-hidden />
            <h2 className="text-[17px] font-bold text-white">Panoramica del piano</h2>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            Come si muovono calorie e macronutrienti lungo le {weeks.length} settimane.
          </p>
        </div>
        <span className="tnum shrink-0 rounded-full bg-raised px-3 py-1.5 text-[13px] font-bold text-white">
          {weeks.length} settimane
        </span>
      </div>

      {/* I tre numeri che riassumono il piano */}
      {surplus != null && (
        <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryTile label="Dispendio stimato" value={tdeeKcal!.toLocaleString('it-IT')} unit="kcal" />
          <SummaryTile label="Media del piano" value={avgKcal.toLocaleString('it-IT')} unit="kcal" />
          <SummaryTile
            label={surplus >= 0 ? 'Surplus giornaliero' : 'Deficit giornaliero'}
            value={`${surplus > 0 ? '+' : ''}${surplus.toLocaleString('it-IT')}`}
            unit="kcal"
          />
        </dl>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---- Calorie nel tempo ---- */}
        <section aria-label="Andamento delle calorie">
          <h3 className={columnLabel}>Calorie settimana per settimana</h3>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: -14 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="settimana" {...AXIS} />
                <YAxis {...AXIS} width={52} domain={['dataMin - 200', 'dataMax + 200']} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ stroke: GRID }}
                  formatter={(value: number) => [`${Math.round(value)} kcal`, 'Media giornaliera']}
                />
                {reference != null && (
                  <ReferenceLine
                    y={reference}
                    stroke="#6B7688"
                    strokeDasharray="6 4"
                    label={{
                      value: targetKcal != null ? 'TEE' : 'DEE',
                      fill: '#9BA6B8',
                      fontSize: 11,
                      fontWeight: 700,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="kcal"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  dot={{ fill: '#151A24', stroke: '#FFFFFF', strokeWidth: 2, r: 3.5 }}
                  activeDot={{ fill: '#FFFFFF', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[13px] text-text-secondary">
            La linea tratteggiata è il fabbisogno di riferimento del piano.
          </p>
        </section>

        {/* ---- Macro nel tempo ---- */}
        <section aria-label="Andamento dei macronutrienti">
          <h3 className={columnLabel}>Macronutrienti nel tempo (g)</h3>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: -14 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="settimana" {...AXIS} />
                <YAxis {...AXIS} width={52} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ stroke: GRID }}
                  formatter={(value: number, name: string) => [`${Math.round(value)} g`, name]}
                />
                {MACRO_SERIES.map((m) => (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    name={m.label}
                    stroke={m.color}
                    strokeWidth={2.5}
                    strokeDasharray={m.dash}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Legenda su ferro: colore + tratto, così non è il solo colore a parlare */}
          <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {MACRO_SERIES.map((m) => (
              <li key={m.key} className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
                <svg width="22" height="8" aria-hidden className="shrink-0">
                  <line
                    x1="0"
                    y1="4"
                    x2="22"
                    y2="4"
                    stroke={m.color}
                    strokeWidth="2.5"
                    strokeDasharray={m.dash}
                  />
                </svg>
                {m.label}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Distribuzione media dei macro ---- */}
        <section
          aria-label="Distribuzione media dei macronutrienti"
          className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 lg:col-span-2"
        >
          <div className="relative h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="kcal"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="#151A24"
                  strokeWidth={3}
                >
                  {donut.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [
                    `${Math.round(value)} kcal (${Math.round((value / donutTotal) * 100)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Il totale sta al centro dell'anello: è il numero che si cerca */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-metric tnum text-[30px] font-extrabold leading-none text-white">
                  {avgKcal.toLocaleString('it-IT')}
                </div>
                <div className={cn(columnLabel, 'mt-1')}>kcal medie</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className={columnLabel}>Distribuzione media</h3>
            <ul className="mt-3 divide-y divide-line/50">
              {donut.map((d) => (
                <li key={d.name} className="flex items-baseline justify-between gap-3 py-3 first:pt-0">
                  <span className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: d.color }}
                      aria-hidden
                    />
                    {d.name}
                  </span>
                  <span className="tnum shrink-0 text-[15px] font-bold text-white">
                    {d.grams} g{' '}
                    <span className={cn('font-semibold', d.text)}>
                      · {Math.round((d.kcal / donutTotal) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 py-3">
                <span className="text-[15px] text-text-secondary">C : G ratio medio</span>
                <span className="tnum shrink-0 text-[15px] font-semibold text-white">
                  {carbFatRatio(avgCarbs, avgFat) ?? '—'} : 1
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </Card>
  );
}

/** Tassello di sintesi su rilievo: etichetta piccola, numero grande. */
function SummaryTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-md bg-raised px-4 py-3.5">
      <dt className={columnLabel}>{label}</dt>
      <dd className="font-metric tnum mt-1.5 text-[26px] font-extrabold leading-none text-white">
        {value}
        <span className="ml-1.5 text-[13px] font-semibold text-text-secondary">{unit}</span>
      </dd>
    </div>
  );
}
