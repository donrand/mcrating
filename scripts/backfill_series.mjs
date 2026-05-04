/**
 * tournaments.series カラムを全大会にバックフィルするスクリプト
 * tournament_master.ts の supabaseName → シリーズ名 のマッピングを使用
 *
 * 実行方法:
 *   node scripts/backfill_series.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 判定順に注意: より具体的なパターンを先に記述
const NAME_TO_SERIES = [
  // UMB
  [/^UMB\s/i,              'UMB'],
  [/^ULTIMATE MC BATTLE/i, 'UMB'],

  // 戦極
  [/^戦極MCBATTLE/, '戦極'],

  // KOK vs 真ADRENALINE（KOKより先に判定）
  [/^KING OF KINGS vs 真ADRENALINE/i, 'ADRENALINE'],
  [/^渋谷レゲエ祭 vs 真ADRENALINE/i,  'ADRENALINE'],

  // KOK
  [/^KING OF KINGS/i,      'KOK'],
  [/^KOK \d{4} GRAND/i,    'KOK'],

  // FSD
  [/^フリースタイルダンジョン/, 'FSD'],

  // ADRENALINE（真ADと旧ADをまとめて）
  [/^ADRENALINE/i,   'ADRENALINE'],
  [/^真ADRENALINE/,  'ADRENALINE'],

  // SPOTLIGHT
  [/^SPOTLIGHT/i, 'SPOTLIGHT'],

  // 凱旋
  [/^凱旋MC BATTLE/, '凱旋'],

  // U-22
  [/U-22 MC BATTLE/i,        'U-22'],
  [/U22 MC BATTLE/i,         'U-22'],
  [/×戦極U-22 MC BATTLE/i,   'U-22'],

  // Dis4U
  [/^Dis4U/i, 'Dis4U'],

  // 高校生ラップ選手権
  [/^高校生ラップ選手権/, '高校生ラップ'],

  // NEO GENESIS
  [/^NEO GENESIS/i, 'NEO GENESIS'],

  // LEGALIZE
  [/^LEGALIZE/i, 'LEGALIZE'],

  // FSL
  [/^FSL/i, 'FSL'],

  // BATTLE SUMMIT
  [/^BATTLE SUMMIT/i, 'BATTLE SUMMIT'],

  // Red Bull
  [/^Red Bull/i, 'Red Bull'],

  // 口喧嘩祭
  [/^口喧嘩祭/, '口喧嘩祭'],

  // 祭-MATSURI-
  [/^祭-MATSURI-/i, '祭'],

  // 破天MCBATTLE
  [/^破天/, '破天'],

  // フリースタイル日本統一
  [/^フリースタイル日本統一/, 'フリスタ日本統一'],

  // 3150×LUSHBOMU
  [/^3150/, '3150'],

  // 真ADRENALINE（スペースあり表記）
  [/^真\sADRENALINE/i, 'ADRENALINE'],

  // トウカイラップフェスティバル
  [/^トウカイラップ/, 'トウカイ'],
];

function detectSeries(name) {
  for (const [pattern, series] of NAME_TO_SERIES) {
    if (pattern.test(name)) return series;
  }
  return null;
}

const { data: tournaments, error } = await supabase
  .from('tournaments')
  .select('id, name, series');

if (error) {
  console.error('取得失敗:', error.message);
  process.exit(1);
}

console.log(`対象: ${tournaments.length} 大会\n`);

let updated = 0;
let unchanged = 0;
let unmatched = [];

for (const t of tournaments) {
  const series = detectSeries(t.name);

  if (!series) {
    unmatched.push(t.name);
    continue;
  }

  // すでに同じ値なら UPDATE をスキップ
  if (t.series === series) {
    unchanged++;
    continue;
  }

  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ series })
    .eq('id', t.id);

  if (updateError) {
    console.error(`  更新失敗: ${t.name} — ${updateError.message}`);
  } else {
    const prev = t.series ? `[${t.series}]` : '[未設定]';
    console.log(`  ${prev} → [${series}]  ${t.name}`);
    updated++;
  }
}

console.log(`\n完了: ${updated}件更新 / ${unchanged}件は変更なし`);

if (unmatched.length > 0) {
  console.log(`\nパターン不一致（series未設定のまま）:`);
  for (const name of unmatched) console.log(`  - ${name}`);
}
