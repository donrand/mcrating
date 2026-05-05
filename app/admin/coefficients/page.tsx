import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import TierClient, { type SeriesRow } from './TierClient';
import type { TierLabel } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export default async function CoefficientsPage() {
  const admin = createAdminClient();

  const { data: tournaments } = await admin
    .from('tournaments')
    .select('series, manual_tier, grade_coeff, auto_tier');

  // シリーズ単位に集計
  const seriesMap = new Map<string, SeriesRow>();

  for (const t of tournaments ?? []) {
    const key = t.series ?? '（未タグ）';
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        series: key,
        manual_tier: (t.manual_tier ?? null) as TierLabel | null,
        grade_coeff: t.grade_coeff ?? 1.0,
        registered_count: 0,
        auto_a: 0,
        auto_b: 0,
        auto_c: 0,
      });
    }
    const row = seriesMap.get(key)!;
    row.registered_count++;
    if (t.auto_tier === 'A') row.auto_a++;
    else if (t.auto_tier === 'B') row.auto_b++;
    else if (t.auto_tier === 'C') row.auto_c++;
  }

  // manual_tier → A / B / C / null の順に並び替え
  const tierOrder = (t: TierLabel | null) =>
    t === 'A' ? 0 : t === 'B' ? 1 : t === 'C' ? 2 : 3;

  const seriesList = Array.from(seriesMap.values()).sort((a, b) => {
    const d = tierOrder(a.manual_tier) - tierOrder(b.manual_tier);
    return d !== 0 ? d : a.series.localeCompare(b.series, 'ja');
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="coefficients" />
      <h2 className="text-lg font-semibold mb-1">大会ティア管理</h2>
      <p className="text-gray-500 text-sm mb-6">
        シリーズ単位でティアを設定します。変更後は「全再計算を実行」でレーティングに反映してください。
      </p>
      <TierClient seriesList={seriesList} />
    </div>
  );
}
