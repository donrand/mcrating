'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RankingTable from '@/components/RankingTable';

export type RankingMC = {
  id: string;
  name: string;
  current_rating: number;
  peak_rating: number;
  battle_count: number;
  win_count: number;
  era_rating?: number;
  era_battles?: number;
  era_wins?: number;
};

type Props = {
  initialMcs: RankingMC[];
  year: number | null;
};

const YEARS = Array.from({ length: 20 }, (_, i) => 2006 + i);

export default function RankingPage({ initialMcs, year }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'current' | 'peak'>('current');
  const isEra = year !== null;

  const displayMcs = isEra
    ? initialMcs
    : [...initialMcs].sort((a, b) =>
        mode === 'peak' ? b.peak_rating - a.peak_rating : b.current_rating - a.current_rating,
      );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">MCバトル レーティングランキング</h1>
      <p className="text-gray-500 text-sm mb-4">
        国内MCバトルシーンの拡張Eloレーティングによるランキング
      </p>
      <p className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2 mb-6">
        ⚠️ レーティングはラッパーの強さや実力を示すものではありません。あくまで独自指標です、参考程度に！
      </p>

      {/* フィルター行 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* 年代セレクター */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">年代:</span>
          <select
            value={year ?? ''}
            onChange={e => {
              const val = e.target.value;
              router.push(val ? `/?year=${val}` : '/');
            }}
            className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:border-yellow-400"
          >
            <option value="">全期間</option>
            {YEARS.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>

        {/* 現在/最高レート切り替え（全期間のみ） */}
        {!isEra && (
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setMode('current')}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                mode === 'current'
                  ? 'bg-yellow-400 text-gray-900 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              現在レート
            </button>
            <button
              onClick={() => setMode('peak')}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                mode === 'peak'
                  ? 'bg-blue-400 text-gray-900 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              最高レート
            </button>
          </div>
        )}
      </div>

      {isEra && (
        <p className="text-xs text-gray-500 mb-4">
          {year}年に3試合以上出場したMC・年間ピークレート順（3試合未満は非表示）
        </p>
      )}

      <RankingTable mcs={displayMcs} mode={isEra ? 'era' : mode} />
    </div>
  );
}
