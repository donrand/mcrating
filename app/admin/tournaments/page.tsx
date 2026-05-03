export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import TournamentsClient from './TournamentsClient';

export default async function AdminTournamentsPage() {
  const admin = createAdminClient();

  const { data: tournaments } = await admin
    .from('tournaments')
    .select('id, name, held_on, grade_coeff')
    .order('held_on', { ascending: false });

  // バトル数を集計
  const { data: battleCounts } = await admin
    .from('battles')
    .select('tournament_id')
    .eq('status', 'approved');

  const countMap = new Map<string, number>();
  for (const b of battleCounts ?? []) {
    const tid = (b as { tournament_id: string }).tournament_id;
    countMap.set(tid, (countMap.get(tid) ?? 0) + 1);
  }

  type TRow = { id: string; name: string; held_on: string | null; grade_coeff: number };
  const rows = ((tournaments ?? []) as unknown as TRow[]).map(t => ({
    ...t,
    battle_count: countMap.get(t.id) ?? 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="tournaments" />
      <h2 className="text-lg font-semibold mb-1">大会管理</h2>
      <p className="text-gray-500 text-sm mb-6">
        大会を削除すると、その大会の全バトルとレーティング変動も削除されます。削除後は全再計算を実行してください。
      </p>
      <TournamentsClient tournaments={rows} />
    </div>
  );
}
