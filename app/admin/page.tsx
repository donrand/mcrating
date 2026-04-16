import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import AdminReviewClient from './AdminReviewClient';
import LogoutButton from './LogoutButton';
import AdminNav from './AdminNav';

export default async function AdminPage() {
  const serverClient = createSupabaseServerClient();
  const { data: { user } } = await serverClient.auth.getUser();

  const admin = createAdminClient();

  const { data: submissions } = await admin
    .from('submissions')
    .select('*')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  const { data: mcs } = await admin
    .from('mcs')
    .select('id, name')
    .order('name');

  const { data: tournaments } = await admin
    .from('tournaments')
    .select('id, name, grade_coeff')
    .order('held_on', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{user?.email}</span>
          <LogoutButton />
        </div>
      </div>
      <AdminNav active="review" />
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-semibold">投稿レビュー</h2>
        {(submissions?.length ?? 0) > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {submissions!.length}
          </span>
        )}
      </div>
      <AdminReviewClient
        submissions={submissions ?? []}
        mcs={mcs ?? []}
        tournaments={tournaments ?? []}
      />
    </div>
  );
}
