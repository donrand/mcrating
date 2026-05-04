import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import TierClient, { type CategoryGroup, type TournamentTierRow } from './TierClient';
import { TOURNAMENT_MASTER } from '@/data/tournament_master';
import type { TierLabel } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export default async function CoefficientsPage() {
  const admin = createAdminClient();

  const { data: tournaments } = await admin
    .from('tournaments')
    .select('id, name, held_on, grade_coeff, auto_tier, manual_tier, final_tier, tier_locked, tier_t, tier_y, tier_sigma_y, tier_z, tier_calc_version');

  const { data: logs } = await admin
    .from('tournament_tier_logs')
    .select('id, tournament_id, changed_at, prev_manual_tier, new_manual_tier, reason, auto_tier, final_tier')
    .order('changed_at', { ascending: false })
    .limit(200);

  // 名前照合マップ
  const nameToRow = new Map(
    (tournaments ?? []).map(t => [t.name.trim().toLowerCase(), t])
  );

  // ログをtournament_idでグループ化
  const logsByTournamentId = new Map<string, typeof logs>();
  for (const log of logs ?? []) {
    const list = logsByTournamentId.get(log.tournament_id) ?? [];
    list.push(log);
    logsByTournamentId.set(log.tournament_id, list);
  }

  const categories: CategoryGroup[] = [];

  for (const cat of TOURNAMENT_MASTER) {
    const rows: TournamentTierRow[] = [];

    for (const t of cat.tournaments) {
      if (t.status === 'excluded') continue;
      const row = t.supabaseName
        ? nameToRow.get(t.supabaseName.trim().toLowerCase())
        : undefined;

      rows.push({
        id: row?.id ?? null,
        displayName: t.displayName,
        held_on: row?.held_on ?? t.heldOn ?? null,
        inMaster: t.status === 'registered' || t.status === 'partial',
        registered: !!row,
        auto_tier: (row?.auto_tier ?? null) as TierLabel | null,
        manual_tier: (row?.manual_tier ?? null) as TierLabel | null,
        final_tier: (row?.final_tier ?? null) as TierLabel | null,
        grade_coeff: row?.grade_coeff ?? 1.0,
        tier_locked: row?.tier_locked ?? false,
        tier_t: row?.tier_t ?? null,
        tier_y: row?.tier_y ?? null,
        tier_sigma_y: row?.tier_sigma_y ?? null,
        tier_z: row?.tier_z ?? null,
        logs: (row?.id ? (logsByTournamentId.get(row.id) ?? []) : []) as TournamentTierRow['logs'],
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
      <h2 className="text-lg font-semibold mb-1">大会ティア管理</h2>
      <p className="text-gray-500 text-sm mb-6">
        ティアはレーティング再計算時に自動算出されます（A=1.15倍 / B=1.00倍 / C=0.90倍）。
        手動上書きは再計算後も保持されます。
      </p>
      <TierClient categories={categories} />
    </div>
  );
}
