'use client';

import { useState } from 'react';
import { deleteBattles } from './actions';

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  approved_at: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
};

type Props = { battles: BattleRow[] };

export default function BattleDeleteClient({ battles }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  function toggleOne(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checked.size === battles.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(battles.map(b => b.id)));
    }
  }

  async function handleDelete() {
    if (checked.size === 0) return;
    if (!confirm(`${checked.size}件のバトルを削除します。レーティングも再計算されます。よろしいですか？`)) return;

    setProcessing(true);
    await deleteBattles(Array.from(checked));
    setDone(`${checked.size}件を削除しました`);
    setChecked(new Set());
    setProcessing(false);
  }

  // 日付ごとにグループ化
  const grouped = battles.reduce<Record<string, BattleRow[]>>((acc, b) => {
    const date = b.tournaments?.held_on ?? '日付不明';
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      {/* 操作バー */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900 rounded-xl sticky top-0 z-10 border border-gray-800">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={checked.size === battles.length && battles.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 accent-yellow-400"
          />
          全選択
        </label>
        <span className="text-sm text-gray-500">
          {checked.size > 0 ? `${checked.size}件選択中` : ''}
        </span>
        <button
          onClick={handleDelete}
          disabled={checked.size === 0 || processing}
          className="ml-auto px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {processing ? '削除中...' : `選択した${checked.size}件を削除`}
        </button>
      </div>

      {done && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
          {done}（ページを再読み込みすると反映されます）
        </div>
      )}

      {battles.length === 0 && (
        <p className="text-gray-600 text-center py-16">承認済みバトルがありません</p>
      )}

      <div className="space-y-6">
        {sortedDates.map(date => (
          <div key={date}>
            <h2 className="text-xs font-semibold text-gray-500 mb-2 pb-1 border-b border-gray-800">
              {date}
            </h2>
            <div className="space-y-1">
              {grouped[date].map(b => {
                const winnerName =
                  b.winner === 'a' ? b.mc_a?.name :
                  b.winner === 'b' ? b.mc_b?.name :
                  '引き分け';
                const isChecked = checked.has(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isChecked ? 'bg-red-950 border border-red-800' : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(b.id)}
                      className="w-4 h-4 accent-red-500 shrink-0"
                    />
                    <span className="text-xs text-gray-500 w-24 shrink-0 truncate">
                      {b.tournaments?.name}
                    </span>
                    <span className="flex-1 text-sm font-medium">
                      {b.mc_a?.name}
                      <span className="text-gray-600 mx-2">vs</span>
                      {b.mc_b?.name}
                    </span>
                    <span className="text-xs text-yellow-400 shrink-0">
                      {winnerName}
                    </span>
                    {b.round_name && (
                      <span className="text-xs text-gray-600 shrink-0">{b.round_name}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
