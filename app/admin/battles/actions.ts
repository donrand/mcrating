'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

async function mergeMcAliases(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const logs: string[] = [];

  const { data: rules } = await admin
    .from('mc_merge_rules')
    .select('canonical_name, alias_name')
    .order('canonical_name');

  if (!rules || rules.length === 0) return logs;

  // canonical_name ごとにグループ化
  const groups = new Map<string, string[]>();
  for (const r of rules as { canonical_name: string; alias_name: string }[]) {
    if (!groups.has(r.canonical_name)) groups.set(r.canonical_name, []);
    groups.get(r.canonical_name)!.push(r.alias_name);
  }

  for (const [canonicalName, aliases] of Array.from(groups.entries())) {
    const { data: canonicalMc } = await admin
      .from('mcs').select('id, name').eq('name', canonicalName).maybeSingle();
    if (!canonicalMc) continue;

    for (const aliasName of aliases) {
      const { data: aliasMc } = await admin
        .from('mcs').select('id, name').eq('name', aliasName).maybeSingle();
      if (!aliasMc) continue;

      const cId = canonicalMc.id;
      const aId = aliasMc.id;

      // 自己対戦になるバトルを削除
      const { data: selfBattles } = await admin.from('battles').select('id')
        .or(`and(mc_a_id.eq.${cId},mc_b_id.eq.${aId}),and(mc_a_id.eq.${aId},mc_b_id.eq.${cId})`);
      if (selfBattles && selfBattles.length > 0) {
        const selfIds = selfBattles.map((b: { id: string }) => b.id);
        await admin.from('ratings').delete().in('battle_id', selfIds);
        await admin.from('battles').delete().in('id', selfIds);
      }

      await admin.from('battles').update({ mc_a_id: cId }).eq('mc_a_id', aId);
      await admin.from('battles').update({ mc_b_id: cId }).eq('mc_b_id', aId);
      await admin.from('ratings').update({ mc_id: cId }).eq('mc_id', aId);
      await admin.from('mcs').delete().eq('id', aId);

      logs.push(`「${aliasName}」→「${canonicalName}」統合`);
    }
  }

  return logs;
}

async function revalidateAllTournaments(admin: ReturnType<typeof createAdminClient>) {
  const { data: tournaments } = await admin.from('tournaments').select('id');
  for (const t of tournaments ?? []) {
    revalidatePath(`/tournaments/${t.id}`);
  }
}

/**
 * キャッシュのみクリアする（SQL Editorで再計算した後に使用）
 */
export async function purgeCache() {
  await requireAdmin();
  const admin = createAdminClient();
  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments');
  revalidatePath('/tournaments', 'layout');
  revalidatePath('/mc', 'layout');
  await revalidateAllTournaments(admin);
}

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

/**
 * 全承認済みバトルを時系列順に再計算してratings/mcsを更新する（手動トリガー用）
 * 計算は Supabase の PostgreSQL 関数 recalculate_all_ratings() で実行される。
 * タイムアウトなし・データ量無制限。
 */
export async function recalculateAllRatings(): Promise<{ ok: boolean; message: string; details?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[recalculate] auth error:', msg);
    return { ok: false, message: '認証エラー', details: msg };
  }

  const admin = createAdminClient();

  // 再計算前にMCエイリアスを統合する
  const mergeLogs = await mergeMcAliases(admin);
  if (mergeLogs.length > 0) {
    console.log('[recalculate] MC統合:', mergeLogs.join(', '));
  }

  let result: { data: unknown; error: { message: string; code?: string; details?: string; hint?: string } | null };
  try {
    result = await admin.rpc('recalculate_all_ratings') as typeof result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[recalculate] rpc call threw exception:', msg);
    return { ok: false, message: 'RPC呼び出し例外', details: msg };
  }

  if (result.error) {
    const { message, code, details, hint } = result.error;
    console.error('[recalculate] rpc error:', { message, code, details, hint });
    return {
      ok: false,
      message: message,
      details: [code && `code: ${code}`, details && `details: ${details}`, hint && `hint: ${hint}`]
        .filter(Boolean).join(' / ') || undefined,
    };
  }

  console.log('[recalculate] success:', result.data);

  revalidatePath('/');
  revalidatePath('/battles');
  revalidatePath('/tournaments');
  revalidatePath('/tournaments', 'layout');
  revalidatePath('/mc', 'layout');
  await revalidateAllTournaments(admin);

  return { ok: true, message: `再計算完了 (${JSON.stringify(result.data)})` };
}

/**
 * 選択されたバトルを削除する（レーティング再計算は行わない）
 */
export async function deleteBattles(battleIds: string[]) {
  if (battleIds.length === 0) return;
  await requireAdmin();
  const admin = createAdminClient();

  // 削除前にtournament_idを取得してrevalidate対象を把握
  const { data: battles } = await admin.from('battles').select('tournament_id').in('id', battleIds);
  const tournamentIds = Array.from(new Set((battles ?? []).map((b: { tournament_id: string }) => b.tournament_id).filter(Boolean)));

  // ratingsを先に削除（FK制約のため）
  await admin.from('ratings').delete().in('battle_id', battleIds);

  // battlesを削除
  await admin.from('battles').delete().in('id', battleIds);

  revalidatePath('/admin/battles');
  revalidatePath('/battles');
  revalidatePath('/tournaments');
  for (const tid of tournamentIds) {
    revalidatePath(`/tournaments/${tid}`);
  }
}
