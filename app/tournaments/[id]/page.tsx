import { createAdminClient } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];

type Props = { params: { id: string } };

export default async function TournamentDetailPage({ params }: Props) {
  const admin = createAdminClient();

  const [{ data: tournament }, { data: battles }] = await Promise.all([
    admin.from('tournaments').select('id, name, grade_coeff, held_on').eq('id', params.id).single(),
    admin
      .from('battles')
      .select('id, winner, round_name, mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name)')
      .eq('tournament_id', params.id)
      .eq('status', 'approved'),
  ]);

  if (!tournament) notFound();

  // ラウンド順にソート
  const sorted = (battles ?? []).slice().sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a.round_name ?? '');
    const rb = ROUND_ORDER.indexOf(b.round_name ?? '');
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  // ラウンドごとにグループ化
  const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, b) => {
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
          <span>大会格係数 <span className="text-yellow-400 font-bold">{Number(tournament.grade_coeff).toFixed(1)}</span></span>
          <span>{sorted.length}バトル</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-600 text-center py-16">登録済みバトルがありません</p>
      ) : (
        <div className="space-y-6">
          {rounds.map(round => (
            <div key={round}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-gray-800">
                {round}
              </h2>
              <div className="space-y-1">
                {grouped[round].map(b => {
                  const mcA = (b.mc_a as unknown as { id: string; name: string } | null);
                  const mcB = (b.mc_b as unknown as { id: string; name: string } | null);
                  const winnerName =
                    b.winner === 'a' ? mcA?.name :
                    b.winner === 'b' ? mcB?.name :
                    '引き分け';
                  return (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg">
                      <span className={`text-sm font-medium ${b.winner === 'a' ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {mcA ? (
                          <Link href={`/mc/${mcA.id}`} className="hover:underline">{mcA.name}</Link>
                        ) : '—'}
                      </span>
                      <span className="text-gray-600 text-xs">vs</span>
                      <span className={`text-sm font-medium ${b.winner === 'b' ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {mcB ? (
                          <Link href={`/mc/${mcB.id}`} className="hover:underline">{mcB.name}</Link>
                        ) : '—'}
                      </span>
                      <span className="ml-auto text-xs text-gray-500">
                        勝者: <span className="text-yellow-400">{winnerName}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
