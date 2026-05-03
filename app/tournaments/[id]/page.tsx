import { createAdminClient } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReportButton from '@/components/ReportButton';
import TournamentBracket, { type BracketBattle } from './TournamentBracket';
import { ROUND_ORDER } from '@/lib/rounds';

export const revalidate = 3600;

type Props = { params: { id: string } };
type McInfo = { id: string; name: string };
type RatingRow = { mc_id: string; rating_before: number; rating_after: number; delta: number };
type Battle = {
  id: string;
  winner: string;
  round_name: string | null;
  mc_a: McInfo | null;
  mc_b: McInfo | null;
  ratings: RatingRow[];
};

function deltaColor(d: number) {
  if (d > 0) return 'text-green-400';
  if (d < 0) return 'text-red-400';
  return 'text-gray-500';
}

function sign(d: number) {
  return d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
}

// MC 別の大会内レーティング変動サマリを計算
function buildMcSummary(battles: Battle[]) {
  type McStat = {
    mc: McInfo;
    ratingBefore: number;
    ratingAfter: number;
    totalDelta: number;
    wins: number;
    losses: number;
    draws: number;
  };

  const map = new Map<string, McStat>();

  function upsert(mc: McInfo, r: RatingRow, side: 'a' | 'b', winner: string) {
    const existing = map.get(mc.id);
    const isWin = winner === side;
    const isDraw = winner === 'draw';
    if (!existing) {
      map.set(mc.id, {
        mc,
        ratingBefore: r.rating_before,
        ratingAfter: r.rating_after,
        totalDelta: r.delta,
        wins: isWin ? 1 : 0,
        losses: !isWin && !isDraw ? 1 : 0,
        draws: isDraw ? 1 : 0,
      });
    } else {
      existing.ratingAfter = r.rating_after;
      existing.totalDelta += r.delta;
      if (isWin) existing.wins++;
      else if (isDraw) existing.draws++;
      else existing.losses++;
    }
  }

  for (const b of battles) {
    const rA = b.ratings?.find(r => r.mc_id === b.mc_a?.id);
    const rB = b.ratings?.find(r => r.mc_id === b.mc_b?.id);
    if (b.mc_a && rA) upsert(b.mc_a, rA, 'a', b.winner);
    if (b.mc_b && rB) upsert(b.mc_b, rB, 'b', b.winner);
  }

  return Array.from(map.values()).sort((a, b) => b.totalDelta - a.totalDelta);
}

