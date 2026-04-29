/**
 * SPOTLIGHT データ全置換スクリプト
 * 既存の SPOTLIGHT 大会・バトル・レーティングを削除し、CSVから再登録する
 *
 * 実行方法:
 *   node scripts/replace_spotlight.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// 統合済みエイリアス → 正名義
const CANONICAL = {
  'MC☆ニガリ':              'MC☆ニガリ a.k.a 赤い稲妻',
  'MCニガリ':               'MC☆ニガリ a.k.a 赤い稲妻',
  'MC☆ニガリa.k.a赤い稲妻': 'MC☆ニガリ a.k.a 赤い稲妻',
  'RAWAXXX':                'MOL53',
  '鬼ピュアワンライン':      'MOL53',
  'S-kainê':                'S-kaine',
  '藤KooS':                 'Fuma no KTR',
  '八咫烏':                 'Fuma no KTR',
  'T-Tongue':               'T-TANGG',
  'T-TONGUE':               'T-TANGG',
  'T-Toungue':              'T-TANGG',
  '泰斗 a.k.a. 裂固':       '裂固',
  '泰斗a.k.a.裂固':         '裂固',
  'ウジミツ':               '蛆密',
  'R指定':                  'R-指定',
  '5LEEP3ALKER':            'Rude-α',
  'Kyons':                  'キョンス',
  'ヤングたかじん':          '呂布カルマ',
  '呂布000カルマ':           '呂布カルマ',
};

const fixName = name => CANONICAL[name.trim()] ?? name.trim();

function parseCsv(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('tournament_name')) continue;
    const p = t.split(',');
    if (p.length < 7) continue;
    rows.push({
      tournament_name: p[0].trim(),
      held_on:         p[1].trim(),
      grade_coeff:     parseFloat(p[2]),
      mc_a:            fixName(p[3]),
      mc_b:            fixName(p[4]),
      winner:          p[5].trim(),
      round:           p[6].trim(),
      series:          p[7]?.trim() || 'SPOTLIGHT',
    });
  }
  return rows;
}

function groupByTournament(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.tournament_name)) {
      map.set(r.tournament_name, {
        tournament_name: r.tournament_name,
        held_on: r.held_on,
        grade_coeff: r.grade_coeff,
        series: r.series,
        battles: [],
      });
    }
    map.get(r.tournament_name).battles.push({ mc_a: r.mc_a, mc_b: r.mc_b, winner: r.winner, round: r.round });
  }
  return Array.from(map.values());
}

async function deleteSpotlightData() {
  console.log('既存 SPOTLIGHT データを削除中...');
  const { data: tournaments } = await admin.from('tournaments').select('id, name').eq('series', 'SPOTLIGHT');
  if (!tournaments?.length) { console.log('  削除対象なし'); return; }

  const tIds = tournaments.map(t => t.id);
  console.log(`  大会: ${tIds.length}件 (${tournaments.map(t => t.name).join(', ')})`);

  const { data: battles } = await admin.from('battles').select('id').in('tournament_id', tIds);
  const bIds = (battles ?? []).map(b => b.id);
  console.log(`  バトル: ${bIds.length}件`);

  if (bIds.length > 0) {
    const { error: e1 } = await admin.from('ratings').delete().in('battle_id', bIds);
    if (e1) throw new Error('ratings削除失敗: ' + e1.message);
    const { error: e2 } = await admin.from('battles').delete().in('id', bIds);
    if (e2) throw new Error('battles削除失敗: ' + e2.message);
  }
  const { error: e3 } = await admin.from('tournaments').delete().in('id', tIds);
  if (e3) throw new Error('tournaments削除失敗: ' + e3.message);
  console.log('  削除完了');
}

const mcCache = new Map();
async function resolveMcId(name) {
  if (mcCache.has(name)) return mcCache.get(name);
  const { data: existing } = await admin.from('mcs').select('id').ilike('name', name).maybeSingle();
  if (existing) { mcCache.set(name, existing.id); return existing.id; }
  const { data: newMc, error } = await admin.from('mcs').insert({ name }).select('id').single();
  if (error || !newMc) throw new Error(`MC「${name}」作成失敗: ${error?.message}`);
  console.log(`    新MC作成: 「${name}」`);
  mcCache.set(name, newMc.id);
  return newMc.id;
}

async function registerGroup(group) {
  process.stdout.write(`  ${group.tournament_name} (${group.held_on}) ... `);

  const { data: t, error: tErr } = await admin
    .from('tournaments')
    .insert({ name: group.tournament_name, held_on: group.held_on, grade_coeff: group.grade_coeff, series: group.series })
    .select('id')
    .single();
  if (tErr || !t) throw new Error(`大会作成失敗 [${group.tournament_name}]: ${tErr?.message}`);

  const allNames = Array.from(new Set(group.battles.flatMap(b => [b.mc_a, b.mc_b])));
  await Promise.all(allNames.map(resolveMcId));

  const battleRecords = group.battles.map(b => ({
    tournament_id: t.id,
    mc_a_id:       mcCache.get(b.mc_a),
    mc_b_id:       mcCache.get(b.mc_b),
    winner:        b.winner,
    round_name:    b.round || null,
    status:        'approved',
    approved_at:   new Date().toISOString(),
  }));

  const { error: bErr } = await admin.from('battles').insert(battleRecords);
  if (bErr) throw new Error(`バトル登録失敗 [${group.tournament_name}]: ${bErr.message}`);

  console.log(`${battleRecords.length}件`);
}

async function main() {
  console.log('=== SPOTLIGHT データ全置換 ===\n');

  const csvText = readFileSync(join(__dirname, '..', 'data', 'spotlight.csv'), 'utf-8');
  const rows = parseCsv(csvText);
  const groups = groupByTournament(rows);
  console.log(`CSV: ${groups.length}大会 / ${rows.length}バトル\n`);

  await deleteSpotlightData();

  console.log('\n新規登録:');
  for (const g of groups) {
    await registerGroup(g);
  }

  console.log('\nレーティング再計算中...');
  const { data, error } = await admin.rpc('recalculate_all_ratings');
  if (error) throw new Error('再計算失敗: ' + error.message);
  console.log(`✓ 完了 (battles_processed: ${data.battles_processed})`);
}

main().catch(err => { console.error(err); process.exit(1); });
