'use client';

import Link from 'next/link';
import ReportButton from '@/components/ReportButton';

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

type Props = {
  battles: BattleRow[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
};

function buildUrl(page: number, q: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/battles${qs ? `?${qs}` : ''}`;
}

export default function BattlesClient({ battles, total, page, totalPages, q }: Props) {
  const start = total === 0 ? 0 : (page - 1) * 50 + 1;
  const end = Math.min(page * 50, total);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">登録履歴</h1>
      <p className="text-gray-500 text-sm mb-6">
        承認済みバトル {total.toLocaleString()} 件（新しい順）
      </p>

      {/* 検索 */}
      <form action="/battles" method="GET" className="mb-6 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="MC名で検索..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
        />
        {q && (
          <Link
            href="/battles"
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            クリア
          </Link>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors"
        >
          検索
        </button>
      </form>

      {q && (
        <p className="text-xs text-gray-500 mb-4">
          「{q}」の検索結果: {total.toLocaleString()} 件
        </p>
      )}

      {battles.length === 0 ? (
        <p className="text-gray-600 text-center py-16">データがありません</p>
      ) : (
        <>
          {/* バトルリスト */}
          <div className="space-y-2 mb-8">
            {battles.map(b => {
              const deltaA = b.ratings.find(r => r.mc_id === b.mc_a?.id);
              const deltaB = b.ratings.find(r => r.mc_id === b.mc_b?.id);

              return (
                <div key={b.id} className="bg-gray-900 rounded-lg px-4 py-3">
                  {/* 大会・ラウンド・開催日 */}
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
                    <ReportButton
                      battleId={b.id}
                      mcAName={b.mc_a?.name ?? 'MC A'}
                      mcBName={b.mc_b?.name ?? 'MC B'}
                    />
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

                    <div className="flex items-center text-xs text-gray-600 shrink-0">vs</div>

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

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">
                {start}–{end} 件 / 全{total.toLocaleString()}件
              </span>
              <div className="flex items-center gap-1">
                {/* 前へ */}
                {page > 1 ? (
                  <Link
                    href={buildUrl(page - 1, q)}
                    className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    ← 前
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-sm text-gray-700 rounded-lg">← 前</span>
                )}

                {/* ページ番号 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-600 text-sm">…</span>
                    ) : (
                      <Link
                        key={p}
                        href={buildUrl(p as number, q)}
                        className={`w-9 h-8 flex items-center justify-center text-sm rounded-lg transition-colors ${
                          p === page
                            ? 'bg-yellow-400 text-gray-900 font-bold'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  )}

                {/* 次へ */}
                {page < totalPages ? (
                  <Link
                    href={buildUrl(page + 1, q)}
                    className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    次 →
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-sm text-gray-700 rounded-lg">次 →</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
