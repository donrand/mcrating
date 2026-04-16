import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import AdminReviewClient from './AdminReviewClient';
import LogoutButton from './LogoutButton';
import Link from 'next/link';

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
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold">管理画面 — 投稿レビュー</h1>
        {(submissions?.length ?? 0) > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {submissions!.length}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          <Link href="/admin/battles" className="text-sm text-gray-400 hover:text-white transition-colors">
            バトル管理
          </Link>
          <span className="text-xs text-gray-500">{user?.email}</span>
          <LogoutButton />
        </div>
      </div>
      <AdminReviewClient
        submissions={submissions ?? []}
        mcs={mcs ?? []}
        tournaments={tournaments ?? []}
      />
    </div>
  );
}
