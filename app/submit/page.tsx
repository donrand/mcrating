import { supabase } from '@/lib/supabase';
import SubmitForm from '@/components/SubmitForm';
import BulkSubmitForm from '@/components/BulkSubmitForm';
import SubmitTabs from '@/components/SubmitTabs';

export default async function SubmitPage() {
  const [{ data: mcs }, { data: tournaments }] = await Promise.all([
    supabase.from('mcs').select('id, name').eq('is_active', true).order('name'),
    supabase.from('tournaments').select('id, name').order('held_on', { ascending: false }),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">試合結果の情報提供</h1>
      <p className="text-gray-500 text-sm mb-6">
        匿名で投稿できます。管理者が確認後、レーティングに反映されます。
      </p>
      <SubmitTabs
        mcs={mcs ?? []}
        tournaments={tournaments ?? []}
        singleForm={<SubmitForm mcs={mcs ?? []} tournaments={tournaments ?? []} />}
        bulkForm={<BulkSubmitForm mcs={mcs ?? []} tournaments={tournaments ?? []} />}
      />
    </div>
  );
}
