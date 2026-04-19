'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

/**
 * バトルを修正して報告を解決済みにする
 */
export async function applyCorrection(
  correctionId: string,
  battleId: string,
  winner: 'a' | 'b' | 'draw',
  roundName: string,
) {
  await requireAdmin();
  const admin = createAdminClient();

  await admin.from('battles').update({
    winner,
    round_name: roundName || null,
  }).eq('id', battleId);

  await admin.from('battle_corrections').update({
    status: 'resolved',
    resolved_at: new Date().toISOString(),
  }).eq('id', correctionId);

  revalidatePath('/admin/corrections');
  revalidatePath('/battles');
  revalidatePath('/tournaments', 'layout');
}

/**
 * 報告を却下する
 */
export async function dismissCorrection(correctionId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  await admin.from('battle_corrections').update({
    status: 'dismissed',
    resolved_at: new Date().toISOString(),
  }).eq('id', correctionId);

  revalidatePath('/admin/corrections');
}
