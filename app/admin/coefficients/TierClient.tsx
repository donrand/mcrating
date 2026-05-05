'use client';

import { useState, useTransition } from 'react';
import { updateSeriesTier } from './actions';
import { TIER_BASE_COEFFS, type TierLabel } from '@/lib/rating';

export type SeriesRow = {
  series: string;
  manual_tier: TierLabel | null;
  registered_count: number;
  auto_a: number;
  auto_b: number;
  auto_c: number;
};

const TIER_STYLE: Record<TierLabel, { badge: string; section: string }> = {
  A: { badge: 'bg-yellow-400 text-gray-900',  section: 'text-yellow-400' },
  B: { badge: 'bg-orange-500 text-white',      section: 'text-orange-400' },
  C: { badge: 'bg-blue-500 text-white',        section: 'text-blue-400'   },
  D: { badge: 'bg-gray-500 text-white',        section: 'text-gray-400'   },
  E: { badge: 'bg-gray-700 text-gray-300',     section: 'text-gray-500'   },
};

const TIERS: TierLabel[] = ['A', 'B', 'C', 'D', 'E'];

function TierBadge({ tier }: { tier: TierLabel | null }) {
  if (!tier) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${TIER_STYLE[tier].badge}`}>
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

  const baseCoeff = row.manual_tier ? TIER_BASE_COEFFS[row.manual_tier] : null;

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
      {/* シリーズ名 */}
      <div className="w-44 font-medium text-white text-sm truncate">{row.series}</div>

      {/* 登録件数 */}
      <div className="w-14 text-xs text-gray-500 text-right">{row.registered_count}件</div>

      {/* 現在のtier + ベース係数 */}
      <div className="flex items-center gap-2 w-28">
        <TierBadge tier={row.manual_tier} />
        {baseCoeff != null && (
          <span className="text-xs font-mono text-gray-400">
            ×{baseCoeff.toFixed(1)}
            <span className="text-gray-600">±Q</span>
          </span>
        )}
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
          {TIERS.map(t => (
            <option key={t} value={t}>
              {t}（×{TIER_BASE_COEFFS[t].toFixed(1)}）
            </option>
          ))}
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
  const grouped = TIERS.reduce<Record<TierLabel, SeriesRow[]>>(
    (acc, t) => ({ ...acc, [t]: seriesList.filter(s => s.manual_tier === t) }),
    {} as Record<TierLabel, SeriesRow[]>,
  );
  const unset = seriesList.filter(s => !s.manual_tier);

  return (
    <div className="space-y-8">
      {/* 計算式サマリー */}
      <div className="p-3 bg-gray-900 rounded-lg border border-gray-800 text-xs text-gray-500 space-y-1">
        <div className="font-mono text-gray-400">
          grade_coeff = clamp(1.0, 3.0, B_tier × Q)
        </div>
        <div className="font-mono text-gray-600">
          Q = clamp(0.92, 1.08, 1 + 0.12 × (T−Y)/σY)　※再計算時に自動算出
        </div>
      </div>

      {/* ティア別セクション */}
      {TIERS.map(tier => {
        const rows = grouped[tier];
        if (rows.length === 0) return null;
        const base = TIER_BASE_COEFFS[tier];
        return (
          <section key={tier}>
            <h2 className={`text-sm font-bold mb-2 flex items-center gap-3 ${TIER_STYLE[tier].section}`}>
              Tier {tier}
              <span className="text-gray-600 font-normal font-mono">
                ×{base.toFixed(1)}　({(base * 0.92).toFixed(2)}〜{(base * 1.08).toFixed(2)})
              </span>
            </h2>
            <div className="space-y-1">
              {rows.map(s => <SeriesRowItem key={s.series} row={s} />)}
            </div>
          </section>
        );
      })}

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
