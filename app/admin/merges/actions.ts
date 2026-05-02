'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

export async function addMergeRule(canonicalName: string, aliasName: string) {
  await requireAdmin();
  const c = canonicalName.trim();
  const a = aliasName.trim();
  if (!c || !a) throw new Error('名前を入力してください');
  if (c === a) throw new Error('正名義と別名義が同じです');

  const admin = createAdminClient();
  const { error } = await admin
    .from('mc_merge_rules')
    .insert({ canonical_name: c, alias_name: a });
  if (error) {
    if (error.code === '23505') throw new Error('同じルールがすでに存在します');
    throw new Error('追加に失敗しました: ' + error.message);
  }
  revalidatePath('/admin/merges');
}

export async function deleteMergeRule(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from('mc_merge_rules').delete().eq('id', id);
  revalidatePath('/admin/merges');
}
