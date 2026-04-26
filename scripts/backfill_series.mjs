/**
 * tournaments.series カラムを既存データにバックフィルするスクリプト
 * tournament_master.ts の supabaseName → シリーズ名 のマッピングを使用
 *
 * 事前に Supabase で以下を実行しておくこと:
 *   ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS series text;
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

// supabaseName → シリーズ名 のマッピング（tournament_master.ts から抽出）
const NAME_TO_SERIES = [
  // UMB
  [/^UMB\s/i, 'UMB'],
  [/^ULTIMATE MC BATTLE/i, 'UMB'],
  // 戦極
  [/^戦極MCBATTLE/, '戦極'],
  // KOK（KOK vs 真ADより先に判定）
  [/^KING OF KINGS vs 真ADRENALINE/i, 'ADRENALINE'],
  [/^KING OF KINGS/i, 'KOK'],
  [/^KOK \d{4} GRAND/i, 'KOK'],
  // FSD
  [/^フリースタイルダンジョン/, 'FSD'],
  // ADRENALINE
  [/^ADRENALINE/i, 'ADRENALINE'],
  [/^真ADRENALINE/, 'ADRENALINE'],
  [/^渋谷レゲエ祭 vs 真ADRENALINE/, 'ADRENALINE'],
  // SPOTLIGHT
  [/^SPOTLIGHT/i, 'SPOTLIGHT'],
  // 凱旋
  [/^凱旋MC BATTLE/, '凱旋'],
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

let updated = 0;
let skipped = 0;

for (const t of tournaments) {
  if (t.series) { skipped++; continue; }

  const series = detectSeries(t.name);
  if (!series) {
    console.log(`  スキップ（パターン不一致）: ${t.name}`);
    continue;
  }

  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ series })
    .eq('id', t.id);

  if (updateError) {
    console.error(`  更新失敗: ${t.name} — ${updateError.message}`);
  } else {
    console.log(`  設定: [${series}] ${t.name}`);
    updated++;
  }
}

console.log(`\n完了: ${updated}件を更新 / ${skipped}件はすでに設定済みでスキップ`);
