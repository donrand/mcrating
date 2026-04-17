'use server';

import { createAdminClient } from '@/lib/supabase';
import { calcRatingDelta, INITIAL_RATING } from '@/lib/rating';
import { revalidatePath } from 'next/cache';
import type { Submission } from '@/lib/supabase';

type MC = { id: string; name: string };
type Tournament = { id: string; name: string; grade_coeff: number };

/**
 * 投稿を承認し、レーティングを計算・反映する
 */
export async function approveSubmission(
  submission: Submission,
  gradeCoeff: number,
  existingMcs: MC[],
  existingTournaments: Tournament[],
) {
  const admin = createAdminClient();

  // 大会を解決（既存 or 新規作成）
  let tournamentId: string;
  const existingTournament = existingTournaments.find(
    t => t.name.trim() === submission.tournament_name.trim(),
  );
  if (existingTournament) {
    tournamentId = existingTournament.id;
    // 格係数を更新
    await admin
      .from('tournaments')
      .update({ grade_coeff: gradeCoeff })
      .eq('id', tournamentId);
  } else {
    const { data: newTournament, error } = await admin
      .from('tournaments')
      .insert({
        name: submission.tournament_name,
        held_on: submission.held_on,
        grade_coeff: gradeCoeff,
      })
      .select('id')
      .single();
    if (error || !newTournament) throw new Error('大会の作成に失敗しました');
    tournamentId = newTournament.id;
  }

  // MC Aを解決（既存 or 新規作成）
  let mcAId: string;
  let mcARating: number;
  const existingMcA = existingMcs.find(m => m.name.trim() === submission.mc_a_name.trim());
  if (existingMcA) {
    mcAId = existingMcA.id;
    const { data } = await admin.from('mcs').select('current_rating').eq('id', mcAId).single();
    mcARating = data?.current_rating ?? INITIAL_RATING;
  } else {
    const { data: newMcA, error } = await admin
      .from('mcs')
      .insert({ name: submission.mc_a_name })
      .select('id, current_rating')
      .single();
    if (error || !newMcA) throw new Error('MC Aの作成に失敗しました');
    mcAId = newMcA.id;
    mcARating = newMcA.current_rating;
  }

  // MC Bを解決（既存 or 新規作成）
  let mcBId: string;
  let mcBRating: number;
  const existingMcB = existingMcs.find(m => m.name.trim() === submission.mc_b_name.trim());
  if (existingMcB) {
    mcBId = existingMcB.id;
    const { data } = await admin.from('mcs').select('current_rating').eq('id', mcBId).single();
    mcBRating = data?.current_rating ?? INITIAL_RATING;
  } else {
    const { data: newMcB, error } = await admin
      .from('mcs')
      .insert({ name: submission.mc_b_name })
      .select('id, current_rating')
      .single();
    if (error || !newMcB) throw new Error('MC Bの作成に失敗しました');
    mcBId = newMcB.id;
    mcBRating = newMcB.current_rating;
  }

  // Eloレーティング計算
  const { deltaA, deltaB, newRatingA, newRatingB } = calcRatingDelta(
    mcARating,
    mcBRating,
    submission.winner,
    gradeCoeff,
  );

  // battlesテーブルに試合を登録（approved状態で）
  const { data: battle, error: battleError } = await admin
    .from('battles')
    .insert({
      tournament_id: tournamentId,
      mc_a_id: mcAId,
      mc_b_id: mcBId,
      winner: submission.winner,
      round_name: submission.round_name,
      evidence_url: submission.evidence_url,
      note: submission.note,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (battleError || !battle) throw new Error('試合の登録に失敗しました');

  // ratingsテーブルにレーティング変動を記録
  await admin.from('ratings').insert([
    {
      mc_id: mcAId,
      battle_id: battle.id,
      rating_before: mcARating,
      rating_after: newRatingA,
      delta: deltaA,
    },
    {
      mc_id: mcBId,
      battle_id: battle.id,
      rating_before: mcBRating,
      rating_after: newRatingB,
      delta: deltaB,
    },
  ]);

  // MCの現在レートと試合数を更新
  const [{ data: mcAData }, { data: mcBData }] = await Promise.all([
    admin.from('mcs').select('battle_count').eq('id', mcAId).single(),
    admin.from('mcs').select('battle_count').eq('id', mcBId).single(),
  ]);
  await Promise.all([
    admin.from('mcs').update({ current_rating: newRatingA, battle_count: (mcAData?.battle_count ?? 0) + 1 }).eq('id', mcAId),
    admin.from('mcs').update({ current_rating: newRatingB, battle_count: (mcBData?.battle_count ?? 0) + 1 }).eq('id', mcBId),
  ]);

  // submissionを承認済みに更新
  await admin
    .from('submissions')
    .update({ status: 'approved' })
    .eq('id', submission.id);

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/admin');
  revalidatePath(`/mc/${mcAId}`);
  revalidatePath(`/mc/${mcBId}`);
}

/**
 * 投稿を却下する
 */
export async function rejectSubmission(submissionId: string, reason: string) {
  const admin = createAdminClient();
  await admin
    .from('submissions')
    .update({ status: 'rejected', reject_reason: reason || null })
    .eq('id', submissionId);

  revalidatePath('/admin');
}
