'use client';

import Link from 'next/link';
import type { MC } from '@/lib/supabase';

type Props = {
  mcs: MC[];
};

export default function RankingTable({ mcs }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-left">
            <th className="pb-3 pr-4 w-12">順位</th>
            <th className="pb-3 pr-4">MC名</th>
            <th className="pb-3 pr-4 text-right">レート</th>
            <th className="pb-3 pr-4 text-right hidden sm:table-cell">変動</th>
            <th className="pb-3 text-right hidden sm:table-cell">試合数</th>
          </tr>
        </thead>
        <tbody>
          {mcs.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-gray-600">
                データがありません
              </td>
            </tr>
          )}
          {mcs.map((mc, i) => (
            <tr
              key={mc.id}
              className="border-b border-gray-900 hover:bg-gray-900 transition-colors"
            >
              <td className="py-3 pr-4 text-gray-500 font-mono">
                {i + 1}
              </td>
              <td className="py-3 pr-4">
                <Link
                  href={`/mc/${mc.id}`}
                  className="font-semibold hover:text-yellow-400 transition-colors"
                >
                  {mc.name}
                </Link>
              </td>
              <td className="py-3 pr-4 text-right font-mono font-bold text-yellow-400">
                {Math.round(mc.current_rating)}
              </td>
              <td className="py-3 pr-4 text-right hidden sm:table-cell">
                —
              </td>
              <td className="py-3 text-right text-gray-400 hidden sm:table-cell">
                {mc.battle_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
