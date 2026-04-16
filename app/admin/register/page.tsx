import { createAdminClient } from '@/lib/supabase';
import Link from 'next/link';
import RegisterClient from './RegisterClient';

export default async function RegisterPage() {
  const admin = createAdminClient();

  const [{ data: mcs }, { data: tournaments }] = await Promise.all([
    admin.from('mcs').select('id, name').order('name'),
    admin.from('tournaments').select('id, name, held_on, grade_coeff').order('held_on', { ascending: false }),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-600 hover:text-white transition-colors text-sm">
          ← 投稿レビュー
        </Link>
        <h1 className="text-2xl font-bold">バトル一括登録</h1>
      </div>
      <RegisterClient
        mcs={mcs ?? []}
        tournaments={(tournaments ?? []).map(t => ({
          ...t,
          held_on: t.held_on ?? null,
        }))}
      />
    </div>
  );
}
