import { supabase } from '@/lib/supabase';
import RankingPage from './RankingPage';

export const revalidate = 60;

export default async function Home() {
  const { data: mcs, error } = await supabase
    .from('mcs')
    .select('*')
    .eq('is_active', true)
    .order('current_rating', { ascending: false });

  if (error) {
    console.error('Failed to fetch MCs:', error);
  }

  return <RankingPage initialMcs={mcs ?? []} />;
}
