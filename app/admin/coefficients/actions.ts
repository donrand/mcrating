'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { type TierLabel } from '@/lib/rating';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
  return user;
}

/** シリーズ単位で manual_tier を更新（grade_coeff は再計算時に確定） */
export async function updateSeriesTier(series: string, tier: TierLabel) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from('tournaments')
    .update({ manual_tier: tier })
    .eq('series', series);

  if (error) throw new Error('更新に失敗しました: ' + error.message);

  revalidatePath('/admin/coefficients');
  revalidatePath('/tournaments');
}
