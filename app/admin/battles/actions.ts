'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { INITIAL_RATING, calcRatingDelta } from '@/lib/rating';
import type { BattleResult } from '@/lib/rating';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];

/**
 * 全承認済みバトルを時系列順に再計算してratings/mcsを更新する（手動トリガー用）
 */
export async function recalculateAllRatings() {
  await requireAdmin();
  const admin = createAdminClient();

  // 全承認済みバトルを時系列順に取得
  const { data: allBattles } = await admin
    .from('battles')
    .select('id, mc_a_id, mc_b_id, winner, round_name, tournaments(held_on, grade_coeff)')
    .eq('status', 'approved');

  type TournamentMeta = { held_on: string | null; grade_coeff: number };
  const sorted = [...(allBattles ?? [])].sort((a, b) => {
    const ta = (a.tournaments as unknown as TournamentMeta | null)?.held_on ?? '';
    const tb = (b.tournaments as unknown as TournamentMeta | null)?.held_on ?? '';
    if (ta !== tb) return ta.localeCompare(tb);
    const ra = ROUND_ORDER.indexOf(a.round_name ?? '');
    const rb = ROUND_ORDER.indexOf(b.round_name ?? '');
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  // 全ratingsを削除（クリーンに再構築）
  await admin.from('ratings').delete().not('id', 'is', null);

  // 全MCのレートをメモリ上でリセット
  const mcRatings = new Map<string, number>();
  const mcBattleCounts = new Map<string, number>();

  const ratingsToInsert: {
    mc_id: string;
    battle_id: string;
    rating_before: number;
    rating_after: number;
    delta: number;
  }[] = [];

  for (const battle of sorted) {
    const gradeCoeff =
      (battle.tournaments as unknown as TournamentMeta | null)?.grade_coeff ?? 1.0;
    const ratingA = mcRatings.get(battle.mc_a_id) ?? INITIAL_RATING;
    const ratingB = mcRatings.get(battle.mc_b_id) ?? INITIAL_RATING;

    const { deltaA, deltaB, newRatingA, newRatingB } = calcRatingDelta(
      ratingA,
      ratingB,
      battle.winner as BattleResult,
      gradeCoeff,
    );

    ratingsToInsert.push(
      { mc_id: battle.mc_a_id, battle_id: battle.id, rating_before: ratingA, rating_after: newRatingA, delta: deltaA },
      { mc_id: battle.mc_b_id, battle_id: battle.id, rating_before: ratingB, rating_after: newRatingB, delta: deltaB },
    );

    mcRatings.set(battle.mc_a_id, newRatingA);
    mcRatings.set(battle.mc_b_id, newRatingB);
    mcBattleCounts.set(battle.mc_a_id, (mcBattleCounts.get(battle.mc_a_id) ?? 0) + 1);
    mcBattleCounts.set(battle.mc_b_id, (mcBattleCounts.get(battle.mc_b_id) ?? 0) + 1);
  }

  // ratings一括挿入（500件ずつ）
  const batchSize = 500;
  for (let i = 0; i < ratingsToInsert.length; i += batchSize) {
    await admin.from('ratings').insert(ratingsToInsert.slice(i, i + batchSize));
  }

  // 全MCのレートと試合数を更新
  const { data: allMcs } = await admin.from('mcs').select('id');
  for (const mc of allMcs ?? []) {
    if (mcRatings.has(mc.id)) {
      await admin.from('mcs').update({
        current_rating: mcRatings.get(mc.id)!,
        battle_count: mcBattleCounts.get(mc.id) ?? 0,
      }).eq('id', mc.id);
    } else {
      // バトルが存在しないMCはリセット
      await admin.from('mcs').update({
        current_rating: INITIAL_RATING,
        battle_count: 0,
      }).eq('id', mc.id);
    }
  }

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments', 'layout');
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
