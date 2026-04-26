import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import SeriesClient from './SeriesClient';

export const revalidate = 0;

export default async function SeriesPage() {
  const { data } = await createAdminClient()
    .from('series')
    .select('name')
    .order('name');

  const series = (data ?? []).map(r => r.name);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="series" />
      <h2 className="text-lg font-semibold mb-6">シリーズ管理</h2>
      <SeriesClient series={series} />
    </div>
  );
}
