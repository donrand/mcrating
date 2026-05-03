'use server';

import { registerBattles, type RegisterResult } from '@/app/admin/register/actions';

export type TournamentCsvRow = {
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw';
  round_name: string;
};

export async function importTournamentCsv(
  tournamentId: string,
  gradeCoeff: number,
  battles: TournamentCsvRow[],
): Promise<RegisterResult> {
  return registerBattles(
    { id: tournamentId, name: '', held_on: '', grade_coeff: gradeCoeff },
    battles,
  );
}
