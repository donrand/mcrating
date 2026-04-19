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
export async function recalculateAllRatings(): Promise<{ ok: boolean; message: string; details?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[recalculate] auth error:', msg);
    return { ok: false, message: '認証エラー', details: msg };
  }

  const admin = createAdminClient();

  let result: { data: unknown; error: { message: string; code?: string; details?: string; hint?: string } | null };
  try {
    result = await admin.rpc('recalculate_all_ratings') as typeof result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[recalculate] rpc call threw exception:', msg);
    return { ok: false, message: 'RPC呼び出し例外', details: msg };
  }

  if (result.error) {
    const { message, code, details, hint } = result.error;
    console.error('[recalculate] rpc error:', { message, code, details, hint });
    return {
      ok: false,
      message: message,
      details: [code && `code: ${code}`, details && `details: ${details}`, hint && `hint: ${hint}`]
        .filter(Boolean).join(' / ') || undefined,
    };
  }

  console.log('[recalculate] success:', result.data);

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments', 'layout');
  revalidatePath('/mc', 'layout');

  return { ok: true, message: `再計算完了 (${JSON.stringify(result.data)})` };
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
