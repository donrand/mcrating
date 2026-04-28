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
  id: string | null;
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
 * 大会単位で複数バトルを一括登録する（バッチ処理版）
 *
 * 旧実装: バトル1件ごとに6〜8回のDB呼び出しを直列実行 → タイムアウト
 * 新実装:
 *   1. MC名を並列解決（1ラウンドの並列クエリ）
 *   2. 既存バトルを1クエリで一括取得
 *   3. 関連MCの現在レートを1クエリで一括取得
 *   4. レーティング計算はインメモリ（DBアクセスなし）
 *   5. battles を1回のバッチINSERT
 *   6. ratings を1回のバッチINSERT
 *   7. MCレートを並列UPDATE
 */
export async function registerBattles(
  tournament: TournamentInput,
  battles: BattleInput[],
): Promise<RegisterResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const errors: string[] = [];

  // ── 1. 大会を解決 ──────────────────────────────────────────────
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

  // ── 2. バリデーション ──────────────────────────────────────────
  const validBattles: Array<{ b: BattleInput; idx: number }> = [];
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
    validBattles.push({ b, idx: i });
  }
  if (validBattles.length === 0) {
    return { success: errors.length === 0, registered: 0, errors };
  }

  // ── 3. ユニークMC名を並列解決（ilike検索 → なければINSERT）──
  const uniqueNames = Array.from(
    new Set([
      ...validBattles.map(({ b }) => b.mc_a_name.trim()),
      ...validBattles.map(({ b }) => b.mc_b_name.trim()),
    ]),
  );

  async function resolveMcId(name: string): Promise<string> {
    const { data: existing } = await admin.from('mcs').select('id').ilike('name', name).maybeSingle();
    if (existing) return existing.id;
    const { data: newMc, error } = await admin.from('mcs').insert({ name: name.trim() }).select('id').single();
    if (error || !newMc) throw new Error(`MC「${name}」の作成に失敗しました`);
    return newMc.id;
  }

  let mcMap: Map<string, string>; // lowercased name -> MC id
  try {
    const entries = await Promise.all(
      uniqueNames.map(async (name): Promise<[string, string]> => [name.toLowerCase(), await resolveMcId(name)]),
    );
    mcMap = new Map(entries);
  } catch (e) {
    return { success: false, registered: 0, errors: [e instanceof Error ? e.message : 'MC解決エラー'] };
  }

  // ── 4. 既存バトルを1クエリで一括取得（重複チェック用）────────
  const { data: existingBattles } = await admin
    .from('battles')
    .select('mc_a_id, mc_b_id')
    .eq('tournament_id', tournamentId);

  const existingPairs = new Set<string>(
    (existingBattles ?? []).flatMap(b => [
      `${b.mc_a_id}:${b.mc_b_id}`,
      `${b.mc_b_id}:${b.mc_a_id}`,
    ]),
  );

  // ── 5. 関連MCの現在レートを1クエリで一括取得 ─────────────────
  const allMcIds = Array.from(new Set(mcMap.values()));
  const { data: mcRows } = await admin
    .from('mcs')
    .select('id, current_rating, battle_count')
    .in('id', allMcIds);

  const mcState = new Map<string, { current_rating: number; battle_count: number }>(
    (mcRows ?? []).map(r => [
      r.id,
      {
        current_rating: (r.current_rating as number) ?? INITIAL_RATING,
        battle_count: (r.battle_count as number) ?? 0,
      },
    ]),
  );

  // ── 6. インメモリでレーティング計算 ───────────────────────────
  type BattleRecord = {
    tournament_id: string;
    mc_a_id: string;
    mc_b_id: string;
    winner: string;
    round_name: string | null;
    status: string;
    approved_at: string;
  };
  type RatingSnapshot = {
    mcAId: string; mcBId: string;
    mcARatingBefore: number; mcBRatingBefore: number;
    newRatingA: number; newRatingB: number;
    deltaA: number; deltaB: number;
  };

  const battlesToInsert: BattleRecord[] = [];
  const ratingSnapshots: RatingSnapshot[] = [];
  const updatedMcIds = new Set<string>();

  for (const { b, idx } of validBattles) {
    const mcAId = mcMap.get(b.mc_a_name.trim().toLowerCase())!;
    const mcBId = mcMap.get(b.mc_b_name.trim().toLowerCase())!;

    if (existingPairs.has(`${mcAId}:${mcBId}`)) {
      errors.push(`行${idx + 1}: ${b.mc_a_name} vs ${b.mc_b_name} はすでに登録済みのためスキップ`);
      continue;
    }

    const mcA = mcState.get(mcAId) ?? { current_rating: INITIAL_RATING, battle_count: 0 };
    const mcB = mcState.get(mcBId) ?? { current_rating: INITIAL_RATING, battle_count: 0 };

    const { deltaA, deltaB, newRatingA, newRatingB } = calcRatingDelta(
      mcA.current_rating,
      mcB.current_rating,
      b.winner,
      tournament.grade_coeff,
    );

    // インメモリ状態を更新（次の試合の計算に使用）
    mcState.set(mcAId, { current_rating: newRatingA, battle_count: mcA.battle_count + 1 });
    mcState.set(mcBId, { current_rating: newRatingB, battle_count: mcB.battle_count + 1 });
    existingPairs.add(`${mcAId}:${mcBId}`);
    existingPairs.add(`${mcBId}:${mcAId}`);
    updatedMcIds.add(mcAId);
    updatedMcIds.add(mcBId);

    battlesToInsert.push({
      tournament_id: tournamentId,
      mc_a_id: mcAId,
      mc_b_id: mcBId,
      winner: b.winner,
      round_name: b.round_name.trim() || null,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

    ratingSnapshots.push({
      mcAId, mcBId,
      mcARatingBefore: mcA.current_rating,
      mcBRatingBefore: mcB.current_rating,
      newRatingA, newRatingB,
      deltaA, deltaB,
    });
  }

  if (battlesToInsert.length === 0) {
    return { success: errors.length === 0, registered: 0, errors };
  }

  // ── 7. バトルを一括INSERT ─────────────────────────────────────
  const { data: insertedBattles, error: insertError } = await admin
    .from('battles')
    .insert(battlesToInsert)
    .select('id, mc_a_id, mc_b_id');

  if (insertError || !insertedBattles) {
    return {
      success: false,
      registered: 0,
      errors: ['バトルの一括登録に失敗しました: ' + insertError?.message],
    };
  }

  // ── 8. レーティング履歴を一括INSERT（挿入順に対応）──────────
  const ratingRows = insertedBattles.flatMap((battle, i) => {
    const snap = ratingSnapshots[i];
    return [
      {
        mc_id: battle.mc_a_id,
        battle_id: battle.id,
        rating_before: snap.mcARatingBefore,
        rating_after: snap.newRatingA,
        delta: snap.deltaA,
      },
      {
        mc_id: battle.mc_b_id,
        battle_id: battle.id,
        rating_before: snap.mcBRatingBefore,
        rating_after: snap.newRatingB,
        delta: snap.deltaB,
      },
    ];
  });

  await admin.from('ratings').insert(ratingRows);

  // ── 9. 影響MCのレートを並列UPDATE ────────────────────────────
  await Promise.all(
    Array.from(updatedMcIds).map(id => {
      const state = mcState.get(id)!;
      return admin
        .from('mcs')
        .update({ current_rating: state.current_rating, battle_count: state.battle_count })
        .eq('id', id);
    }),
  );

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments');
  revalidatePath('/tournaments', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/register');

  return { success: errors.length === 0, registered: battlesToInsert.length, errors };
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
