'use client';

import { useState, useTransition } from 'react';
import { updateManualTier } from './actions';
import type { TierLabel } from '@/lib/rating';
import type { TierLog } from '@/lib/supabase';

export type TournamentTierRow = {
  id: string | null;
  displayName: string;
  held_on: string | null;
  inMaster: boolean;
  registered: boolean;
  // ティア情報
  auto_tier: TierLabel | null;
  manual_tier: TierLabel | null;
  final_tier: TierLabel | null;
  grade_coeff: number;
  tier_locked: boolean;
  // 計算根拠
  tier_t: number | null;
  tier_y: number | null;
  tier_sigma_y: number | null;
  tier_z: number | null;
  // 最近のログ
  logs: TierLog[];
};

export type CategoryGroup = {
  id: string;
  label: string;
  tournaments: TournamentTierRow[];
};

const TIER_COLORS: Record<TierLabel, string> = {
  A: 'bg-yellow-400 text-gray-900',
  B: 'bg-blue-500 text-white',
  C: 'bg-gray-600 text-gray-200',
};

const TIER_BORDER: Record<TierLabel, string> = {
  A: 'border-yellow-400',
  B: 'border-blue-500',
  C: 'border-gray-600',
};

function TierBadge({ tier, size = 'sm' }: { tier: TierLabel | null; size?: 'xs' | 'sm' }) {
  if (!tier) return <span className="text-gray-700 text-xs">—</span>;
  const px = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs font-bold';
  return (
    <span className={`inline-block rounded ${px} ${TIER_COLORS[tier]}`}>
      {tier}
    </span>
  );
}

function TierBasis({
  t, y, sigmaY, z
}: {
  t: number | null;
  y: number | null;
  sigmaY: number | null;
  z: number | null;
}) {
  return (
    <div className="flex gap-3 text-xs text-gray-500 font-mono">
      <span>T={t != null ? t.toFixed(0) : '—'}</span>
      <span>Y={y != null ? y.toFixed(0) : '—'}</span>
      <span>σ={sigmaY != null ? sigmaY.toFixed(2) : '—'}</span>
      <span>z={z != null ? z.toFixed(2) : '—'}</span>
    </div>
  );
}

