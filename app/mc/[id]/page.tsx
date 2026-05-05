import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import RatingChart from '@/components/RatingChart';
import YearSelect from './YearSelect';

export const revalidate = 60;

import { ROUND_ORDER } from '@/lib/rounds';
const PAGE_SIZE = 20;

type Props = {
  params: { id: string };
  searchParams: { page?: string; year?: string };
};

type RatingRow = {
  id: string;
  rating_after: number;
  rating_before: number;
  delta: number;
  battles: {
    winner: string;
    round_name: string | null;
    tournament_id: string;
    mc_a_id: string;
    mc_b_id: string;
    mc_a: { id: string; name: string } | null;
    mc_b: { id: string; name: string } | null;
    tournaments: { name: string; held_on: string | null } | null;
  } | null;
};

function buildUrl(id: string, page: number, year: string | null) {
  const qs = new URLSearchParams();
  if (page > 1) qs.set('page', String(page));
  if (year) qs.set('year', year);
  const s = qs.toString();
  return `/mc/${id}${s ? `?${s}` : ''}`;
}

export default async function MCProfilePage({ params, searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const selectedYear = searchParams.year ?? null;

  const [{ data: mc }, { data: ratingsRaw }, { data: allMcs }] = await Promise.all([
    supabase.from('mcs').select('*').eq('id', params.id).single(),
    supabase
      .from('ratings')
      .select('id, rating_after, rating_before, delta, battles(winner, round_name, tournament_id, mc_a_id, mc_b_id, mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name), tournaments(name, held_on))')
      .eq('mc_id', params.id)
      .range(0, 9999),
    supabase
      .from('mcs')
      .select('id, current_rating')
      .eq('is_active', true)
      .order('current_rating', { ascending: false }),
  ]);

  if (!mc) notFound();

  const ratings = (ratingsRaw as unknown as RatingRow[]) ?? [];

  // 時系列ソート（グラフ・ページネーション共通ベース）
  const sortedAsc = [...ratings].sort((a, b) => {
    const dateA = a.battles?.tournaments?.held_on ?? '';
    const dateB = b.battles?.tournaments?.held_on ?? '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const roundA = ROUND_ORDER.indexOf(a.battles?.round_name ?? '');
    const roundB = ROUND_ORDER.indexOf(b.battles?.round_name ?? '');
    return (roundA === -1 ? 999 : roundA) - (roundB === -1 ? 999 : roundB);
  });

  const peakRating = sortedAsc.reduce<number>(
    (max, r) => Math.max(max, r.rating_after),
    (mc.current_rating as number) ?? 1500,
  );

  // グラフ用（全件・時系列昇順）
  const chartData = sortedAsc.map(r => ({
    date: r.battles?.tournaments?.held_on?.slice(0, 7) ?? '不明',
    rating: r.rating_after,
    opponent: '',
  }));

  // 選択可能な年一覧（降順）
  const availableYears = Array.from(
    new Set(
      sortedAsc
        .map(r => r.battles?.tournaments?.held_on?.slice(0, 4))
        .filter((y): y is string => !!y),
    ),
  ).sort((a, b) => b.localeCompare(a));

  // 年フィルター適用
  const filteredAsc = selectedYear
    ? sortedAsc.filter(r => r.battles?.tournaments?.held_on?.slice(0, 4) === selectedYear)
    : sortedAsc;

  // 年別スタッツ
  const yearStats = selectedYear
    ? {
        battles: filteredAsc.length,
        wins: filteredAsc.filter(r => {
          const b = r.battles;
          return b && (
            (b.winner === 'a' && b.mc_a_id === params.id) ||
            (b.winner === 'b' && b.mc_b_id === params.id)
          );
        }).length,
        peak: filteredAsc.reduce((max, r) => Math.max(max, r.rating_after), 0),
      }
    : null;

  // 試合履歴（新しい順でページネーション）
  const sortedDesc = [...filteredAsc].reverse();
  const total = sortedDesc.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const battleHistory = sortedDesc.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rank = (allMcs ?? []).findIndex(m => m.id === params.id) + 1;
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-start gap-4 mb-8">
        {mc.image_url ? (
          <img src={mc.image_url} alt={mc.name} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-2xl font-bold text-gray-500">
            {mc.name[0]}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{mc.name}</h1>
          {mc.name_kana && <p className="text-gray-500 text-sm">{mc.name_kana}</p>}
          {mc.region && <p className="text-gray-400 text-sm mt-1">{mc.region}</p>}
        </div>
      </div>

      {/* ステータスカード */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">現在レート</p>
          <p className="text-2xl font-bold text-yellow-400">{Math.round(mc.current_rating)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">最高レート</p>
          <p className={`text-2xl font-bold ${peakRating <= Math.round(mc.current_rating) ? 'text-yellow-400' : 'text-blue-400'}`}>
            {Math.round(peakRating)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">ランキング</p>
          <p className="text-2xl font-bold">{rank > 0 ? `#${rank}` : '—'}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">勝率</p>
          <p className="text-2xl font-bold text-green-400">
            {mc.battle_count > 0 ? `${Math.round((mc.win_count / mc.battle_count) * 100)}%` : '—'}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">累計試合数</p>
          <p className="text-2xl font-bold">{mc.battle_count}</p>
        </div>
      </div>

      {/* プロフィール */}
      {mc.profile && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">プロフィール</h2>
          <p className="text-gray-300 text-sm leading-relaxed">{mc.profile}</p>
        </div>
      )}

      {/* レーティング推移グラフ */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">レーティング推移</h2>
        <div className="bg-gray-900 rounded-xl p-4">
          <RatingChart data={chartData} />
        </div>
      </div>

      {/* 試合履歴 */}
      <div>
        {/* ヘッダー行：タイトル＋年セレクター */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold">試合履歴</h2>
            <span className="text-sm text-gray-500">{selectedYear ? `${selectedYear}年 ${total}件` : `全${total}件`}</span>
          </div>
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">年:</span>
              <YearSelect mcId={params.id} currentYear={selectedYear} years={availableYears} />
            </div>
          )}
        </div>

        {/* 年別サマリー */}
        {yearStats && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">年間試合数</p>
              <p className="text-xl font-bold">{yearStats.battles}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">年間勝率</p>
              <p className="text-xl font-bold text-green-400">
                {yearStats.battles > 0 ? `${Math.round((yearStats.wins / yearStats.battles) * 100)}%` : '—'}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">年間ピーク</p>
              <p className="text-xl font-bold text-blue-400">{yearStats.peak > 0 ? Math.round(yearStats.peak) : '—'}</p>
            </div>
          </div>
        )}

        {total === 0 ? (
          <p className="text-gray-600 text-center py-8">
            {selectedYear ? `${selectedYear}年の試合データがありません` : '試合データがありません'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-left">
                    <th className="pb-3 pr-4">大会</th>
                    <th className="pb-3 pr-4">ラウンド</th>
                    <th className="pb-3 pr-4">勝敗</th>
                    <th className="pb-3 pr-4">対戦相手</th>
                    <th className="pb-3 text-right">レート変動</th>
                  </tr>
                </thead>
                <tbody>
                  {battleHistory.map(r => {
                    const isWin =
                      (r.battles?.winner === 'a' && r.battles?.mc_a_id === params.id) ||
                      (r.battles?.winner === 'b' && r.battles?.mc_b_id === params.id);
                    const isDraw = r.battles?.winner === 'draw';
                    const opponent =
                      r.battles?.mc_a_id === params.id
                        ? r.battles?.mc_b
                        : r.battles?.mc_a;
                    return (
                      <tr key={r.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
                        <td className="py-3 pr-4 text-gray-300">
                          {r.battles?.tournament_id ? (
                            <Link href={`/tournaments/${r.battles.tournament_id}`} className="hover:text-yellow-400 transition-colors">
                              {r.battles.tournaments?.name ?? '不明'}
                            </Link>
                          ) : (r.battles?.tournaments?.name ?? '不明')}
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{r.battles?.round_name ?? '—'}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isDraw ? 'bg-gray-700 text-gray-300' : isWin ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                          }`}>
                            {isDraw ? '△' : isWin ? '勝' : '敗'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">
                          {opponent ? (
                            <Link href={`/mc/${opponent.id}`} className="hover:text-yellow-400 transition-colors">
                              {opponent.name}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${r.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {r.delta >= 0 ? '+' : ''}{r.delta.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-gray-500">
                  {start}–{end} 件 / {total}件
                </span>
                <div className="flex items-center gap-1">
                  {page > 1 ? (
                    <Link href={buildUrl(params.id, page - 1, selectedYear)} className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                      ← 前
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-sm text-gray-700">← 前</span>
                  )}

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`e-${i}`} className="px-2 text-gray-600 text-sm">…</span>
                      ) : (
                        <Link
                          key={p}
                          href={buildUrl(params.id, p as number, selectedYear)}
                          className={`w-9 h-8 flex items-center justify-center text-sm rounded-lg transition-colors ${
                            p === page ? 'bg-yellow-400 text-gray-900 font-bold' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          }`}
                        >
                          {p}
                        </Link>
                      )
                    )}

                  {page < totalPages ? (
                    <Link href={buildUrl(params.id, page + 1, selectedYear)} className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                      次 →
                    </Link>
                  ) : (
                    <span className="px-3 py-1.5 text-sm text-gray-700">次 →</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
