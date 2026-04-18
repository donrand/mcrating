'use server';

import { createClient } from '@supabase/supabase-js';

// anon keyで書き込む（RLSが許可する範囲）
function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

type SubmitInput = {
  tournament_name: string;
  held_on: string;
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw';
  round_name: string | null;
  evidence_url: string | null;
  note: string | null;
};

/**
 * 試合情報を投稿する
 * 同じ組み合わせの重複投稿（5分以内）はエラーを返す
 */
export async function submitBattle(input: SubmitInput): Promise<{ error: string | null }> {
  const supabase = createAnonClient();

  // 重複チェック：同一の試合内容が5分以内に投稿されていないか確認
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('mc_a_name', input.mc_a_name)
    .eq('mc_b_name', input.mc_b_name)
    .eq('tournament_name', input.tournament_name)
    .gte('created_at', fiveMinutesAgo);

  if ((count ?? 0) > 0) {
    return { error: '同じ内容がすでに投稿されています。しばらくお待ちください。' };
  }

  const { error } = await supabase.from('submissions').insert(input);

  if (error) {
    return { error: '送信に失敗しました。時間をおいて再度お試しください。' };
  }

  return { error: null };
}
