import { supabase } from '@/lib/supabase';
import RankingPage, { type RankingMC } from './RankingPage';

export const revalidate = 60;

type Props = { searchParams: { year?: string } };

export default async function Home({ searchParams }: Props) {
  const year = searchParams.year ? parseInt(searchParams.year, 10) : null;

  if (!year) {
    const { data: mcs, error } = await supabase
      .from('mcs')
      .select('id, name, current_rating, peak_rating, battle_count, win_count')
      .eq('is_active', true)
      .gte('battle_count', 5)
      .order('current_rating', { ascending: false });

    if (error) console.error('Failed to fetch MCs:', error);
    return <RankingPage initialMcs={(mcs ?? []) as RankingMC[]} year={null} />;
  }

  // 年代ランキング: 対象年のトーナメントIDを取得
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id')
    .gte('held_on', `${year}-01-01`)
    .lte('held_on', `${year}-12-31`);

  const tournamentIds = (tournaments ?? []).map(t => t.id);
  if (tournamentIds.length === 0) {
    return <RankingPage initialMcs={[]} year={year} />;
  }

  // そのトーナメントの承認済みバトルを取得
  const { data: battles } = await supabase
    .from('battles')
    .select('id, winner, mc_a_id, mc_b_id')
    .eq('status', 'approved')
    .in('tournament_id', tournamentIds);

  const battleIds = (battles ?? []).map(b => b.id);
  if (battleIds.length === 0) {
    return <RankingPage initialMcs={[]} year={year} />;
  }

  // バトルIDに紐づくレーティングを取得
  const { data: ratings } = await supabase
    .from('ratings')
    .select('mc_id, rating_after, delta')
    .in('battle_id', battleIds);

  // MC別の年代スタッツを集計
  const eraMap = new Map<string, { peakRating: number; ratingGain: number; battles: number; wins: number }>();

  for (const r of ratings ?? []) {
    const curr = eraMap.get(r.mc_id) ?? { peakRating: 0, ratingGain: 0, battles: 0, wins: 0 };
    eraMap.set(r.mc_id, {
      peakRating: Math.max(curr.peakRating, r.rating_after),
      ratingGain: curr.ratingGain + (r.delta ?? 0),
      battles: curr.battles + 1,
      wins: curr.wins,
    });
  }

  for (const b of battles ?? []) {
    if (b.winner === 'a') {
      const curr = eraMap.get(b.mc_a_id);
      if (curr) eraMap.set(b.mc_a_id, { ...curr, wins: curr.wins + 1 });
    } else if (b.winner === 'b') {
      const curr = eraMap.get(b.mc_b_id);
      if (curr) eraMap.set(b.mc_b_id, { ...curr, wins: curr.wins + 1 });
    }
  }

  // 3試合以上出場したMCに絞る
  const activeMcIds = Array.from(eraMap.entries())
    .filter(([, s]) => s.battles >= 3)
    .map(([id]) => id);

  if (activeMcIds.length === 0) {
    return <RankingPage initialMcs={[]} year={year} />;
  }

  const { data: mcData } = await supabase
    .from('mcs')
    .select('id, name, current_rating, peak_rating, battle_count, win_count')
    .in('id', activeMcIds);

  const eraMcs: RankingMC[] = (mcData ?? [])
    .map(mc => {
      const s = eraMap.get(mc.id)!;
      return {
        id: mc.id,
        name: mc.name,
        current_rating: mc.current_rating,
        peak_rating: mc.peak_rating,
        battle_count: mc.battle_count,
        win_count: mc.win_count,
        era_rating: s.peakRating,
        era_battles: s.battles,
        era_wins: s.wins,
        era_rating_gain: Math.round(s.ratingGain),
      };
    })
    .sort((a, b) => (b.era_rating ?? 0) - (a.era_rating ?? 0));

  return <RankingPage initialMcs={eraMcs} year={year} />;
}