function LogHistory({ logs }: { logs: TierLog[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-2 text-xs text-gray-600">
          <span className="shrink-0 text-gray-700">
            {new Date(log.changed_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
          </span>
          <span>
            <TierBadge tier={log.prev_manual_tier} size="xs" />
            {' → '}
            <TierBadge tier={log.new_manual_tier} size="xs" />
            {log.reason && <span className="ml-1 text-gray-600">（{log.reason}）</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function TournamentTierRow({ t }: { t: TournamentTierRow }) {
  const [selectedTier, setSelectedTier] = useState<TierLabel | ''>('');
  const [reason, setReason] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  if (!t.registered || !t.id) {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${t.inMaster ? 'bg-gray-900/40 opacity-40' : 'hidden'}`}>
        <div className="flex-1 text-sm text-gray-500">{t.displayName}</div>
        <span className="text-xs text-gray-700">未登録</span>
      </div>
    );
  }

  const changed = selectedTier !== '' && selectedTier !== (t.manual_tier ?? '');

  function handleSave() {
    if (!t.id) return;
    const tier = selectedTier === '' ? null : selectedTier as TierLabel;
    startTransition(async () => {
      await updateManualTier(t.id!, tier, reason);
      setSaved(true);
      setSelectedTier('');
      setReason('');
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleClear() {
    if (!t.id) return;
    startTransition(async () => {
      await updateManualTier(t.id!, null, '手動設定解除');
      setSaved(true);
      setSelectedTier('');
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className={`px-3 py-2.5 rounded-lg transition-colors ${t.inMaster ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-900/30 opacity-50'}`}>
      <div className="flex items-center gap-3">
        {/* 名前・日付 */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white">{t.displayName}</span>
          <span className="text-xs text-gray-600 ml-2">{t.held_on ?? '—'}</span>
          {t.tier_locked && (
            <span className="ml-2 text-xs text-orange-400 border border-orange-400 rounded px-1">locked</span>
          )}
        </div>

        {/* 計算根拠 */}
        <TierBasis t={t.tier_t} y={t.tier_y} sigmaY={t.tier_sigma_y} z={t.tier_z} />

        {/* auto_tier */}
        <div className="flex items-center gap-1 w-16">
          <span className="text-xs text-gray-600">自動</span>
          <TierBadge tier={t.auto_tier} />
        </div>

        {/* manual_tier（現在値）*/}
        <div className="flex items-center gap-1 w-20">
          <span className="text-xs text-gray-600">手動</span>
          {t.manual_tier ? (
            <div className="flex items-center gap-1">
              <TierBadge tier={t.manual_tier} />
              <button
                onClick={handleClear}
                disabled={pending}
                className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                title="手動設定を解除"
              >✕</button>
            </div>
          ) : (
            <span className="text-gray-700 text-xs">—</span>
          )}
        </div>

        {/* final_tier + grade_coeff */}
        <div className="flex items-center gap-1.5 w-24">
          <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${t.final_tier ? TIER_BORDER[t.final_tier] : 'border-gray-700'} ${t.final_tier ? TIER_COLORS[t.final_tier] : ''}`}>
            {t.final_tier ?? '?'}
          </span>
          <span className="text-xs font-mono text-gray-400">{t.grade_coeff.toFixed(2)}</span>
        </div>

        {/* 手動上書きセレクタ */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value as TierLabel | '')}
            disabled={pending}
            className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-yellow-400 disabled:opacity-50"
          >
            <option value="">選択…</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          {changed && (
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="理由"
              className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-yellow-400"
            />
          )}
          <button
            onClick={handleSave}
            disabled={!changed || pending}
            className="px-2 py-1 text-xs rounded bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? '…' : saved ? '✓' : '保存'}
          </button>
        </div>

        {/* ログ展開ボタン */}
        {t.logs.length > 0 && (
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showLogs ? '▲' : `▼履歴${t.logs.length}`}
          </button>
        )}
      </div>

      {showLogs && <LogHistory logs={t.logs} />}
    </div>
  );
}

export default function TierClient({ categories }: { categories: CategoryGroup[] }) {
  const allTournaments = categories.flatMap(c => c.tournaments);
  const registered = allTournaments.filter(t => t.registered);
  const withAutoTier = registered.filter(t => t.auto_tier);
  const countA = registered.filter(t => t.final_tier === 'A').length;
  const countB = registered.filter(t => t.final_tier === 'B').length;
  const countC = registered.filter(t => t.final_tier === 'C').length;
  const withManual = registered.filter(t => t.manual_tier).length;

  return (
    <div className="space-y-2">
      {/* サマリー */}
      <div className="flex gap-4 mb-6 p-3 bg-gray-900 rounded-lg border border-gray-800">
        <div className="text-xs text-gray-500">
          計算済: <span className="text-white font-mono">{withAutoTier.length}</span>/{registered.length}件
        </div>
        <div className="flex gap-2 text-xs">
          <span><TierBadge tier="A" /> <span className="font-mono text-white">{countA}</span></span>
          <span><TierBadge tier="B" /> <span className="font-mono text-white">{countB}</span></span>
          <span><TierBadge tier="C" /> <span className="font-mono text-white">{countC}</span></span>
        </div>
        {withManual > 0 && (
          <div className="text-xs text-orange-400">手動上書き: {withManual}件</div>
        )}
        <div className="text-xs text-gray-600 ml-auto">
          再計算後にティアが更新されます
        </div>
      </div>

      {/* カテゴリ別リスト */}
      {categories.map(cat => (
        <section key={cat.id} className="mb-8">
          <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-800">
            <h2 className="text-base font-bold text-white">{cat.label}</h2>
            <span className="text-xs text-gray-500">{cat.tournaments.filter(t => t.registered).length}件</span>
          </div>
          <div className="space-y-1">
            {cat.tournaments.map(t => (
              <TournamentTierRow key={t.id ?? t.displayName} t={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
