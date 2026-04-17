import { supabase } from '@/lib/supabase';
import BattlesClient from './BattlesClient';

export const revalidate = 300;

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
  ratings: { mc_id: string; delta: number }[];
};

export default async function BattlesPage() {
  const { data: battles } = await supabase
    .from('battles')
    .select('id, winner, round_name, tournaments(name, held_on), mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name), ratings(mc_id, delta)')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(200);

  const rows = (battles ?? []) as unknown as BattleRow[];

  return <BattlesClient battles={rows} total={rows.length} />;
}
