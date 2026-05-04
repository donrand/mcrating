'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RankingTable, { type SortKey } from '@/components/RankingTable';

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
  era_rating_gain?: number;
};

type Props = {
  initialMcs: RankingMC[];
  year: number | null;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2006 + 1 }, (_, i) => currentYear - i);

export default function RankingPage({ initialMcs, year }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'current' | 'peak'>('current');
  const [eraView, setEraView] = useState<'peak' | 'gain'>('peak');
  const [sortBy, setSortBy] = useState<SortKey>('rating');
  const [sortAsc, setSortAsc] = useState(false);

  const isEra = year !== null;

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc(v => !v);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  }

  function getRatingValue(mc: RankingMC): number {
    if (isEra) return eraView === 'gain' ? (mc.era_rating_gain ?? 0) : (mc.era_rating ?? 0);
    return mode === 'peak' ? mc.peak_rating : mc.current_rating;
  }

  function getWinRateValue(mc: RankingMC): number {
    const battles = isEra ? (mc.era_battles ?? 0) : mc.battle_count;
    const wins = isEra ? (mc.era_wins ?? 0) : mc.win_count;
    return battles > 0 ? wins / battles : 0;
  }

  function getBattlesValue(mc: RankingMC): number {
    return isEra ? (mc.era_battles ?? 0) : mc.battle_count;
  }

  const displayMcs = [...initialMcs].sort((a, b) => {
    let diff: number;
    if (sortBy === 'win_rate') {
      diff = getWinRateValue(a) - getWinRateValue(b);
    } else if (sortBy === 'battles') {
      diff = getBattlesValue(a) - getBattlesValue(b);
    } else {
      diff = getRatingValue(a) - getRatingValue(b);
    }
    return sortAsc ? diff : -diff;
  });

  const effectiveMode = isEra ? (eraView === 'gain' ? 'era_gain' : 'era') : mode;

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
              setSortBy('rating');
              setSortAsc(false);
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

        {/* 年間ピーク / レート増加切り替え（年代モードのみ） */}
        {isEra && (
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => { setEraView('peak'); setSortBy('rating'); setSortAsc(false); }}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                eraView === 'peak'
                  ? 'bg-yellow-400 text-gray-900 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              年間ピーク
            </button>
            <button
              onClick={() => { setEraView('gain'); setSortBy('rating'); setSortAsc(false); }}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                eraView === 'gain'
                  ? 'bg-green-400 text-gray-900 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              レート増加
            </button>
          </div>
        )}
      </div>

      {isEra && (
        <p className="text-xs text-gray-500 mb-4">
          {year}年に3試合以上出場したMC・
          {eraView === 'gain' ? '年間レート増加順' : '年間ピークレート順'}
          （3試合未満は非表示）
        </p>
      )}

      <RankingTable
        mcs={displayMcs}
        mode={effectiveMode as 'current' | 'peak' | 'era' | 'era_gain'}
        sortBy={sortBy}
        sortAsc={sortAsc}
        onSort={handleSort}
      />
    </div>
  );
}
