'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';

/** Ciano = corpo: peso, sonno, recupero. Il colore non è decorativo. */
const BODY = '#64D2FF';
const LINE = '#2A3241';
const TICK = '#6B7688';

function formatKg(value: number) {
  return value.toLocaleString('it-IT', { maximumFractionDigits: 1 });
}

/** Tooltip su FERRO opaco: la lettura non passa mai dal vetro. */
function WeightTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (typeof value !== 'number') return null;

  return (
    <div className="rounded-sm border border-line bg-card px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
        {String(label ?? '')}
      </div>
      <div className="mt-1 font-metric text-[22px] font-extrabold leading-none tnum text-white">
        {formatKg(value)}
        <span className="ml-1 text-[13px] font-bold text-text-secondary">kg</span>
      </div>
    </div>
  );
}

/** Grafico andamento del peso corporeo: contenuto, quindi ferro e mai sfocato. */
export function WeightChart({ data }: { data: { date: string; peso: number }[] }) {
  // Il movimento rispetta la preferenza di sistema: chi chiede meno moto, non lo riceve.
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setAnimate(false);
    }
  }, []);

  if (data.length === 0) return null;

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -14 }}>
          <defs>
            <linearGradient id="weight-body-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BODY} stopOpacity={0.26} />
              <stop offset="100%" stopColor={BODY} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke={LINE} strokeDasharray="4 4" />

          <XAxis
            dataKey="date"
            tick={{ fill: TICK, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: LINE }}
            tickMargin={10}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: TICK, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickMargin={6}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(v: number) => formatKg(v)}
          />

          <Tooltip<number, string>
            content={<WeightTooltip />}
            cursor={{ stroke: BODY, strokeOpacity: 0.35, strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          <Area
            type="monotone"
            dataKey="peso"
            stroke={BODY}
            strokeWidth={2.5}
            fill="url(#weight-body-fill)"
            dot={false}
            activeDot={{ r: 5, fill: BODY, stroke: '#0C1017', strokeWidth: 3 }}
            isAnimationActive={animate}
            animationDuration={700}
            animationEasing="ease-out"
          />

          {/* Punti solo agli estremi: da dove parte e dove è arrivato il corpo */}
          <ReferenceDot
            x={first.date}
            y={first.peso}
            r={3}
            fill="#151A24"
            stroke={BODY}
            strokeWidth={2}
            isFront
          />
          <ReferenceDot
            x={last.date}
            y={last.peso}
            r={4}
            fill={BODY}
            stroke="#0C1017"
            strokeWidth={2}
            isFront
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
