'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

/** Grafico andamento peso (dark mode). */
export function WeightChart({ data }: { data: { date: string; peso: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#22314F" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#8FA3C0" fontSize={12} tickLine={false} />
          <YAxis
            stroke="#8FA3C0"
            fontSize={12}
            tickLine={false}
            domain={['dataMin - 1', 'dataMax + 1']}
          />
          <Tooltip
            contentStyle={{
              background: '#0D1626',
              border: '1px solid #22314F',
              borderRadius: 8,
              color: '#FFFFFF',
            }}
            formatter={(value: number) => [`${value} kg`, 'Peso']}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#38BDF8"
            strokeWidth={2}
            dot={{ fill: '#38BDF8', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
