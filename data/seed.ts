import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const K = 20;
const INITIAL_RATING = 1500;
const MIN_RATING = 1000;

const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];

function calcElo(ratingA: number, ratingB: number, result: number, gradeCoeff: number) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const bonus = gradeCoeff * 5;
  const deltaA = bonus + K * gradeCoeff * (result - expectedA);
  const deltaB = bonus + K * gradeCoeff * ((1 - result) - expectedB);
  const newRatingA = Math.max(MIN_RATING, ratingA + deltaA);
  const newRatingB = Math.max(MIN_RATING, ratingB + deltaB);
  return { deltaA, deltaB, newRatingA, newRatingB };
}

async function main() {
  const rawData = fs.readFileSync(path.resolve(__dirname, 'seed_data.json'), 'utf-8');
  const data = JSON.parse(rawData) as {
    tournaments: { key: string; name: string; category: string; grade_coeff: number; held_on: string }[];
    battles: { tournament_key: string; round: string; mc_a: string; mc_b: string; winner: string }[];
  };

  console.log('=== シードデータ登録開始 ===\n');

  // 1. 大会登録
  console.log('① 大会登録...');
  const tournamentIdMap = new Map<string, string>(); // key -> id

  for (const t of data.tournaments) {
    const { data: existing } = await supabase
      .from('tournaments')
      .select('id')
      .eq('name', t.name)
      .maybeSingle();

    if (existing) {
      tournamentIdMap.set(t.key, existing.id);
      console.log(`  スキップ（既存）: ${t.name}`);
    } else {
      const { data: inserted, error } = await supabase
        .from('tournaments')
        .insert({ name: t.name, grade_coeff: t.grade_coeff, held_on: t.held_on })
        .select('id')
        .single();
      if (error || !inserted) { console.error(`  ERROR: ${t.name}`, error); continue; }
      tournamentIdMap.set(t.key, inserted.id);
      console.log(`  登録: ${t.name}`);
    }
  }

  // 2. MC名を全件抽出してUPSERT
  console.log('\n② MC登録...');
  const allMcNames = new Set<string>();
  for (const b of data.battles) {
    allMcNames.add(b.mc_a);
    allMcNames.add(b.mc_b);
  }

  const mcRatings = new Map<string, number>(); // name -> current_rating
  const mcBattleCounts = new Map<string, number>(); // name -> battle_count
  const mcIdMap = new Map<string, string>(); // name -> id

  for (const name of allMcNames) {
    const { data: existing } = await supabase
      .from('mcs')
      .select('id, current_rating, battle_count')
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      mcIdMap.set(name, existing.id);
      mcRatings.set(name, existing.current_rating ?? INITIAL_RATING);
      mcBattleCounts.set(name, existing.battle_count ?? 0);
      console.log(`  スキップ（既存）: ${name}`);
    } else {
      const { data: inserted, error } = await supabase
        .from('mcs')
        .insert({ name })
        .select('id, current_rating, battle_count')
        .single();
      if (error || !inserted) { console.error(`  ERROR: ${name}`, error); continue; }
      mcIdMap.set(name, inserted.id);
      mcRatings.set(name, inserted.current_rating ?? INITIAL_RATING);
      mcBattleCounts.set(name, inserted.battle_count ?? 0);
      console.log(`  登録: ${name}`);
    }
  }

  // 3. バトルを時系列順（held_on → round順）に処理
  console.log('\n③ バトル登録...');

  const tournamentHeldOn = new Map(data.tournaments.map(t => [t.key, t.held_on]));
  const gradeCoeffMap = new Map(data.tournaments.map(t => [t.key, t.grade_coeff]));

  const sortedBattles = [...data.battles].sort((a, b) => {
    const dateA = tournamentHeldOn.get(a.tournament_key) ?? '';
    const dateB = tournamentHeldOn.get(b.tournament_key) ?? '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const roundA = ROUND_ORDER.indexOf(a.round);
    const roundB = ROUND_ORDER.indexOf(b.round);
    return (roundA === -1 ? 999 : roundA) - (roundB === -1 ? 999 : roundB);
  });

  let battleCount = 0;
  let skipCount = 0;

  for (const b of sortedBattles) {
    const tournamentId = tournamentIdMap.get(b.tournament_key);
    const mcAId = mcIdMap.get(b.mc_a);
    const mcBId = mcIdMap.get(b.mc_b);

    if (!tournamentId || !mcAId || !mcBId) {
      console.error(`  ERROR: IDが見つかりません: ${b.mc_a} vs ${b.mc_b}`);
      continue;
    }

    // 重複チェック（同一tournament・同一MC組み合わせ・同一round）
    const { data: dup } = await supabase
      .from('battles')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('mc_a_id', mcAId)
      .eq('mc_b_id', mcBId)
      .eq('round_name', b.round)
      .maybeSingle();

    if (dup) {
      console.log(`  スキップ（既存）: ${b.mc_a} vs ${b.mc_b} [${b.round}]`);
      skipCount++;
      continue;
    }

    const ratingA = mcRatings.get(b.mc_a) ?? INITIAL_RATING;
    const ratingB = mcRatings.get(b.mc_b) ?? INITIAL_RATING;
    const result = b.winner === 'a' ? 1.0 : b.winner === 'b' ? 0.0 : 0.5;
    const gradeCoeff = gradeCoeffMap.get(b.tournament_key) ?? 1.0;

    const { deltaA, deltaB, newRatingA, newRatingB } = calcElo(ratingA, ratingB, result, gradeCoeff);

    // battles INSERT
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert({
        tournament_id: tournamentId,
        mc_a_id: mcAId,
        mc_b_id: mcBId,
        winner: b.winner,
        round_name: b.round,
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (battleError || !battle) {
      console.error(`  ERROR: ${b.mc_a} vs ${b.mc_b}`, battleError);
      continue;
    }

    // ratings INSERT
    await supabase.from('ratings').insert([
      { mc_id: mcAId, battle_id: battle.id, rating_before: ratingA, rating_after: newRatingA, delta: deltaA },
      { mc_id: mcBId, battle_id: battle.id, rating_before: ratingB, rating_after: newRatingB, delta: deltaB },
    ]);

    // MC ratings更新（メモリ上）
    mcRatings.set(b.mc_a, newRatingA);
    mcRatings.set(b.mc_b, newRatingB);
    mcBattleCounts.set(b.mc_a, (mcBattleCounts.get(b.mc_a) ?? 0) + 1);
    mcBattleCounts.set(b.mc_b, (mcBattleCounts.get(b.mc_b) ?? 0) + 1);

    console.log(`  登録: ${b.mc_a}(${ratingA.toFixed(0)}→${newRatingA.toFixed(0)}) vs ${b.mc_b}(${ratingB.toFixed(0)}→${newRatingB.toFixed(0)}) 勝者:${b.winner} [${b.round}]`);
    battleCount++;
  }

  // 4. 全MCのcurrent_rating・battle_countをDB更新
  console.log('\n④ MCレート最終更新...');
  for (const [name, rating] of mcRatings) {
    const id = mcIdMap.get(name);
    if (!id) continue;
    await supabase
      .from('mcs')
      .update({ current_rating: rating, battle_count: mcBattleCounts.get(name) ?? 0 })
      .eq('id', id);
  }

  console.log('\n=== 完了 ===');
  console.log(`大会: ${tournamentIdMap.size}件`);
  console.log(`MC: ${mcIdMap.size}件`);
  console.log(`バトル登録: ${battleCount}件 / スキップ: ${skipCount}件`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
