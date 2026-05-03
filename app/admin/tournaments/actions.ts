'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

/**
 * 大会とその全バトル・レーティングを削除する
 */
export async function deleteTournament(tournamentId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  // 大会に紐づくバトルIDを取得
  const { data: battles } = await admin
    .from('battles')
    .select('id')
    .eq('tournament_id', tournamentId);

  const battleIds = (battles ?? []).map((b: { id: string }) => b.id);

  // ratings → battles → tournament の順で削除（FK制約）
  if (battleIds.length > 0) {
    await admin.from('ratings').delete().in('battle_id', battleIds);
    await admin.from('battles').delete().in('id', battleIds);
  }

  await admin.from('tournaments').delete().eq('id', tournamentId);

  revalidatePath('/admin/tournaments');
  revalidatePath('/admin/battles');
  revalidatePath('/battles');
  revalidatePath('/tournaments');
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath('/');

  return { ok: true, message: `削除しました（バトル ${battleIds.length} 件）` };
}
