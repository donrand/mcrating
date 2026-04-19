import { createAdminClient } from '@/lib/supabase';
import Link from 'next/link';
import { TOURNAMENT_MASTER } from '@/data/tournament_master';

export const revalidate = 3600;

type StatusBadgeProps = { status: string; registered: boolean };

function StatusBadge({ status, registered }: StatusBadgeProps) {
  if (status === 'excluded') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-600 border border-gray-700">
        対象外
      </span>
    );
  }
  if (registered) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/60 text-green-400 border border-green-800">
        登録済
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-500 border border-yellow-800/50">
        部分的
      </span>
    );
  }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-900 text-gray-600 border border-gray-800">
      未収録
    </span>
  );
}

export default async function TournamentsPage() {
  const admin = createAdminClient();

  // Supabase に登録されている大会名のセット（マッチング用）
  const { data: supabaseTournaments } = await admin
    .from('tournaments')
    .select('id, name');

  const registeredNames = new Map<string, string>(
    (supabaseTournaments ?? []).map(t => [t.name.trim(), t.id])
  );

  // 集計
  const total = TOURNAMENT_MASTER.flatMap(c => c.tournaments).length;
  const registeredCount = TOURNAMENT_MASTER.flatMap(c => c.tournaments)
    .filter(t => t.supabaseName && registeredNames.has(t.supabaseName)).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">大会一覧</h1>
      <p className="text-gray-500 text-sm mb-2">主要大会の収録状況</p>

      {/* 全体サマリ */}
      <div className="flex gap-4 mb-8 text-sm">
        <span className="text-green-400 font-semibold">{registeredCount} 登録済</span>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400">{total} 大会</span>
      </div>

      {/* カテゴリ別 */}
      <div className="space-y-10">
        {TOURNAMENT_MASTER.map(category => {
          const catRegistered = category.tournaments.filter(
            t => t.supabaseName && registeredNames.has(t.supabaseName)
          ).length;
          const catTotal = category.tournaments.filter(t => t.status !== 'excluded').length;

          return (
            <section key={category.id}>
              {/* カテゴリヘッダー */}
              <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white">{category.label}</h2>
                <span className="text-xs text-gray-500">{category.description}</span>
                <span className="ml-auto text-xs text-gray-500">
                  <span className="text-green-400 font-semibold">{catRegistered}</span>
                  <span className="text-gray-700"> / {catTotal}</span>
                </span>
              </div>

              {/* トーナメント一覧（横並びグリッド） */}
              <div className="flex flex-wrap gap-2">
                {category.tournaments.map(t => {
                  const supaId = t.supabaseName ? registeredNames.get(t.supabaseName) : undefined;
                  const isRegistered = !!supaId;

                  const isPartialWithData = t.status === 'partial' && !!supaId;
                  const isLinkable = (isRegistered || isPartialWithData) && !!supaId;

                  const content = (
                    <div
                      className={`flex flex-col gap-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        t.status === 'excluded'
                          ? 'bg-gray-900/30 border-gray-800/50 opacity-50'
                          : isRegistered
                          ? 'bg-gray-900 border-gray-700 hover:border-green-700'
                          : isPartialWithData
                          ? 'bg-gray-900 border-yellow-900/50 hover:border-yellow-700'
                          : 'bg-gray-900/50 border-gray-800'
                      }`}
                    >
                      <span className={`font-medium ${isLinkable ? 'text-white' : 'text-gray-500'}`}>
                        {t.displayName}
                      </span>
                      <StatusBadge status={t.status} registered={isRegistered} />
                    </div>
                  );

                  return isLinkable && supaId ? (
                    <Link key={t.key} href={`/tournaments/${supaId}`}>
                      {content}
                    </Link>
                  ) : (
                    <div key={t.key}>{content}</div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
