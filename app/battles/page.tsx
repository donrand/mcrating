import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 60;

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
};

export default async function BattlesPage() {
  const { data: battles } = await supabase
    .from('battles')
    .select('*, tournaments(name, held_on), mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name)')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">試合結果一覧</h1>
      <p className="text-gray-500 text-sm mb-8">承認済みの試合結果</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="pb-3 pr-4">大会</th>
              <th className="pb-3 pr-4">開催日</th>
              <th className="pb-3 pr-4">対戦カード</th>
              <th className="pb-3 pr-4">勝者</th>
              <th className="pb-3">ラウンド</th>
            </tr>
          </thead>
          <tbody>
            {(battles ?? []).length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-gray-600">データがありません</td></tr>
            )}
            {(battles as unknown as BattleRow[] ?? []).map((b) => {
              const winner = b.winner === 'a' ? b.mc_a?.name : b.winner === 'b' ? b.mc_b?.name : '引き分け';
              return (
                <tr key={b.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
                  <td className="py-3 pr-4">{b.tournaments?.name}</td>
                  <td className="py-3 pr-4 text-gray-400 tabular-nums">{b.tournaments?.held_on}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/mc/${b.mc_a?.id}`} className="hover:text-yellow-400">{b.mc_a?.name}</Link>
                    <span className="text-gray-600 mx-2">vs</span>
                    <Link href={`/mc/${b.mc_b?.id}`} className="hover:text-yellow-400">{b.mc_b?.name}</Link>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-yellow-400">{winner}</td>
                  <td className="py-3 text-gray-400">{b.round_name ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
