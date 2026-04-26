import { createAdminClient } from '@/lib/supabase';
import Link from 'next/link';
import { TOURNAMENT_MASTER } from '@/data/tournament_master';

export const revalidate = 3600;

function extractYear(heldOn: string): number {
  return parseInt(heldOn.slice(0, 4), 10);
}

export default async function TournamentsPage() {
  const admin = createAdminClient();

  const { data: supabaseTournaments } = await admin
    .from('tournaments')
    .select('id, name');

  const registeredNames = new Map<string, string>(
    (supabaseTournaments ?? []).map(t => [t.name.trim(), t.id])
  );

  // 登録済みのみフラット化してカテゴリ情報を付与
  const registered = TOURNAMENT_MASTER.flatMap(category =>
    category.tournaments
      .filter(t => t.supabaseName && registeredNames.has(t.supabaseName))
      .map(t => ({ ...t, categoryLabel: category.label, supaId: registeredNames.get(t.supabaseName!)! }))
  );

  // heldOn で降順ソート（新しい順）
  const sorted = registered.slice().sort((a, b) => {
    const da = a.heldOn.padEnd(10, '-99');
    const db = b.heldOn.padEnd(10, '-99');
    return db.localeCompare(da);
  });

  // 年ごとにグループ化
  const byYear = sorted.reduce<Record<number, typeof sorted>>((acc, t) => {
    const year = extractYear(t.heldOn);
    if (!acc[year]) acc[year] = [];
    acc[year].push(t);
    return acc;
  }, {});

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">大会一覧</h1>
      <p className="text-gray-500 text-sm mb-2">{sorted.length} 大会収録</p>

      <div className="space-y-8 mt-6">
        {years.map(year => (
          <section key={year}>
            <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">{year}</h2>
              <span className="text-xs text-gray-600">{byYear[year].length}件</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {byYear[year].map(t => (
                <Link key={t.key} href={`/tournaments/${t.supaId}`}>
                  <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border text-sm bg-gray-900 border-gray-700 hover:border-green-700 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-600 shrink-0">{t.categoryLabel}</span>
                      <span className="font-medium text-white">{t.displayName}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
