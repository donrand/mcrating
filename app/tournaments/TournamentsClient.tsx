'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

export type TournamentRow = {
  id: string;
  name: string;
  heldOn: string;
  series: string | null;
};

function extractYear(heldOn: string): number {
  return parseInt(heldOn.slice(0, 4), 10);
}

const SERIES_COLOR: Record<string, { active: string; badge: string }> = {
  UMB:        { active: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50 font-semibold',  badge: 'text-yellow-500/80' },
  KOK:        { active: 'bg-blue-400/20 text-blue-300 border-blue-400/50 font-semibold',        badge: 'text-blue-500/80' },
  '戦極':     { active: 'bg-red-400/20 text-red-300 border-red-400/50 font-semibold',           badge: 'text-red-500/80' },
  SPOTLIGHT:  { active: 'bg-purple-400/20 text-purple-300 border-purple-400/50 font-semibold',  badge: 'text-purple-500/80' },
  Dis4U:      { active: 'bg-green-400/20 text-green-300 border-green-400/50 font-semibold',     badge: 'text-green-500/80' },
  '凱旋':     { active: 'bg-teal-400/20 text-teal-300 border-teal-400/50 font-semibold',        badge: 'text-teal-500/80' },
  FSD:        { active: 'bg-orange-400/20 text-orange-300 border-orange-400/50 font-semibold',  badge: 'text-orange-500/80' },
  ADRENALINE: { active: 'bg-rose-400/20 text-rose-300 border-rose-400/50 font-semibold',        badge: 'text-rose-500/80' },
  'U-22':     { active: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/50 font-semibold',  badge: 'text-indigo-500/80' },
};
const DEFAULT_COLOR = { active: 'bg-gray-400/20 text-gray-200 border-gray-400/50 font-semibold', badge: 'text-gray-500' };

const INACTIVE_TAG = 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-200 hover:border-gray-600';

export default function TournamentsClient({ tournaments }: { tournaments: TournamentRow[] }) {
  const [query, setQuery] = useState('');
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [asc, setAsc] = useState(false);

  const seriesList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tournaments) {
      if (t.series) counts.set(t.series, (counts.get(t.series) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [tournaments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = tournaments;

    if (activeSeries) {
      base = base.filter(t => t.series === activeSeries);
    }

    if (q) {
      base = base.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.series ?? '').toLowerCase().includes(q) ||
        t.heldOn.includes(q)
      );
    }

    return [...base].sort((a, b) =>
      asc ? a.heldOn.localeCompare(b.heldOn) : b.heldOn.localeCompare(a.heldOn)
    );
  }, [query, activeSeries, tournaments, asc]);

  const byYear = useMemo(() => {
    if (query.trim()) return null;
    return filtered.reduce<Record<number, TournamentRow[]>>((acc, t) => {
      const year = extractYear(t.heldOn);
      if (!acc[year]) acc[year] = [];
      acc[year].push(t);
      return acc;
    }, {});
  }, [filtered, query]);

  const years = byYear
    ? Object.keys(byYear).map(Number).sort((a, b) => (asc ? a - b : b - a))
    : [];

  function toggleSeries(s: string) {
    setActiveSeries(prev => (prev === s ? null : s));
    setQuery('');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">大会一覧</h1>
      <p className="text-gray-500 text-sm mb-4">{tournaments.length} 大会収録</p>

      {/* シリーズタグ */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => { setActiveSeries(null); setQuery(''); }}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            activeSeries === null && !query.trim()
              ? 'bg-white/10 text-white border-white/20 font-semibold'
              : INACTIVE_TAG
          }`}
        >
          すべて
        </button>
        {seriesList.map(s => {
          const color = SERIES_COLOR[s] ?? DEFAULT_COLOR;
          const isActive = activeSeries === s;
          return (
            <button
              key={s}
              onClick={() => toggleSeries(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                isActive ? color.active : INACTIVE_TAG
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* テキスト検索・ソート */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value) setActiveSeries(null); }}
          placeholder="大会名・シリーズ名で検索..."
          className="flex-1 max-w-sm px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
        <button
          onClick={() => setAsc(v => !v)}
          className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors whitespace-nowrap"
        >
          {asc ? '古い順 ↑' : '新しい順 ↓'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600 text-sm">該当する大会が見つかりません</p>
      ) : query.trim() ? (
        <div>
          <p className="text-xs text-gray-600 mb-3">{filtered.length} 件</p>
          <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
            {filtered.map(t => <TournamentItem key={t.id} t={t} showDate />)}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {activeSeries && (
            <p className="text-xs text-gray-500">{filtered.length} 件</p>
          )}
          {years.map(year => (
            <section key={year}>
              <div className="flex items-baseline gap-3 mb-2 pb-2 border-b border-gray-800">
                <h2 className="text-base font-bold text-white">{year}</h2>
                <span className="text-xs text-gray-600">{byYear![year].length}件</span>
              </div>
              <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
                {byYear![year].map(t => <TournamentItem key={t.id} t={t} showDate={false} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentItem({ t, showDate }: { t: TournamentRow; showDate: boolean }) {
  const color = t.series ? (SERIES_COLOR[t.series] ?? DEFAULT_COLOR) : null;
  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors group"
    >
      {showDate && (
        <span className="text-xs text-gray-600 w-24 shrink-0 font-mono">{t.heldOn.slice(0, 10)}</span>
      )}
      {t.series && (
        <span className={`text-xs shrink-0 w-16 truncate ${color?.badge ?? 'text-gray-500'}`}>
          {t.series}
        </span>
      )}
      <span className="text-sm text-white font-medium flex-1 min-w-0 truncate group-hover:text-yellow-300 transition-colors">
        {t.name}
      </span>
      <span className="text-gray-700 text-xs shrink-0">→</span>
    </Link>
  );
}
