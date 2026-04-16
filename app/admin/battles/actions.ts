'use server';

import { createAdminClient } from '@/lib/supabase';
import { INITIAL_RATING } from '@/lib/rating';
import { revalidatePath } from 'next/cache';

/**
 * 選択されたバトルを削除し、影響するMCのレーティングを再計算する
 */
export async function deleteBattles(battleIds: string[]) {
  if (battleIds.length === 0) return;

  const admin = createAdminClient();

  // 削除対象バトルに関係するMC IDを取得
  const { data: targetBattles } = await admin
    .from('battles')
    .select('mc_a_id, mc_b_id')
    .in('id', battleIds);

  const affectedMcIds = Array.from(
    new Set(
      (targetBattles ?? []).flatMap(b => [b.mc_a_id, b.mc_b_id])
    )
  );

  // ratingsを先に削除（FK制約のため）
  await admin.from('ratings').delete().in('battle_id', battleIds);

  // battlesを削除
  await admin.from('battles').delete().in('id', battleIds);

  // 影響するMCのレーティングを再計算
  for (const mcId of affectedMcIds) {
    // 残っている全レーティング履歴を時系列順に取得
    const { data: remainingRatings } = await admin
      .from('ratings')
      .select('rating_after')
      .eq('mc_id', mcId)
      .order('created_at', { ascending: true });

    if (!remainingRatings || remainingRatings.length === 0) {
      // 試合が0件に戻った場合は初期値にリセット
      await admin
        .from('mcs')
        .update({ current_rating: INITIAL_RATING, battle_count: 0 })
        .eq('id', mcId);
    } else {
      // 最後のレーティングを現在値として設定
      const latestRating = remainingRatings[remainingRatings.length - 1].rating_after;
      await admin
        .from('mcs')
        .update({
          current_rating: latestRating,
          battle_count: remainingRatings.length,
        })
        .eq('id', mcId);
    }
  }

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/admin/battles');
}
