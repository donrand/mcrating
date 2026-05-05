'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { TIER_COEFFS, type TierLabel } from '@/lib/rating';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
  return user;
}

/** シリーズ単位で manual_tier を一括更新する */
export async function updateSeriesTier(series: string, tier: TierLabel) {
  await requireAdmin();
  const admin = createAdminClient();

  const coeff = TIER_COEFFS[tier];

  const { error } = await admin
    .from('tournaments')
    .update({
      manual_tier: tier,
      final_tier: tier,
      grade_coeff: coeff,
    })
    .eq('series', series);

  if (error) throw new Error('更新に失敗しました: ' + error.message);

  revalidatePath('/admin/coefficients');
  revalidatePath('/tournaments');
}
