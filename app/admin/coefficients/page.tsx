import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import CoefficientClient, { type CategoryGroup, type TournamentRow } from './CoefficientClient';
import { TOURNAMENT_MASTER } from '@/data/tournament_master';

export const dynamic = 'force-dynamic';

export default async function CoefficientsPage() {
  const admin = createAdminClient();

  const { data: tournaments } = await admin
    .from('tournaments')
    .select('id, name, held_on, grade_coeff');

  // 大文字小文字・前後スペントを無視して照合するためlowercaseキーで管理
  const nameToRow = new Map(
    (tournaments ?? []).map(t => [t.name.trim().toLowerCase(), t])
  );

  // マスターリストを使ってカテゴリ別にグルーピング（大会一覧と同じスコープ）
  const categories: CategoryGroup[] = [];

  for (const cat of TOURNAMENT_MASTER) {
    const rows: TournamentRow[] = [];

    for (const t of cat.tournaments) {
      if (t.status === 'excluded') continue;
      const row = t.supabaseName
        ? nameToRow.get(t.supabaseName.trim().toLowerCase())
        : undefined;
      rows.push({
        id: row?.id ?? null,
        name: row?.name ?? t.supabaseName ?? t.displayName,
        held_on: row?.held_on ?? t.heldOn ?? null,
        grade_coeff: row?.grade_coeff ?? 1.0,
        displayName: t.displayName,
        registered: !!row,
      });
    }

    categories.push({ id: cat.id, label: cat.label, tournaments: rows });
  }


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="coefficients" />
      <h2 className="text-lg font-semibold mb-1">大会格係数管理</h2>
      <p className="text-gray-500 text-sm mb-6">
        格係数を変更後、「全再計算を実行」でレーティングに反映してください
      </p>
      <CoefficientClient categories={categories} />
    </div>
  );
}
