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

export default function TournamentsClient({ tournaments }: { tournaments: TournamentRow[] }) {
  const [query, setQuery] = useState('');
  const [asc, setAsc] = useState(false); // false = 新しい順

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? tournaments.filter(t =>
          t.name.toLowerCase().includes(q) ||
          (t.series ?? '').toLowerCase().includes(q) ||
          t.heldOn.includes(q)
        )
      : tournaments;
    return [...base].sort((a, b) =>
      asc ? a.heldOn.localeCompare(b.heldOn) : b.heldOn.localeCompare(a.heldOn)
    );
  }, [query, tournaments, asc]);

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">大会一覧</h1>
      <p className="text-gray-500 text-sm mb-4">{tournaments.length} 大会収録</p>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
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
            {filtered.map(t => <TournamentRow key={t.id} t={t} showDate />)}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map(year => (
            <section key={year}>
              <div className="flex items-baseline gap-3 mb-2 pb-2 border-b border-gray-800">
                <h2 className="text-base font-bold text-white">{year}</h2>
                <span className="text-xs text-gray-600">{byYear![year].length}件</span>
              </div>
              <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
                {byYear![year].map(t => <TournamentRow key={t.id} t={t} showDate={false} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentRow({ t, showDate }: { t: TournamentRow; showDate: boolean }) {
  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors group"
    >
      {showDate && (
        <span className="text-xs text-gray-600 w-24 shrink-0 font-mono">{t.heldOn.slice(0, 10)}</span>
      )}
      {t.series && (
        <span className="text-xs text-gray-600 shrink-0 w-16 truncate">{t.series}</span>
      )}
      <span className="text-sm text-white font-medium flex-1 min-w-0 truncate group-hover:text-yellow-300 transition-colors">
        {t.name}
      </span>
      <span className="text-gray-700 text-xs shrink-0">→</span>
    </Link>
  );
}
