/**
 * JSONファイルから tournaments / battles を Supabase に一括投入するスクリプト
 * レーティング計算は行わない（管理画面の「全再計算を実行」で別途実行すること）
 *
 * 実行方法:
 *   node scripts/seed.mjs                        # デフォルト: data/seed_data_master.json
 *   node scripts/seed.mjs data/sengoku_all.json  # ファイルを指定
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local を手動で読み込む
const envPath = join(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('環境変数が不足しています');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const VALID_WINNERS = new Set(['a', 'b', 'draw']);

// コマンドライン引数でファイルを指定可能（デフォルト: seed_data_master.json）
const dataFile = process.argv[2]
  ? join(process.cwd(), process.argv[2])
  : join(__dirname, '..', 'data', 'seed_data_master.json');

console.log(`読み込みファイル: ${dataFile}`);
const data = JSON.parse(readFileSync(dataFile, 'utf-8'));

async function main() {
  console.log(`大会数: ${data.tournaments.length}, バトル数: ${data.battles.length}`);

  // ── 1. 既存データを取得 ──────────────────────────────
  const { data: existingTournaments } = await admin
    .from('tournaments')
    .select('id, name');
  const { data: existingMcs } = await admin
    .from('mcs')
    .select('id, name');

  const tournamentMap = new Map(existingTournaments?.map(t => [t.name.trim(), t.id]) ?? []);
  const mcMap = new Map(existingMcs?.map(m => [m.name.trim().toLowerCase(), m.id]) ?? []);

  // ── 2. 大会を upsert ────────────────────────────────
  console.log('\n[1/3] 大会を登録中...');
  const keyToId = new Map(); // tournament_key -> db id

  for (const t of data.tournaments) {
    const name = t.name.trim();
    if (tournamentMap.has(name)) {
      keyToId.set(t.key, tournamentMap.get(name));
      process.stdout.write('.');
      continue;
    }
    const { data: inserted, error } = await admin
      .from('tournaments')
      .insert({ name, held_on: t.held_on ?? null, grade_coeff: t.grade_coeff })
      .select('id')
      .single();
    if (error || !inserted) {
      console.error(`\n大会「${name}」の登録失敗:`, error?.message);
      continue;
    }
    keyToId.set(t.key, inserted.id);
    tournamentMap.set(name, inserted.id);
    process.stdout.write('+');
  }
  console.log(`\n完了 (${keyToId.size}件)`);

  // ── 3. MC を upsert ─────────────────────────────────
  console.log('\n[2/3] MCを登録中...');
  const mcNames = new Set(data.battles.flatMap(b => [b.mc_a.trim(), b.mc_b.trim()]));
  let mcNew = 0;

  for (const name of mcNames) {
    const key = name.toLowerCase();
    if (mcMap.has(key)) continue;
    const { data: inserted, error } = await admin
      .from('mcs')
      .insert({ name })
      .select('id')
      .single();
    if (error || !inserted) {
      console.error(`\nMC「${name}」の登録失敗:`, error?.message);
      continue;
    }
    mcMap.set(key, inserted.id);
    mcNew++;
    process.stdout.write('+');
  }
  console.log(`\n完了 (新規 ${mcNew}件)`);

  // ── 4. バトルを一括登録 ──────────────────────────────
  console.log('\n[3/3] バトルを登録中...');

  // 既存バトルを取得して重複を避ける
  const { data: existingBattles } = await admin
    .from('battles')
    .select('tournament_id, mc_a_id, mc_b_id, round_name')
    .eq('status', 'approved');

  const existingSet = new Set(
    (existingBattles ?? []).map(b => `${b.tournament_id}|${b.mc_a_id}|${b.mc_b_id}|${b.round_name ?? ''}`)
  );

  const battleBatch = [];
  let skipped = 0;

  for (const b of data.battles) {
    const tournamentId = keyToId.get(b.tournament_key);
    if (!tournamentId) {
      console.error(`\n大会キー「${b.tournament_key}」が見つかりません`);
      skipped++;
      continue;
    }
    const mcAId = mcMap.get(b.mc_a.trim().toLowerCase());
    const mcBId = mcMap.get(b.mc_b.trim().toLowerCase());
    if (!mcAId || !mcBId) {
      console.error(`\nMCが見つかりません: ${b.mc_a} / ${b.mc_b}`);
      skipped++;
      continue;
    }

    // 勝者なし・不正値のバトルはスキップ
    if (!b.winner || !VALID_WINNERS.has(b.winner)) {
      console.warn(`\nスキップ（勝者なし）: ${b.mc_a} vs ${b.mc_b} [${b.tournament_key} / ${b.round ?? '-'}]`);
      skipped++;
      continue;
    }

    const dupKey = `${tournamentId}|${mcAId}|${mcBId}|${b.round ?? ''}`;
    if (existingSet.has(dupKey)) {
      skipped++;
      continue;
    }

    battleBatch.push({
      tournament_id: tournamentId,
      mc_a_id: mcAId,
      mc_b_id: mcBId,
      winner: b.winner,
      round_name: b.round ?? null,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
  }

  // 500件ずつ挿入
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < battleBatch.length; i += BATCH) {
    const chunk = battleBatch.slice(i, i + BATCH);
    const { error } = await admin.from('battles').insert(chunk);
    if (error) {
      console.error(`\nバトル挿入エラー:`, error.message);
    } else {
      inserted += chunk.length;
      process.stdout.write('.');
    }
  }
  console.log(`\n完了 (挿入 ${inserted}件 / スキップ ${skipped}件)`);

  // ── 5. battle_count を更新 ───────────────────────────
  console.log('\n[後処理] MCのbattle_countを更新中...');
  const { data: allBattles } = await admin
    .from('battles')
    .select('mc_a_id, mc_b_id')
    .eq('status', 'approved');

  const counts = new Map();
  for (const b of allBattles ?? []) {
    counts.set(b.mc_a_id, (counts.get(b.mc_a_id) ?? 0) + 1);
    counts.set(b.mc_b_id, (counts.get(b.mc_b_id) ?? 0) + 1);
  }
  for (const [mcId, count] of counts) {
    await admin.from('mcs').update({ battle_count: count }).eq('id', mcId);
  }
  console.log('完了');

  console.log('\n✓ シード完了。管理画面から「全再計算を実行」を押してレーティングを反映してください。');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
