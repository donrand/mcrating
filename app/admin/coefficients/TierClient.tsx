'use client';

import { useState, useTransition } from 'react';
import { updateSeriesTier } from './actions';
import type { TierLabel } from '@/lib/rating';

export type SeriesRow = {
  series: string;
  manual_tier: TierLabel | null;
  grade_coeff: number;
  registered_count: number;
  auto_a: number;
  auto_b: number;
  auto_c: number;
};

const TIER_COLORS: Record<TierLabel, string> = {
  A: 'bg-yellow-400 text-gray-900',
  B: 'bg-blue-500 text-white',
  C: 'bg-gray-600 text-gray-200',
};

function TierBadge({ tier }: { tier: TierLabel | null }) {
  if (!tier) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${TIER_COLORS[tier]}`}>
      {tier}
    </span>
  );
}

function SeriesRowItem({ row }: { row: SeriesRow }) {
  const [selected, setSelected] = useState<TierLabel | ''>(row.manual_tier ?? '');
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const changed = selected !== '' && selected !== (row.manual_tier ?? '');

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      await updateSeriesTier(row.series, selected as TierLabel);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
      {/* シリーズ名 */}
      <div className="w-40 font-medium text-white text-sm truncate">{row.series}</div>

      {/* 登録件数 */}
      <div className="w-16 text-xs text-gray-500 text-right">
        {row.registered_count}件
      </div>

      {/* auto_tier 分布 */}
      <div className="flex gap-1 text-xs text-gray-600 w-32">
        {row.auto_a > 0 && <span className="text-yellow-600">A:{row.auto_a}</span>}
        {row.auto_b > 0 && <span className="text-blue-700">B:{row.auto_b}</span>}
        {row.auto_c > 0 && <span className="text-gray-500">C:{row.auto_c}</span>}
      </div>

      {/* 現在のtier + 係数 */}
      <div className="flex items-center gap-2 w-24">
        <TierBadge tier={row.manual_tier} />
        <span className="text-xs font-mono text-gray-400">×{row.grade_coeff.toFixed(2)}</span>
      </div>

      {/* Tier変更セレクタ */}
      <div className="flex items-center gap-2 ml-auto">
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value as TierLabel | ''); setSaved(false); }}
          disabled={pending}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-yellow-400 disabled:opacity-50"
        >
          <option value="">変更…</option>
          <option value="A">A（×1.15）</option>
          <option value="B">B（×1.00）</option>
          <option value="C">C（×0.90）</option>
        </select>
        <button
          onClick={handleSave}
          disabled={!changed || pending}
          className="px-3 py-1 text-xs rounded bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? '…' : saved ? '✓' : '保存'}
        </button>
      </div>
    </div>
  );
}

export default function TierClient({ seriesList }: { seriesList: SeriesRow[] }) {
  const totalA = seriesList.filter(s => s.manual_tier === 'A').reduce((n, s) => n + s.registered_count, 0);
  const totalB = seriesList.filter(s => s.manual_tier === 'B').reduce((n, s) => n + s.registered_count, 0);
  const totalC = seriesList.filter(s => s.manual_tier === 'C').reduce((n, s) => n + s.registered_count, 0);

  const tierA = seriesList.filter(s => s.manual_tier === 'A');
  const tierB = seriesList.filter(s => s.manual_tier === 'B');
  const tierC = seriesList.filter(s => s.manual_tier === 'C');
  const unset = seriesList.filter(s => !s.manual_tier);

  return (
    <div className="space-y-8">
      {/* サマリー */}
      <div className="flex gap-6 p-3 bg-gray-900 rounded-lg border border-gray-800 text-xs">
        <span className="text-yellow-400 font-bold">A: {totalA}件</span>
        <span className="text-blue-400 font-bold">B: {totalB}件</span>
        <span className="text-gray-400 font-bold">C: {totalC}件</span>
        <span className="text-gray-600 ml-auto">再計算後にレーティングへ反映</span>
      </div>

      {/* Tier A */}
      {tierA.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
            Tier A <span className="text-gray-600 font-normal">×1.15</span>
          </h2>
          <div className="space-y-1">
            {tierA.map(s => <SeriesRowItem key={s.series} row={s} />)}
          </div>
        </section>
      )}

      {/* Tier B */}
      {tierB.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
            Tier B <span className="text-gray-600 font-normal">×1.00</span>
          </h2>
          <div className="space-y-1">
            {tierB.map(s => <SeriesRowItem key={s.series} row={s} />)}
          </div>
        </section>
      )}

      {/* Tier C */}
      {tierC.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
            Tier C <span className="text-gray-600 font-normal">×0.90</span>
          </h2>
          <div className="space-y-1">
            {tierC.map(s => <SeriesRowItem key={s.series} row={s} />)}
          </div>
        </section>
      )}

      {/* 未設定 */}
      {unset.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">未設定</h2>
          <div className="space-y-1">
            {unset.map(s => <SeriesRowItem key={s.series} row={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}
