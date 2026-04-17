import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 60;

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
              <th className="pb-3 text-right">大会格係数</th>
            </tr>
          </thead>
          <tbody>
            {(tournaments ?? []).length === 0 && (
              <tr><td colSpan={3} className="py-12 text-center text-gray-600">データがありません</td></tr>
            )}
            {(tournaments ?? []).map((t) => (
              <tr key={t.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
                <td className="py-3 pr-4 font-medium">
                  <Link href={`/tournaments/${t.id}`} className="hover:text-yellow-400 transition-colors">
                    {t.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-gray-400 tabular-nums">{t.held_on ?? '—'}</td>
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
