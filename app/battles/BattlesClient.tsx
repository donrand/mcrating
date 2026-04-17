'use client';

import { useState } from 'react';
import Link from 'next/link';

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
  ratings: { mc_id: string; delta: number }[];
};

export default function BattlesClient({ battles, total }: { battles: BattleRow[]; total: number }) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? battles.filter(b => {
        const q = search.toLowerCase();
        return (
          b.mc_a?.name.toLowerCase().includes(q) ||
          b.mc_b?.name.toLowerCase().includes(q)
        );
      })
    : battles;

  const grouped = filtered.reduce<Record<string, BattleRow[]>>((acc, b) => {
    const date = b.tournaments?.held_on ?? '日付不明';
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">登録履歴</h1>
      <p className="text-gray-500 text-sm mb-6">承認済みバトル {total} 件</p>

      {/* 検索 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="MC名で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
        />
        {search && (
          <p className="text-xs text-gray-500 mt-2">
            {filtered.length} 件ヒット
          </p>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-600 text-center py-16">データがありません</p>
      )}

      <div className="space-y-8">
        {sortedDates.map(date => (
          <div key={date}>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 pb-2 border-b border-gray-800">
              {date}
            </h2>
            <div className="space-y-2">
              {grouped[date].map(b => {
                const winnerName =
                  b.winner === 'a' ? b.mc_a?.name :
                  b.winner === 'b' ? b.mc_b?.name :
                  null;
                const deltaA = b.ratings.find(r => r.mc_id === b.mc_a?.id)?.delta;
                const deltaB = b.ratings.find(r => r.mc_id === b.mc_b?.id)?.delta;

                return (
                  <div
                    key={b.id}
                    className="bg-gray-900 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                  >
                    <span className="text-xs text-gray-500 w-28 shrink-0">
                      {b.tournaments?.name ?? '不明'}
                    </span>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col items-end min-w-0">
                        <Link
                          href={`/mc/${b.mc_a?.id}`}
                          className={`font-semibold hover:text-yellow-400 transition-colors truncate ${b.winner === 'a' ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          {b.mc_a?.name}
                        </Link>
                        {deltaA !== undefined && (
                          <span className={`text-xs font-mono ${deltaA >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {deltaA >= 0 ? '+' : ''}{deltaA.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-600 shrink-0 text-xs">vs</span>
                      <div className="flex flex-col items-start min-w-0">
                        <Link
                          href={`/mc/${b.mc_b?.id}`}
                          className={`font-semibold hover:text-yellow-400 transition-colors truncate ${b.winner === 'b' ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          {b.mc_b?.name}
                        </Link>
                        {deltaB !== undefined && (
                          <span className={`text-xs font-mono ${deltaB >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {deltaB >= 0 ? '+' : ''}{deltaB.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {b.winner === 'draw' ? (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-bold">引き分け</span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          勝者: <span className="text-yellow-400 font-semibold">{winnerName}</span>
                        </span>
                      )}
                      {b.round_name && (
                        <span className="text-xs text-gray-600">{b.round_name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
