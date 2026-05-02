/**
 * MC名義統合スクリプト
 * Supabase の mc_merge_rules テーブルからルールを読み込み、同一人物の別名義を正名義に統合する
 *
 * 実行方法:
 *   node scripts/merge_mcs.mjs
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function getMcById(id) {
  const { data } = await admin.from('mcs').select('id, name, battle_count').eq('id', id).maybeSingle();
  return data;
}

async function mergeMc(canonicalMc, aliasMc) {
  const cId = canonicalMc.id;
  const aId = aliasMc.id;

  console.log(`  統合: 「${aliasMc.name}」(${aliasMc.battle_count}戦) → 「${canonicalMc.name}」`);

  const { data: selfBattles } = await admin
    .from('battles')
    .select('id')
    .or(`and(mc_a_id.eq.${cId},mc_b_id.eq.${aId}),and(mc_a_id.eq.${aId},mc_b_id.eq.${cId})`);
  if (selfBattles && selfBattles.length > 0) {
    console.warn(`  ⚠ 自己対戦バトルが ${selfBattles.length} 件あります。これらは削除します。`);
    const selfIds = selfBattles.map(b => b.id);
    await admin.from('ratings').delete().in('battle_id', selfIds);
    await admin.from('battles').delete().in('id', selfIds);
  }

  const { count: countA } = await admin
    .from('battles').update({ mc_a_id: cId }).eq('mc_a_id', aId)
    .select('id', { count: 'exact', head: true });

  const { count: countB } = await admin
    .from('battles').update({ mc_b_id: cId }).eq('mc_b_id', aId)
    .select('id', { count: 'exact', head: true });

  const { count: countR } = await admin
    .from('ratings').update({ mc_id: cId }).eq('mc_id', aId)
    .select('id', { count: 'exact', head: true });

  console.log(`    battles(mc_a): ${countA ?? '?'}件, battles(mc_b): ${countB ?? '?'}件, ratings: ${countR ?? '?'}件 を更新`);

  const { error } = await admin.from('mcs').delete().eq('id', aId);
  if (error) {
    console.error(`    削除失敗: ${error.message}`);
  } else {
    console.log(`    「${aliasMc.name}」を削除しました`);
  }
}

async function main() {
  console.log('=== MC名義統合スクリプト ===\n');

  // mc_merge_rules テーブルからルールを取得
  const { data: rules, error: rulesError } = await admin
    .from('mc_merge_rules')
    .select('canonical_name, alias_name')
    .order('canonical_name');

  if (rulesError) {
    console.error('mc_merge_rules の取得に失敗しました:', rulesError.message);
    process.exit(1);
  }

  if (!rules || rules.length === 0) {
    console.log('統合ルールが登録されていません。');
    return;
  }

  // canonical_name ごとにグループ化
  const groups = new Map();
  for (const r of rules) {
    if (!groups.has(r.canonical_name)) groups.set(r.canonical_name, []);
    groups.get(r.canonical_name).push(r.alias_name);
  }

  for (const [canonicalName, aliases] of groups) {
    const { data: canonicalMc } = await admin
      .from('mcs').select('id, name, battle_count').eq('name', canonicalName).maybeSingle();
    if (!canonicalMc) {
      console.error(`正名義「${canonicalName}」が見つかりません`);
      continue;
    }
    console.log(`\n【${canonicalName}】(現在 ${canonicalMc.battle_count}戦)`);

    for (const aliasName of aliases) {
      const { data: aliasMc } = await admin
        .from('mcs').select('id, name, battle_count').eq('name', aliasName).maybeSingle();
      if (!aliasMc) {
        console.log(`  「${aliasName}」はDBに存在しないためスキップ`);
        continue;
      }
      await mergeMc(canonicalMc, aliasMc);
    }
  }

  // battle_count を正しく再集計
  console.log('\n[後処理] battle_count を再集計中...');
  const { data: allBattles } = await admin
    .from('battles')
    .select('mc_a_id, mc_b_id')
    .eq('status', 'approved');

  const counts = new Map();
  for (const b of allBattles ?? []) {
    counts.set(b.mc_a_id, (counts.get(b.mc_a_id) ?? 0) + 1);
    counts.set(b.mc_b_id, (counts.get(b.mc_b_id) ?? 0) + 1);
  }

  const { data: allMcs } = await admin.from('mcs').select('id');
  for (const mc of allMcs ?? []) {
    await admin.from('mcs')
      .update({ battle_count: counts.get(mc.id) ?? 0 })
      .eq('id', mc.id);
  }

  console.log('完了');
  console.log('\n✓ 統合完了。管理画面から「全再計算を実行」でレーティングを再計算してください。');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