export default async function TournamentDetailPage({ params }: Props) {
  const admin = createAdminClient();

  const [{ data: tournament }, { data: raw }] = await Promise.all([
    admin.from('tournaments').select('id, name, grade_coeff, held_on').eq('id', params.id).single(),
    admin
      .from('battles')
      .select('id, winner, round_name, mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name), ratings(mc_id, rating_before, rating_after, delta)')
      .eq('tournament_id', params.id)
      .eq('status', 'approved'),
  ]);

  if (!tournament) notFound();

  const battles = (raw ?? []) as unknown as Battle[];

  // ラウンド順にソート
  const sorted = [...battles].sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a.round_name ?? '');
    const rb = ROUND_ORDER.indexOf(b.round_name ?? '');
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  // ラウンドごとにグループ化
  const grouped = sorted.reduce<Record<string, Battle[]>>((acc, b) => {
    const round = b.round_name ?? 'その他';
    if (!acc[round]) acc[round] = [];
    acc[round].push(b);
    return acc;
  }, {});

  const rounds = Object.keys(grouped).sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a);
    const rb = ROUND_ORDER.indexOf(b);
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  const hasRoundInfo = sorted.some(b => b.round_name && ROUND_ORDER.includes(b.round_name));
  const mcSummary = buildMcSummary(battles);
  const bracketBattles = sorted as unknown as BracketBattle[];

  return (
    <div>
      <div className="mb-6">
        <Link href="/tournaments" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← 大会一覧
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">{tournament.name}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {tournament.held_on && <span>{tournament.held_on}</span>}
          <span>格係数 <span className="text-yellow-400 font-bold">{Number(tournament.grade_coeff).toFixed(1)}</span></span>
          <span>{sorted.length}バトル</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-600 text-center py-16">登録済みバトルがありません</p>
      ) : (
        <div className="space-y-10">

          {/* ── トーナメント表 ───────────────────────────── */}
          {hasRoundInfo && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">トーナメント表</h2>
              <TournamentBracket battles={bracketBattles} />
            </section>
          )}

          {/* ── MC レーティング変動サマリ ────────────────── */}
          {mcSummary.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">参加MC レーティング変動</h2>
              <div className="border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900 text-gray-500 text-xs">
                      <th className="px-4 py-2 text-left font-medium">MC</th>
                      <th className="px-3 py-2 text-center font-medium">戦績</th>
                      <th className="px-3 py-2 text-right font-medium">開始</th>
                      <th className="px-3 py-2 text-right font-medium">終了</th>
                      <th className="px-3 py-2 text-right font-medium">変動</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mcSummary.map((s, i) => (
                      <tr key={s.mc.id} className={i % 2 === 0 ? 'bg-gray-900/50' : ''}>
                        <td className="px-4 py-2">
                          <Link href={`/mc/${s.mc.id}`} className="hover:text-yellow-300 transition-colors font-medium">
                            {s.mc.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-500">
                          {s.wins}勝{s.losses}敗{s.draws > 0 ? `${s.draws}分` : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-gray-500 font-mono">
                          {s.ratingBefore.toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-gray-400 font-mono">
                          {s.ratingAfter.toFixed(0)}
                        </td>
                        <td className={`px-3 py-2 text-right text-xs font-mono font-bold ${deltaColor(s.totalDelta)}`}>
                          {sign(s.totalDelta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── ラウンド別バトル一覧 ──────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">バトル一覧</h2>
            <div className="space-y-6">
              {rounds.map(round => (
                <div key={round}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-gray-800">
                    {round}
                  </h3>
                  <div className="border border-gray-700/60 rounded-xl overflow-hidden divide-y divide-gray-700/60">
                    {grouped[round].map(b => {
                      const mcA = b.mc_a;
                      const mcB = b.mc_b;
                      const ratingA = b.ratings?.find(r => r.mc_id === mcA?.id);
                      const ratingB = b.ratings?.find(r => r.mc_id === mcB?.id);
                      const winA = b.winner === 'a';
                      const winB = b.winner === 'b';
                      const isDraw = b.winner === 'draw';

                      return (
                        <div key={b.id} className="grid grid-cols-[1fr_auto_1fr] bg-gray-900">
                          {/* MC A */}
                          <div className={`flex items-center gap-2.5 px-4 py-3 ${winA ? 'bg-yellow-400/5' : ''}`}>
                            {winA && (
                              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded px-1 py-0.5 shrink-0">勝</span>
                            )}
                            {isDraw && (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-700/40 border border-gray-600/30 rounded px-1 py-0.5 shrink-0">分</span>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className={`text-sm font-medium truncate ${winA ? 'text-yellow-300' : 'text-slate-200'}`}>
                                {mcA ? (
                                  <Link href={`/mc/${mcA.id}`} className="hover:underline">{mcA.name}</Link>
                                ) : '—'}
                              </span>
                              {ratingA && (
                                <span className="text-xs text-gray-500 font-mono">
                                  {ratingA.rating_after.toFixed(0)}
                                  <span className={`ml-1 ${ratingA.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({sign(ratingA.delta)})
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* vs + report */}
                          <div className="flex flex-col items-center justify-center gap-1 px-3 border-x border-gray-700/40">
                            <span className="text-gray-600 text-xs font-medium">vs</span>
                            <ReportButton
                              battleId={b.id}
                              mcAName={mcA?.name ?? 'MC A'}
                              mcBName={mcB?.name ?? 'MC B'}
                            />
                          </div>

                          {/* MC B */}
                          <div className={`flex items-center justify-end gap-2.5 px-4 py-3 ${winB ? 'bg-yellow-400/5' : ''}`}>
                            <div className="flex flex-col items-end min-w-0">
                              <span className={`text-sm font-medium truncate ${winB ? 'text-yellow-300' : 'text-slate-200'}`}>
                                {mcB ? (
                                  <Link href={`/mc/${mcB.id}`} className="hover:underline">{mcB.name}</Link>
                                ) : '—'}
                              </span>
                              {ratingB && (
                                <span className="text-xs text-gray-500 font-mono">
                                  {ratingB.rating_after.toFixed(0)}
                                  <span className={`ml-1 ${ratingB.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({sign(ratingB.delta)})
                                  </span>
                                </span>
                              )}
                            </div>
                            {winB && (
                              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded px-1 py-0.5 shrink-0">勝</span>
                            )}
                            {isDraw && (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-700/40 border border-gray-600/30 rounded px-1 py-0.5 shrink-0">分</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-800">
        <a
          href={`/tournaments/${tournament.id}/csv`}
          download
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          ↓ CSV ダウンロード
        </a>
      </div>
    </div>
  );
}
