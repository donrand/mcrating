/**
 * 重複バトルを削除するスクリプト
 * 同じ tournament_id + mc_a_id + mc_b_id + round_name の組み合わせが複数ある場合、
 * 1件だけ残して残りを削除する（ratings も連鎖削除）
 *
 * 実行後は必ず全再計算を実行すること
 *
 * 実行方法:
 *   node scripts/dedup_battles.mjs          # 確認のみ（dry-run）
 *   node scripts/dedup_battles.mjs --delete # 実際に削除
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun = !process.argv.includes('--delete');

const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

if (isDryRun) console.log('=== DRY RUN（--delete を付けると実際に削除） ===\n');

// 全承認済みバトルをページネーションで取得
const PAGE = 1000;
let battles = [];
for (let page = 0; ; page++) {
  const { data, error } = await sb
    .from('battles')
    .select('id, tournament_id, mc_a_id, mc_b_id, round_name')
    .eq('status', 'approved')
    .order('id')
    .range(page * PAGE, (page + 1) * PAGE - 1);
  if (error) { console.error('取得失敗:', error.message); process.exit(1); }
  battles = battles.concat(data ?? []);
  if ((data ?? []).length < PAGE) break;
}
console.log(`取得済みバトル: ${battles.length} 件`);

// 重複を検出（tournament_id + MCペア + round_name でグループ化）
const groups = new Map();
for (const b of battles ?? []) {
  const mcKey = [b.mc_a_id, b.mc_b_id].sort().join('|');
  const key = `${b.tournament_id}::${mcKey}::${b.round_name ?? ''}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(b.id);
}

const deleteIds = [];
for (const [, ids] of groups) {
  if (ids.length > 1) {
    // 最初の1件を残して残りを削除対象に
    deleteIds.push(...ids.slice(1));
  }
}

console.log(`重複バトル: ${deleteIds.length} 件\n`);

if (deleteIds.length === 0) {
  console.log('重複なし。終了します。');
  process.exit(0);
}

if (isDryRun) {
  console.log('削除対象の battle ID（最初の10件）:');
  deleteIds.slice(0, 10).forEach(id => console.log(' ', id));
  if (deleteIds.length > 10) console.log(`  ...他 ${deleteIds.length - 10} 件`);
  console.log('\n実際に削除するには --delete オプションを付けて実行してください。');
  process.exit(0);
}

// ratings → battles の順で削除（FK制約）
console.log('ratings を削除中...');
const { error: rError } = await sb.from('ratings').delete().in('battle_id', deleteIds);
if (rError) { console.error('ratings 削除失敗:', rError.message); process.exit(1); }

console.log('battles を削除中...');
const { error: bError } = await sb.from('battles').delete().in('id', deleteIds);
if (bError) { console.error('battles 削除失敗:', bError.message); process.exit(1); }

console.log(`\n完了: ${deleteIds.length} 件の重複バトルを削除しました。`);
console.log('次のステップ: 管理画面から全再計算を実行してください。');
