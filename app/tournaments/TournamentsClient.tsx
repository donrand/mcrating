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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.series ?? '').toLowerCase().includes(q) ||
      t.heldOn.includes(q)
    );
  }, [query, tournaments]);

  const isSearching = query.trim().length > 0;

  const byYear = useMemo(() => {
    if (isSearching) return null;
    return filtered.reduce<Record<number, TournamentRow[]>>((acc, t) => {
      const year = extractYear(t.heldOn);
      if (!acc[year]) acc[year] = [];
      acc[year].push(t);
      return acc;
    }, {});
  }, [filtered, isSearching]);

  const years = byYear
    ? Object.keys(byYear).map(Number).sort((a, b) => b - a)
    : [];

  function Card({ t }: { t: TournamentRow }) {
    return (
      <Link href={`/tournaments/${t.id}`}>
        <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border text-sm bg-gray-900 border-gray-700 hover:border-green-700 transition-colors">
          <div className="flex items-center gap-1.5">
            {t.series && (
              <span className="text-xs text-gray-600 shrink-0">{t.series}</span>
            )}
            <span className="font-medium text-white">{t.name}</span>
          </div>
          {isSearching && (
            <span className="text-xs text-gray-600">{t.heldOn}</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">大会一覧</h1>
      <p className="text-gray-500 text-sm mb-4">{tournaments.length} 大会収録</p>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="大会名・シリーズ名で検索..."
        className="w-full max-w-sm px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 mb-6"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-600 text-sm">該当する大会が見つかりません</p>
      ) : isSearching ? (
        <div>
          <p className="text-xs text-gray-600 mb-3">{filtered.length} 件</p>
          <div className="flex flex-wrap gap-2">
            {filtered.map(t => <Card key={t.id} t={t} />)}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map(year => (
            <section key={year}>
              <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white">{year}</h2>
                <span className="text-xs text-gray-600">{byYear![year].length}件</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {byYear![year].map(t => <Card key={t.id} t={t} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
