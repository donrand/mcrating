'use client';

import { useState } from 'react';
import Link from 'next/link';

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  approved_at: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
  ratings: { mc_id: string; delta: number; rating_after: number }[];
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">登録履歴</h1>
      <p className="text-gray-500 text-sm mb-6">承認済みバトル {total} 件（新しい順）</p>

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

      <div className="space-y-2">
        {filtered.map(b => {
          const deltaA = b.ratings.find(r => r.mc_id === b.mc_a?.id);
          const deltaB = b.ratings.find(r => r.mc_id === b.mc_b?.id);

          return (
            <div
              key={b.id}
              className="bg-gray-900 rounded-lg px-4 py-3"
            >
              {/* 大会・ラウンド・登録日 */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">
                  {b.tournaments?.name ?? '不明'}
                </span>
                {b.round_name && (
                  <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
                    {b.round_name}
                  </span>
                )}
                {b.winner === 'draw' && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-bold">引き分け</span>
                )}
                <span className="text-xs text-gray-700 ml-auto">
                  {b.tournaments?.held_on ?? '—'}
                </span>
              </div>

              {/* 対戦カード */}
              <div className="flex items-stretch gap-3">
                {/* MC A */}
                <div className={`flex-1 flex flex-col items-end gap-0.5 px-3 py-2 rounded-lg ${b.winner === 'a' ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-gray-800'}`}>
                  <Link
                    href={`/mc/${b.mc_a?.id}`}
                    className={`font-semibold text-sm hover:text-yellow-400 transition-colors ${b.winner === 'a' ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    {b.mc_a?.name ?? '—'}
                  </Link>
                  {deltaA !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-mono font-bold ${deltaA.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {deltaA.delta >= 0 ? '+' : ''}{deltaA.delta.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-600">→</span>
                      <span className="text-xs text-gray-400 font-mono">{deltaA.rating_after.toFixed(0)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-700">—</span>
                  )}
                </div>

                {/* VS */}
                <div className="flex flex-col items-center justify-center text-xs text-gray-600 shrink-0">
                  <span>vs</span>
                </div>

                {/* MC B */}
                <div className={`flex-1 flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg ${b.winner === 'b' ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-gray-800'}`}>
                  <Link
                    href={`/mc/${b.mc_b?.id}`}
                    className={`font-semibold text-sm hover:text-yellow-400 transition-colors ${b.winner === 'b' ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    {b.mc_b?.name ?? '—'}
                  </Link>
                  {deltaB !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-mono font-bold ${deltaB.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {deltaB.delta >= 0 ? '+' : ''}{deltaB.delta.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-600">→</span>
                      <span className="text-xs text-gray-400 font-mono">{deltaB.rating_after.toFixed(0)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-700">—</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
