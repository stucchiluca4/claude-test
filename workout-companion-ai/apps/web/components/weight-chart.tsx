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
          <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} />
          <YAxis
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            domain={['dataMin - 1', 'dataMax + 1']}
          />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #1F2937',
              borderRadius: 8,
              color: '#F9FAFB',
            }}
            formatter={(value: number) => [`${value} kg`, 'Peso']}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#2563EB"
            strokeWidth={2}
            dot={{ fill: '#2563EB', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
