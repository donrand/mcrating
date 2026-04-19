'use client';

import { useState } from 'react';
import { deleteBattles, recalculateAllRatings, purgeCache } from './actions';

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
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<{ ok: boolean; message: string; details?: string } | null>(null);
  const [purging, setPurging] = useState(false);

  function toggleOne(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
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
    if (!confirm(`${checked.size}件のバトルを削除します。よろしいですか？`)) return;

    setProcessing(true);
    await deleteBattles(Array.from(checked));
    setDone(`${checked.size}件を削除しました`);
    setChecked(new Set());
    setProcessing(false);
  }

  async function handleRecalculate() {
    if (!confirm('全レーティングを再計算します。時間がかかる場合があります。よろしいですか？')) return;

    setRecalculating(true);
    setRecalcResult(null);
    try {
      const res = await recalculateAllRatings();
      setRecalcResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRecalcResult({ ok: false, message: '予期しないエラー', details: msg });
    } finally {
      setRecalculating(false);
    }
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

      {/* レーティング全再計算 */}
      <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-300">レーティング全再計算</p>
            <p className="text-xs text-gray-500 mt-0.5">全承認済みバトルをもとにレーティングを最初から計算し直します</p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shrink-0"
          >
            {recalculating ? '計算中...' : '全再計算を実行'}
          </button>
        </div>
        {recalcResult && (
          <div className={`p-2 rounded text-sm space-y-1 ${recalcResult.ok ? 'bg-green-900/30 border border-green-700 text-green-400' : 'bg-red-900/30 border border-red-700 text-red-400'}`}>
            <p>{recalcResult.message}</p>
            {recalcResult.details && (
              <p className="text-xs opacity-75 font-mono break-all">{recalcResult.details}</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-800 pt-3">
          <div>
            <p className="text-sm font-semibold text-gray-400">キャッシュクリア</p>
            <p className="text-xs text-gray-600 mt-0.5">SQL Editorで再計算した後にサイトへ反映する</p>
          </div>
          <button
            onClick={async () => { setPurging(true); await purgeCache(); setPurging(false); }}
            disabled={purging}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shrink-0"
          >
            {purging ? '処理中...' : 'キャッシュをクリア'}
          </button>
        </div>
      </div>

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
