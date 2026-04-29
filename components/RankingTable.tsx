'use client';

import Link from 'next/link';
import type { RankingMC } from '@/app/RankingPage';

type Mode = 'current' | 'peak' | 'era';

type Props = {
  mcs: RankingMC[];
  mode: Mode;
};

function getRating(mc: RankingMC, mode: Mode): number {
  if (mode === 'era') return mc.era_rating ?? 0;
  if (mode === 'peak') return mc.peak_rating;
  return mc.current_rating;
}

function getWinRate(mc: RankingMC, mode: Mode): string {
  const battles = mode === 'era' ? (mc.era_battles ?? 0) : mc.battle_count;
  const wins = mode === 'era' ? (mc.era_wins ?? 0) : mc.win_count;
  return battles > 0 ? `${Math.round((wins / battles) * 100)}%` : '—';
}

function getBattleCount(mc: RankingMC, mode: Mode): number {
  return mode === 'era' ? (mc.era_battles ?? 0) : mc.battle_count;
}

export default function RankingTable({ mcs, mode }: Props) {
  const ratingLabel = mode === 'era' ? '年間ピーク' : mode === 'peak' ? '最高レート' : 'レート';
  const ratingColor = mode === 'peak' ? 'text-blue-400' : 'text-yellow-400';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-left">
            <th className="pb-3 pr-4 w-12">順位</th>
            <th className="pb-3 pr-4">MC名</th>
            <th className="pb-3 pr-4 text-right">{ratingLabel}</th>
            <th className="pb-3 pr-4 text-right hidden sm:table-cell">勝率</th>
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
              <td className="py-3 pr-4 text-gray-500 font-mono">{i + 1}</td>
              <td className="py-3 pr-4">
                <Link
                  href={`/mc/${mc.id}`}
                  className="font-semibold hover:text-yellow-400 transition-colors"
                >
                  {mc.name}
                </Link>
              </td>
              <td className={`py-3 pr-4 text-right font-mono font-bold ${ratingColor}`}>
                {Math.round(getRating(mc, mode))}
              </td>
              <td className="py-3 pr-4 text-right hidden sm:table-cell text-gray-300">
                {getWinRate(mc, mode)}
              </td>
              <td className="py-3 text-right text-gray-400 hidden sm:table-cell">
                {getBattleCount(mc, mode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
