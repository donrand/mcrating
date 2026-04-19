import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import CorrectionsClient from './CorrectionsClient';

export const dynamic = 'force-dynamic';

export default async function CorrectionsPage() {
  const admin = createAdminClient();

  // 未処理の報告を取得（バトル情報もjoin）
  const { data: corrections } = await admin
    .from('battle_corrections')
    .select('id, battle_id, description, suggested_winner, suggested_round, evidence_url, submitted_at')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  // バトル詳細を別途取得してマージ
  const battleIds = Array.from(new Set((corrections ?? []).map(c => c.battle_id)));
  const { data: battles } = battleIds.length > 0
    ? await admin
        .from('battles')
        .select('id, winner, round_name, tournament_id, mc_a_id, mc_b_id, tournaments(name, held_on), mc_a:mcs!battles_mc_a_id_fkey(name), mc_b:mcs!battles_mc_b_id_fkey(name)')
        .in('id', battleIds)
    : { data: [] };

  type BattleData = {
    id: string; winner: string; round_name: string | null;
    tournaments: { name: string; held_on: string | null } | null;
    mc_a: { name: string } | null;
    mc_b: { name: string } | null;
  };

  const battleMap = new Map(
    ((battles ?? []) as unknown as BattleData[]).map(b => [b.id, b])
  );

  const rows = (corrections ?? []).map(c => {
    const b = battleMap.get(c.battle_id);
    return {
      ...c,
      suggested_winner: c.suggested_winner as 'a' | 'b' | 'draw' | null,
      battle: b ? {
        winner: b.winner,
        round_name: b.round_name,
        tournament_name: b.tournaments?.name ?? null,
        held_on: b.tournaments?.held_on ?? null,
        mc_a_name: b.mc_a?.name ?? null,
        mc_b_name: b.mc_b?.name ?? null,
      } : null,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="corrections" />
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-semibold">誤り報告</h2>
        {rows.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {rows.length}
          </span>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-6">
        修正を適用した後は「バトル管理」→「全再計算を実行」でレーティングに反映してください
      </p>
      <CorrectionsClient corrections={rows} />
    </div>
  );
}
