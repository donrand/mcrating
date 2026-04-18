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

  const nameToRow = new Map(
    (tournaments ?? []).map(t => [t.name.trim(), t])
  );

  // マスターリストを使ってカテゴリ別にグルーピング
  const categories: CategoryGroup[] = [];

  for (const cat of TOURNAMENT_MASTER) {
    const rows: TournamentRow[] = [];

    for (const t of cat.tournaments) {
      if (!t.supabaseName) continue;
      const row = nameToRow.get(t.supabaseName);
      if (!row) continue;
      rows.push({
        id: row.id,
        name: row.name,
        held_on: row.held_on,
        grade_coeff: row.grade_coeff,
        displayName: t.displayName,
      });
    }

    if (rows.length > 0) {
      categories.push({ id: cat.id, label: cat.label, tournaments: rows });
    }
  }

  // マスターに載っていない大会は「その他」へ
  const masterNames = new Set(
    TOURNAMENT_MASTER.flatMap(c => c.tournaments)
      .map(t => t.supabaseName)
      .filter(Boolean) as string[]
  );
  const others: TournamentRow[] = (tournaments ?? [])
    .filter(t => !masterNames.has(t.name.trim()))
    .map(t => ({
      id: t.id,
      name: t.name,
      held_on: t.held_on,
      grade_coeff: t.grade_coeff,
      displayName: t.name,
    }));
  if (others.length > 0) {
    categories.push({ id: 'other', label: 'その他', tournaments: others });
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
