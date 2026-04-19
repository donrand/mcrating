'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

/**
 * キャッシュのみクリアする（SQL Editorで再計算した後に使用）
 */
export async function purgeCache() {
  await requireAdmin();
  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments', 'layout');
  revalidatePath('/mc', 'layout');
}

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

/**
 * 全承認済みバトルを時系列順に再計算してratings/mcsを更新する（手動トリガー用）
 * 計算は Supabase の PostgreSQL 関数 recalculate_all_ratings() で実行される。
 * タイムアウトなし・データ量無制限。
 */
export async function recalculateAllRatings() {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.rpc('recalculate_all_ratings');
  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments', 'layout');
  revalidatePath('/mc', 'layout');
}

/**
 * 選択されたバトルを削除する（レーティング再計算は行わない）
 */
export async function deleteBattles(battleIds: string[]) {
  if (battleIds.length === 0) return;
  await requireAdmin();
  const admin = createAdminClient();

  // ratingsを先に削除（FK制約のため）
  await admin.from('ratings').delete().in('battle_id', battleIds);

  // battlesを削除
  await admin.from('battles').delete().in('id', battleIds);

  revalidatePath('/admin/battles');
}
