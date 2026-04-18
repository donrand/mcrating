'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

/** 個別の大会格係数を更新する */
export async function updateTournamentCoeff(id: string, coeff: number) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('tournaments')
    .update({ grade_coeff: coeff })
    .eq('id', id);
  if (error) throw new Error('更新に失敗しました: ' + error.message);
  revalidatePath('/admin/coefficients');
  revalidatePath('/tournaments');
}

/** カテゴリ内の複数大会の格係数を一括更新する */
export async function updateCategoryCoeff(ids: string[], coeff: number) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('tournaments')
    .update({ grade_coeff: coeff })
    .in('id', ids);
  if (error) throw new Error('一括更新に失敗しました: ' + error.message);
  revalidatePath('/admin/coefficients');
  revalidatePath('/tournaments');
}
