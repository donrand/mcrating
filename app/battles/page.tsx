import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 60;

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  approved_at: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
};

export default async function BattlesPage() {
  const { data: battles } = await supabase
    .from('battles')
    .select('id, winner, round_name, approved_at, tournaments(name, held_on), mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name)')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(200);

  const rows = (battles ?? []) as unknown as BattleRow[];

  // 日付ごとにグループ化
  const grouped = rows.reduce<Record<string, BattleRow[]>>((acc, b) => {
    const date = b.tournaments?.held_on ?? '日付不明';
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">登録履歴</h1>
      <p className="text-gray-500 text-sm mb-8">
        承認済みバトル {rows.length} 件
      </p>

      {rows.length === 0 && (
        <p className="text-gray-600 text-center py-16">データがありません</p>
      )}

      <div className="space-y-8">
        {sortedDates.map(date => (
          <div key={date}>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 pb-2 border-b border-gray-800">
              {date}
            </h2>
            <div className="space-y-2">
              {grouped[date].map(b => {
                const winnerName =
                  b.winner === 'a' ? b.mc_a?.name :
                  b.winner === 'b' ? b.mc_b?.name :
                  null;
                return (
                  <div
                    key={b.id}
                    className="bg-gray-900 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                  >
                    <span className="text-xs text-gray-500 w-28 shrink-0">
                      {b.tournaments?.name ?? '不明'}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Link
                        href={`/mc/${b.mc_a?.id}`}
                        className={`font-semibold hover:text-yellow-400 transition-colors truncate ${b.winner === 'a' ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        {b.mc_a?.name}
                      </Link>
                      <span className="text-gray-600 shrink-0">vs</span>
                      <Link
                        href={`/mc/${b.mc_b?.id}`}
                        className={`font-semibold hover:text-yellow-400 transition-colors truncate ${b.winner === 'b' ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        {b.mc_b?.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {b.winner === 'draw' ? (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-bold">引き分け</span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          勝者: <span className="text-yellow-400 font-semibold">{winnerName}</span>
                        </span>
                      )}
                      {b.round_name && (
                        <span className="text-xs text-gray-600">{b.round_name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
