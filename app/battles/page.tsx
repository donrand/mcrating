import { supabase } from '@/lib/supabase';
import BattlesClient from './BattlesClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type BattleRow = {
  id: string;
  winner: string;
  round_name: string | null;
  approved_at: string | null;
  tournaments: { name: string; held_on: string | null } | null;
  mc_a: { id: string; name: string } | null;
  mc_b: { id: string; name: string } | null;
  ratings: { mc_id: string; delta: number; rating_after: number }[];
};

type Props = {
  searchParams: { page?: string; q?: string };
};

export default async function BattlesPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const q = searchParams.q?.trim() ?? '';
  const offset = (page - 1) * PAGE_SIZE;

  // MC名検索: 一致するMCのIDを取得してバトルを絞り込む
  let mcIdFilter: string[] | null = null;
  if (q) {
    const { data: matchingMcs } = await supabase
      .from('mcs')
      .select('id')
      .ilike('name', `%${q}%`);
    mcIdFilter = (matchingMcs ?? []).map(m => m.id);
  }

  // 件数取得（検索あり・なし）
  let countQuery = supabase
    .from('battles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved');
  if (mcIdFilter !== null) {
    if (mcIdFilter.length === 0) {
      return <BattlesClient battles={[]} total={0} page={1} totalPages={0} q={q} />;
    }
    countQuery = countQuery.or(
      `mc_a_id.in.(${mcIdFilter.join(',')}),mc_b_id.in.(${mcIdFilter.join(',')})`
    );
  }
  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // データ取得
  let dataQuery = supabase
    .from('battles')
    .select(
      'id, winner, round_name, approved_at, tournaments(name, held_on), mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name), ratings(mc_id, delta, rating_after)'
    )
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (mcIdFilter !== null) {
    dataQuery = dataQuery.or(
      `mc_a_id.in.(${mcIdFilter.join(',')}),mc_b_id.in.(${mcIdFilter.join(',')})`
    );
  }
  const { data: battles } = await dataQuery;
  const rows = (battles ?? []) as unknown as BattleRow[];

  return (
    <BattlesClient
      battles={rows}
      total={total}
      page={page}
      totalPages={totalPages}
      q={q}
    />
  );
}
