import { createAdminClient } from '@/lib/supabase';
import AdminNav from '../AdminNav';
import RegisterClient from './RegisterClient';

export default async function RegisterPage() {
  const admin = createAdminClient();

  const [{ data: mcs }, { data: tournaments }] = await Promise.all([
    admin.from('mcs').select('id, name').order('name'),
    admin.from('tournaments').select('id, name, held_on, grade_coeff').order('held_on', { ascending: false }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="register" />
      <h2 className="text-lg font-semibold mb-6">バトル一括登録</h2>
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
