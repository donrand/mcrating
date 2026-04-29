'use client';

import { useRouter } from 'next/navigation';

type Props = {
  mcId: string;
  currentYear: string | null;
  years: string[];
};

export default function YearSelect({ mcId, currentYear, years }: Props) {
  const router = useRouter();
  return (
    <select
      value={currentYear ?? ''}
      onChange={e => {
        const val = e.target.value;
        router.push(val ? `/mc/${mcId}?year=${val}` : `/mc/${mcId}`);
      }}
      className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:border-yellow-400"
    >
      <option value="">全期間</option>
      {years.map(y => (
        <option key={y} value={y}>{y}年</option>
      ))}
    </select>
  );
}
