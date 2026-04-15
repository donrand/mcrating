'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = {
  date: string;
  rating: number;
  opponent: string;
};

type Props = {
  data: DataPoint[];
};

export default function RatingChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        試合データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          width={50}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: '#facc15' }}
          formatter={(value) => [typeof value === 'number' ? Math.round(value) : value, 'レート']}
        />
        <Line
          type="monotone"
          dataKey="rating"
          stroke="#facc15"
          strokeWidth={2}
          dot={{ fill: '#facc15', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
