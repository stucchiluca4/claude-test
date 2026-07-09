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
  Legend,
} from 'recharts';
import { Card } from '@/components/ui';
import { weeklyAverage, carbFatRatio } from '@wc/shared';

interface DayRow {
  week_number: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const AXIS = { stroke: '#9CA3AF', fontSize: 12, tickLine: false } as const;
const TOOLTIP_STYLE = {
  background: '#111827',
  border: '1px solid #1F2937',
  borderRadius: 8,
  color: '#F9FAFB',
} as const;

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
    { name: 'Proteine', kcal: avgProtein * 4, grams: avgProtein, color: '#22C55E' },
    { name: 'Carboidrati', kcal: avgCarbs * 4, grams: avgCarbs, color: '#F97316' },
    { name: 'Grassi', kcal: avgFat * 9, grams: avgFat, color: '#EAB308' },
  ];
  const donutTotal = donut.reduce((a, d) => a + d.kcal, 0) || 1;
  const surplus = tdeeKcal != null ? avgKcal - tdeeKcal : null;

  return (
    <Card className="mt-4">
      <h3 className="font-semibold mb-1">Panoramica piano</h3>
      <p className="text-sm text-text-secondary mb-5">
        Andamento di calorie e macronutrienti lungo le {weeks.length} settimane.
      </p>

      {surplus != null && (
        <div className="flex flex-wrap gap-6 mb-5 text-sm">
          <span className="text-text-secondary">
            TDEE: <b className="text-text-primary">{tdeeKcal} kcal</b>
          </span>
          <span className="text-text-secondary">
            Media piano: <b className="text-text-primary">{avgKcal} kcal</b>
          </span>
          <span className="text-text-secondary">
            {surplus >= 0 ? 'Surplus' : 'Deficit'} giornaliero medio:{' '}
            <b className={surplus >= 0 ? 'text-success' : 'text-warning'}>
              {surplus > 0 ? '+' : ''}
              {surplus} kcal
            </b>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calorie nel tempo */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-text-secondary">Calorie nel tempo</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
                <XAxis dataKey="settimana" {...AXIS} />
                <YAxis {...AXIS} domain={['dataMin - 200', 'dataMax + 200']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                {(targetKcal ?? tdeeKcal) != null && (
                  <ReferenceLine
                    y={(targetKcal ?? tdeeKcal)!}
                    stroke="#9CA3AF"
                    strokeDasharray="6 4"
                    label={{
                      value: targetKcal != null ? 'TEE' : 'TDEE',
                      fill: '#9CA3AF',
                      fontSize: 11,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="kcal"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ fill: '#2563EB', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Macro nel tempo */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-text-secondary">
            Macronutrienti nel tempo (g)
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
                <XAxis dataKey="settimana" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="carboidrati" stroke="#F97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="proteine" stroke="#22C55E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="grassi" stroke="#EAB308" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuzione media macro */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="kcal"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  strokeWidth={0}
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
          </div>
          <div>
            <h4 className="text-sm font-medium mb-3 text-text-secondary">
              Distribuzione media macro · {avgKcal.toLocaleString('it-IT')} kcal
            </h4>
            <ul className="space-y-2.5 text-sm">
              {donut.map((d) => (
                <li key={d.name} className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                  {d.name}
                  <span className="ml-auto tabular-nums">
                    {d.grams} g ({Math.round((d.kcal / donutTotal) * 100)}%)
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-2.5 pt-2 border-t border-border text-text-secondary">
                C:G Ratio medio
                <span className="ml-auto tabular-nums">{carbFatRatio(avgCarbs, avgFat)} : 1</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
