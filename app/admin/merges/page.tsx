import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import MergesClient from './MergesClient';
import type { McaMergeRule } from '@/lib/supabase';

export const metadata: Metadata = { title: 'MC名義統合 | 管理画面' };
export const dynamic = 'force-dynamic';

export default async function MergesPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('mc_merge_rules')
    .select('id, canonical_name, alias_name, created_at')
    .order('canonical_name')
    .order('alias_name');

  const rules = (data ?? []) as McaMergeRule[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="merges" />
      <h2 className="text-lg font-semibold mb-1">MC名義統合</h2>
      <p className="text-gray-500 text-sm mb-6">
        別名義を正名義へ統合するルールを管理します。全再計算の実行時に自動で統合が適用されます。
      </p>
      <MergesClient rules={rules} />
    </div>
  );
}
