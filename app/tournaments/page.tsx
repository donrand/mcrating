import { createAdminClient } from '@/lib/supabase';
import TournamentsClient from './TournamentsClient';

export const revalidate = 3600;

export default async function TournamentsPage() {
  const admin = createAdminClient();

  const { data } = await admin
    .from('tournaments')
    .select('id, name, held_on, series')
    .order('held_on', { ascending: false });

  const tournaments = (data ?? [])
    .filter(t => t.held_on) // held_on 未設定は表示しない
    .map(t => ({
      id: t.id,
      name: t.name,
      heldOn: t.held_on as string,
      series: t.series as string | null,
    }));

  return <TournamentsClient tournaments={tournaments} />;
}
