'use server';

import { createAdminClient } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

export async function addSeries(name: string): Promise<{ error?: string }> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: 'シリーズ名を入力してください' };

  const { error } = await createAdminClient()
    .from('series')
    .insert({ name: trimmed });

  if (error) return { error: error.code === '23505' ? 'すでに存在するシリーズ名です' : error.message };

  revalidatePath('/admin/series');
  revalidatePath('/admin/register');
  return {};
}

export async function deleteSeries(name: string): Promise<{ error?: string }> {
  await requireAdmin();

  const { count } = await createAdminClient()
    .from('tournaments')
    .select('id', { count: 'exact', head: true })
    .eq('series', name);

  if (count && count > 0) {
    return { error: `このシリーズには ${count} 件の大会が紐づいています。先に大会の series を変更してください。` };
  }

  const { error } = await createAdminClient()
    .from('series')
    .delete()
    .eq('name', name);

  if (error) return { error: error.message };

  revalidatePath('/admin/series');
  revalidatePath('/admin/register');
  return {};
}
