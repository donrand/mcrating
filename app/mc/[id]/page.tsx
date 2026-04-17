import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import RatingChart from '@/components/RatingChart';

export const revalidate = 60;

const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];

type Props = { params: { id: string } };

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
    tournaments: { name: string; held_on: string | null } | null;
  } | null;
};

export default async function MCProfilePage({ params }: Props) {
  const [{ data: mc }, { data: ratings }] = await Promise.all([
    supabase.from('mcs').select('*').eq('id', params.id).single(),
    supabase
      .from('ratings')
      .select('*, battles(winner, round_name, tournament_id, mc_a_id, mc_b_id, tournaments(name, held_on))')
      .eq('mc_id', params.id),
  ]);

  if (!mc) notFound();

  // 時系列ソート: held_on → ROUND_ORDER
  const sortedRatings = [...(ratings as unknown as RatingRow[] ?? [])].sort((a, b) => {
    const dateA = a.battles?.tournaments?.held_on ?? '';
    const dateB = b.battles?.tournaments?.held_on ?? '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const roundA = ROUND_ORDER.indexOf(a.battles?.round_name ?? '');
    const roundB = ROUND_ORDER.indexOf(b.battles?.round_name ?? '');
    return (roundA === -1 ? 999 : roundA) - (roundB === -1 ? 999 : roundB);
  });

  // レーティング推移データ（時系列順）
  const chartData = sortedRatings.map((r) => ({
    date: r.battles?.tournaments?.held_on?.slice(0, 7) ?? '不明',
    rating: r.rating_after,
    opponent: '',
  }));

  // 試合履歴（直近20件・新しい順）
  const battleHistory = [...sortedRatings].reverse().slice(0, 20);

  // 順位を計算（全MCのレートと比較）
  const { data: allMcs } = await supabase
    .from('mcs')
    .select('id, current_rating')
    .eq('is_active', true)
    .order('current_rating', { ascending: false });

  const rank = (allMcs ?? []).findIndex(m => m.id === params.id) + 1;

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
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">現在レート</p>
          <p className="text-2xl font-bold text-yellow-400">{Math.round(mc.current_rating)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">ランキング</p>
          <p className="text-2xl font-bold">{rank > 0 ? `#${rank}` : '—'}</p>
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
        <h2 className="text-lg font-bold mb-4">試合履歴（直近{battleHistory.length}件）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="pb-3 pr-4">大会</th>
                <th className="pb-3 pr-4">ラウンド</th>
                <th className="pb-3 pr-4">勝敗</th>
                <th className="pb-3 text-right">レート変動</th>
              </tr>
            </thead>
            <tbody>
              {battleHistory.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-600">試合データがありません</td></tr>
              )}
              {battleHistory.map((r) => {
                const isWin =
                  (r.battles?.winner === 'a' && r.battles?.mc_a_id === params.id) ||
                  (r.battles?.winner === 'b' && r.battles?.mc_b_id === params.id);
                const isDraw = r.battles?.winner === 'draw';
                return (
                  <tr key={r.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
                    <td className="py-3 pr-4">{r.battles?.tournaments?.name ?? '不明'}</td>
                    <td className="py-3 pr-4 text-gray-400">{r.battles?.round_name ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isDraw ? 'bg-gray-700 text-gray-300' : isWin ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                      }`}>
                        {isDraw ? '△' : isWin ? '勝' : '敗'}
                      </span>
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
      </div>
    </div>
  );
}
