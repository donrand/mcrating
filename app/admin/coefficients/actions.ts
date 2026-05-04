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

/** 手動ティアを設定（NULLで解除） */
export async function updateManualTier(
  tournamentId: string,
  tier: TierLabel | null,
  reason: string,
) {
  const user = await requireAdmin();
  const admin = createAdminClient();

  // 現在のauto_tierを取得
  const { data: current, error: fetchErr } = await admin
    .from('tournaments')
    .select('auto_tier, manual_tier, final_tier')
    .eq('id', tournamentId)
    .single();
  if (fetchErr || !current) throw new Error('大会取得に失敗しました');

  const newFinalTier = tier ?? (current.auto_tier as TierLabel | null) ?? 'B';
  const newGradeCoeff = TIER_COEFFS[newFinalTier as TierLabel] ?? 1.0;

  // tournaments を更新
  const { error: updateErr } = await admin
    .from('tournaments')
    .update({
      manual_tier: tier,
      final_tier: newFinalTier,
      grade_coeff: newGradeCoeff,
    })
    .eq('id', tournamentId);
  if (updateErr) throw new Error('更新に失敗しました: ' + updateErr.message);

  // 監査ログを記録
  const { error: logErr } = await admin
    .from('tournament_tier_logs')
    .insert({
      tournament_id: tournamentId,
      changed_by: user.id,
      prev_manual_tier: current.manual_tier ?? null,
      new_manual_tier: tier,
      reason: reason || null,
      auto_tier: current.auto_tier ?? null,
      final_tier: newFinalTier,
    });
  if (logErr) console.error('監査ログ記録失敗:', logErr.message);

  revalidatePath('/admin/coefficients');
  revalidatePath('/tournaments');
}

/** tier_locked トグル */
export async function toggleTierLock(tournamentId: string, locked: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('tournaments')
    .update({ tier_locked: locked })
    .eq('id', tournamentId);
  if (error) throw new Error('ロック更新に失敗しました: ' + error.message);
  revalidatePath('/admin/coefficients');
}
