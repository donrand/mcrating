'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { calcRatingDelta, INITIAL_RATING } from '@/lib/rating';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

type BattleInput = {
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw';
  round_name: string;
};

type TournamentInput = {
  id: string | null; // null = 新規作成
  name: string;
  held_on: string;
  grade_coeff: number;
  series?: string;
};

export type RegisterResult = {
  success: boolean;
  registered: number;
  errors: string[];
};

export type TournamentGroupInput = {
  tournament_name: string;
  held_on: string;
  grade_coeff: number;
  series?: string;
  battles: BattleInput[];
};

export type MultiRegisterResult = {
  success: boolean;
  totalRegistered: number;
  results: Array<{ tournamentName: string; registered: number; errors: string[] }>;
};

/**
 * 大会単位で複数バトルを一括登録する
 */
export async function registerBattles(
  tournament: TournamentInput,
  battles: BattleInput[],
): Promise<RegisterResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const errors: string[] = [];
  let registered = 0;

  // 大会を解決（既存 or 新規）
  let tournamentId: string;
  if (tournament.id) {
    tournamentId = tournament.id;
    await admin
      .from('tournaments')
      .update({
        grade_coeff: tournament.grade_coeff,
        held_on: tournament.held_on || null,
        ...(tournament.series ? { series: tournament.series } : {}),
      })
      .eq('id', tournamentId);
  } else {
    const { data: newTournament, error } = await admin
      .from('tournaments')
      .insert({
        name: tournament.name.trim(),
        held_on: tournament.held_on || null,
        grade_coeff: tournament.grade_coeff,
        series: tournament.series || null,
      })
      .select('id')
      .single();
    if (error || !newTournament) {
      return { success: false, registered: 0, errors: ['大会の作成に失敗しました: ' + error?.message] };
    }
    tournamentId = newTournament.id;
  }

  // MCキャッシュ（同一バトル内で同じMCが複数回出る場合に備えて）
  const mcCache = new Map<string, string>(); // name -> id

  async function resolveMc(name: string): Promise<string> {
    const key = name.trim().toLowerCase();
    if (mcCache.has(key)) return mcCache.get(key)!;

    const { data: existing } = await admin
      .from('mcs')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle();

    if (existing) {
      mcCache.set(key, existing.id);
      return existing.id;
    }

    const { data: newMc, error } = await admin
      .from('mcs')
      .insert({ name: name.trim() })
      .select('id')
      .single();
    if (error || !newMc) throw new Error(`MC「${name}」の作成に失敗しました`);
    mcCache.set(key, newMc.id);
    return newMc.id;
  }

  // バトルを順番に登録（レーティングは逐次更新）
  for (let i = 0; i < battles.length; i++) {
    const b = battles[i];
    if (!b.mc_a_name.trim() || !b.mc_b_name.trim()) {
      errors.push(`行${i + 1}: MC名が空です`);
      continue;
    }
    if (b.mc_a_name.trim() === b.mc_b_name.trim()) {
      errors.push(`行${i + 1}: MC A と MC B が同じ名前です`);
      continue;
    }

    try {
      const mcAId = await resolveMc(b.mc_a_name);
      const mcBId = await resolveMc(b.mc_b_name);

      // 最新レートを取得
      const [{ data: mcARow }, { data: mcBRow }] = await Promise.all([
        admin.from('mcs').select('current_rating, battle_count').eq('id', mcAId).single(),
        admin.from('mcs').select('current_rating, battle_count').eq('id', mcBId).single(),
      ]);
      const mcARating = mcARow?.current_rating ?? INITIAL_RATING;
      const mcBRating = mcBRow?.current_rating ?? INITIAL_RATING;

      const { deltaA, deltaB, newRatingA, newRatingB } = calcRatingDelta(
        mcARating,
        mcBRating,
        b.winner,
        tournament.grade_coeff,
      );

      // battles登録
      const { data: battle, error: battleError } = await admin
        .from('battles')
        .insert({
          tournament_id: tournamentId,
          mc_a_id: mcAId,
          mc_b_id: mcBId,
          winner: b.winner,
          round_name: b.round_name.trim() || null,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (battleError || !battle) {
        errors.push(`行${i + 1}: 試合の登録に失敗しました`);
        continue;
      }

      // ratings記録
      await admin.from('ratings').insert([
        { mc_id: mcAId, battle_id: battle.id, rating_before: mcARating, rating_after: newRatingA, delta: deltaA },
        { mc_id: mcBId, battle_id: battle.id, rating_before: mcBRating, rating_after: newRatingB, delta: deltaB },
      ]);

      // MCレート更新
      await Promise.all([
        admin.from('mcs').update({ current_rating: newRatingA, battle_count: (mcARow?.battle_count ?? 0) + 1 }).eq('id', mcAId),
        admin.from('mcs').update({ current_rating: newRatingB, battle_count: (mcBRow?.battle_count ?? 0) + 1 }).eq('id', mcBId),
      ]);

      registered++;
    } catch (e) {
      errors.push(`行${i + 1}: ${e instanceof Error ? e.message : '不明なエラー'}`);
    }
  }

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments');
  revalidatePath('/tournaments', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/register');

  return { success: errors.length === 0, registered, errors };
}

/**
 * 複数大会を一括登録する（CSVマルチフォーマット用）
 */
export async function registerMultipleTournaments(
  groups: TournamentGroupInput[],
): Promise<MultiRegisterResult> {
  await requireAdmin();
  const admin = createAdminClient();

  let totalRegistered = 0;
  const results: MultiRegisterResult['results'] = [];

  for (const group of groups) {
    // 同名の既存大会を検索
    const { data: existing } = await admin
      .from('tournaments')
      .select('id')
      .ilike('name', group.tournament_name.trim())
      .maybeSingle();

    const r = await registerBattles(
      {
        id: existing?.id ?? null,
        name: group.tournament_name,
        held_on: group.held_on,
        grade_coeff: group.grade_coeff,
        series: group.series,
      },
      group.battles,
    );

    totalRegistered += r.registered;
    results.push({ tournamentName: group.tournament_name, registered: r.registered, errors: r.errors });
  }

  return {
    success: results.every(r => r.errors.length === 0),
    totalRegistered,
    results,
  };
}
