import { createAdminClient } from '@/lib/supabase';
import BattleDeleteClient from './BattleDeleteClient';
import AdminNav from '../AdminNav';

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  approved_at: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
};

export default async function AdminBattlesPage() {
  const admin = createAdminClient();

  const { data: battles } = await admin
    .from('battles')
    .select('id, winner, round_name, approved_at, tournaments(name, held_on), mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name)')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(500);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="battles" />
      <h2 className="text-lg font-semibold mb-1">バトル管理</h2>
      <p className="text-gray-500 text-sm mb-6">
        チェックを入れて削除すると、レーティングが自動再計算されます
      </p>
      <BattleDeleteClient battles={(battles ?? []) as unknown as BattleRow[]} />
    </div>
  );
}
