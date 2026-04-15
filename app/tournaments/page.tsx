import { supabase } from '@/lib/supabase';

export const revalidate = 60;

const CATEGORY_COLORS: Record<string, string> = {
  主要: 'bg-yellow-900 text-yellow-400',
  地方: 'bg-blue-900 text-blue-400',
  地下: 'bg-gray-800 text-gray-400',
};

export default async function TournamentsPage() {
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('held_on', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">大会一覧</h1>
      <p className="text-gray-500 text-sm mb-8">登録済み大会と大会格係数</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="pb-3 pr-4">大会名</th>
              <th className="pb-3 pr-4">開催日</th>
              <th className="pb-3 pr-4">カテゴリ</th>
              <th className="pb-3 text-right">大会格係数</th>
            </tr>
          </thead>
          <tbody>
            {(tournaments ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-12 text-center text-gray-600">データがありません</td></tr>
            )}
            {(tournaments ?? []).map((t) => (
              <tr key={t.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
                <td className="py-3 pr-4 font-medium">{t.name}</td>
                <td className="py-3 pr-4 text-gray-400 tabular-nums">{t.held_on ?? '—'}</td>
                <td className="py-3 pr-4">
                  {t.category ? (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${CATEGORY_COLORS[t.category] ?? 'bg-gray-800 text-gray-400'}`}>
                      {t.category}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 text-right font-mono font-bold text-yellow-400">
                  {t.grade_coeff.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
