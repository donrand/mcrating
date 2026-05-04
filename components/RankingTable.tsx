'use client';

import Link from 'next/link';
import type { RankingMC } from '@/app/RankingPage';

export type SortKey = 'rating' | 'win_rate' | 'battles';

type Mode = 'current' | 'peak' | 'era' | 'era_gain';

type Props = {
  mcs: RankingMC[];
  mode: Mode;
  sortBy: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
};

function getRating(mc: RankingMC, mode: Mode): number {
  if (mode === 'era_gain') return mc.era_rating_gain ?? 0;
  if (mode === 'era') return mc.era_rating ?? 0;
  if (mode === 'peak') return mc.peak_rating;
  return mc.current_rating;
}

function getRatingDisplay(mc: RankingMC, mode: Mode): string {
  const val = getRating(mc, mode);
  if (mode === 'era_gain') return (val >= 0 ? '+' : '') + Math.round(val).toString();
  return Math.round(val).toString();
}

function getRatingColor(mc: RankingMC, mode: Mode): string {
  if (mode === 'era_gain') {
    const gain = mc.era_rating_gain ?? 0;
    if (gain > 0) return 'text-green-400';
    if (gain < 0) return 'text-red-400';
    return 'text-gray-400';
  }
  if (mode === 'peak') return 'text-blue-400';
  return 'text-yellow-400';
}

function getWinRate(mc: RankingMC, mode: Mode): string {
  const battles = (mode === 'era' || mode === 'era_gain') ? (mc.era_battles ?? 0) : mc.battle_count;
  const wins = (mode === 'era' || mode === 'era_gain') ? (mc.era_wins ?? 0) : mc.win_count;
  return battles > 0 ? `${Math.round((wins / battles) * 100)}%` : '—';
}

function getBattleCount(mc: RankingMC, mode: Mode): number {
  return (mode === 'era' || mode === 'era_gain') ? (mc.era_battles ?? 0) : mc.battle_count;
}

function getRatingLabel(mode: Mode): string {
  if (mode === 'era_gain') return 'レート増加';
  if (mode === 'era') return '年間ピーク';
  if (mode === 'peak') return '最高レート';
  return 'レート';
}

function SortIndicator({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <span className="ml-1 text-gray-600">↕</span>;
  return <span className="ml-1">{asc ? '↑' : '↓'}</span>;
}

export default function RankingTable({ mcs, mode, sortBy, sortAsc, onSort }: Props) {
  const ratingLabel = getRatingLabel(mode);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-left">
            <th className="pb-3 pr-4 w-12">順位</th>
            <th className="pb-3 pr-4">MC名</th>
            <th
              className="pb-3 pr-4 text-right cursor-pointer hover:text-gray-300 select-none"
              onClick={() => onSort('rating')}
            >
              {ratingLabel}
              <SortIndicator active={sortBy === 'rating'} asc={sortAsc} />
            </th>
            <th
              className="pb-3 pr-4 text-right hidden sm:table-cell cursor-pointer hover:text-gray-300 select-none"
              onClick={() => onSort('win_rate')}
            >
              勝率
              <SortIndicator active={sortBy === 'win_rate'} asc={sortAsc} />
            </th>
            <th
              className="pb-3 text-right hidden sm:table-cell cursor-pointer hover:text-gray-300 select-none"
              onClick={() => onSort('battles')}
            >
              試合数
              <SortIndicator active={sortBy === 'battles'} asc={sortAsc} />
            </th>
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
              <td className={`py-3 pr-4 text-right font-mono font-bold ${getRatingColor(mc, mode)}`}>
                {getRatingDisplay(mc, mode)}
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
