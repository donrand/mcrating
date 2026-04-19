/**
 * MC名義統合スクリプト
 * 同一人物の別名義を正名義に統合する
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

// 統合定義: { canonical: 正名義名, aliases: [別名義名, ...] }
const MERGE_GROUPS = [
  { canonical: '呂布カルマ',       aliases: ['ヤングたかじん', '呂布000カルマ'] },
  { canonical: 'R-指定',           aliases: ['R指定'] },
  { canonical: 'MOL53',            aliases: ['鬼ピュアワンライン', 'RAWAXXX'] },
  { canonical: 'CHEHON',           aliases: ['BUFFALO SOLDIER'] },
  { canonical: 'S-kaine',           aliases: ['S-kainê'] },
];

async function getMcId(name) {
  const { data } = await admin.from('mcs').select('id, name, battle_count').eq('name', name).maybeSingle();
  return data;
}

async function mergeMc(canonicalMc, aliasMc) {
  const cId = canonicalMc.id;
  const aId = aliasMc.id;

  console.log(`  統合: 「${aliasMc.name}」(${aliasMc.battle_count}戦) → 「${canonicalMc.name}」`);

  // 自己対戦になるバトルを確認（本来あってはならないが念のため）
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

  // battles.mc_a_id を差し替え
  const { count: countA } = await admin
    .from('battles')
    .update({ mc_a_id: cId })
    .eq('mc_a_id', aId)
    .select('id', { count: 'exact', head: true });

  // battles.mc_b_id を差し替え
  const { count: countB } = await admin
    .from('battles')
    .update({ mc_b_id: cId })
    .eq('mc_b_id', aId)
    .select('id', { count: 'exact', head: true });

  // ratings.mc_id を差し替え
  const { count: countR } = await admin
    .from('ratings')
    .update({ mc_id: cId })
    .eq('mc_id', aId)
    .select('id', { count: 'exact', head: true });

  console.log(`    battles(mc_a): ${countA ?? '?'}件, battles(mc_b): ${countB ?? '?'}件, ratings: ${countR ?? '?'}件 を更新`);

  // 別名義MCを削除
  const { error } = await admin.from('mcs').delete().eq('id', aId);
  if (error) {
    console.error(`    削除失敗: ${error.message}`);
  } else {
    console.log(`    「${aliasMc.name}」を削除しました`);
  }
}

async function main() {
  console.log('=== MC名義統合スクリプト ===\n');

  for (const group of MERGE_GROUPS) {
    const canonicalMc = await getMcId(group.canonical);
    if (!canonicalMc) {
      console.error(`正名義「${group.canonical}」が見つかりません`);
      continue;
    }
    console.log(`\n【${group.canonical}】(現在 ${canonicalMc.battle_count}戦)`);

    for (const aliasName of group.aliases) {
      const aliasMc = await getMcId(aliasName);
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
