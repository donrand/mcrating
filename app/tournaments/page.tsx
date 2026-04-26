import { createAdminClient } from '@/lib/supabase';
import { TOURNAMENT_MASTER } from '@/data/tournament_master';
import TournamentsClient from './TournamentsClient';

export const revalidate = 3600;

export default async function TournamentsPage() {
  const admin = createAdminClient();

  const { data: supabaseTournaments } = await admin
    .from('tournaments')
    .select('id, name');

  const registeredNames = new Map<string, string>(
    (supabaseTournaments ?? []).map(t => [t.name.trim(), t.id])
  );

  const tournaments = TOURNAMENT_MASTER.flatMap(category =>
    category.tournaments
      .filter(t => t.supabaseName && registeredNames.has(t.supabaseName))
      .map(t => ({
        key: t.key,
        displayName: t.displayName,
        heldOn: t.heldOn,
        status: t.status,
        categoryLabel: category.label,
        supaId: registeredNames.get(t.supabaseName!)!,
      }))
  ).sort((a, b) => {
    const da = a.heldOn.padEnd(10, '-99');
    const db = b.heldOn.padEnd(10, '-99');
    return db.localeCompare(da);
  });

  return <TournamentsClient tournaments={tournaments} />;
}
