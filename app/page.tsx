import { supabase } from '@/lib/supabase';
import RankingPage from './RankingPage';

export const revalidate = 60;

export default async function Home() {
  const { data: mcs, error } = await supabase
    .from('mcs')
    .select('id, name, current_rating, peak_rating, battle_count, win_count')
    .eq('is_active', true)
    .gte('battle_count', 5)
    .order('current_rating', { ascending: false });

  if (error) {
    console.error('Failed to fetch MCs:', error);
  }

  return <RankingPage initialMcs={mcs ?? []} />;
}
