'use server';

import { createClient } from '@supabase/supabase-js';

type BattleRow = {
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw';
  round_name: string;
};

type BulkSubmitInput = {
  tournament_name: string;
  held_on: string;
  battles: BattleRow[];
};

export async function bulkSubmit(input: BulkSubmitInput): Promise<{ registered: number; errors: string[] }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const errors: string[] = [];
  let registered = 0;

  for (let i = 0; i < input.battles.length; i++) {
    const b = input.battles[i];
    if (!b.mc_a_name.trim() || !b.mc_b_name.trim()) {
      errors.push(`行${i + 1}: MC名が空です`);
      continue;
    }
    if (b.mc_a_name.trim() === b.mc_b_name.trim()) {
      errors.push(`行${i + 1}: MC A と MC B が同じ名前です`);
      continue;
    }

    // 重複チェック：同一の試合内容が5分以内に投稿されていないか確認
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('mc_a_name', b.mc_a_name.trim())
      .eq('mc_b_name', b.mc_b_name.trim())
      .eq('tournament_name', input.tournament_name.trim())
      .gte('created_at', fiveMinutesAgo);

    if ((count ?? 0) > 0) {
      errors.push(`行${i + 1}: 同じ内容がすでに投稿済みです`);
      continue;
    }

    const { error } = await supabase.from('submissions').insert({
      tournament_name: input.tournament_name.trim(),
      held_on: input.held_on || null,
      mc_a_name: b.mc_a_name.trim(),
      mc_b_name: b.mc_b_name.trim(),
      winner: b.winner,
      round_name: b.round_name.trim() || null,
    });

    if (error) {
      errors.push(`行${i + 1}: 送信に失敗しました`);
    } else {
      registered++;
    }
  }

  return { registered, errors };
}
