import Link from 'next/link';

const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];

type McInfo = { id: string; name: string };
type RatingRow = { mc_id: string; rating_before: number; rating_after: number; delta: number };

export type BracketBattle = {
  id: string;
  winner: string;
  round_name: string | null;
  mc_a: McInfo | null;
  mc_b: McInfo | null;
  ratings: RatingRow[];
};

type Match = {
  battleId: string | null;
  topMc: McInfo | null;
  bottomMc: McInfo | null;
  winner: 'top' | 'bottom' | 'draw' | null;
};

type Column = {
  roundName: string;
  matches: Match[];
};

function buildColumns(battles: BracketBattle[]): Column[] {
  const roundSet = new Set(
    battles.map(b => b.round_name ?? '').filter(Boolean)
  );
  const rounds = Array.from(roundSet).sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a);
    const rb = ROUND_ORDER.indexOf(b);
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  if (rounds.length === 0) return [];

  // Build columns from last round (final) backwards, padding with "?" where needed
  const columns: Column[] = [];
  let expectedCount = 1;

  for (let i = rounds.length - 1; i >= 0; i--) {
    const roundName = rounds[i];
    const roundBattles = battles.filter(b => b.round_name === roundName);

    const matches: Match[] = roundBattles.map(b => ({
      battleId: b.id,
      topMc: b.mc_a,
      bottomMc: b.mc_b,
      winner:
        b.winner === 'a' ? 'top' :
        b.winner === 'b' ? 'bottom' :
        b.winner === 'draw' ? 'draw' : null,
    }));

    // Pad with unknown matches
    const missing = expectedCount - matches.length;
    for (let j = 0; j < missing; j++) {
      matches.push({ battleId: null, topMc: null, bottomMc: null, winner: null });
    }

    columns.unshift({ roundName, matches });
    expectedCount = Math.min(expectedCount * 2, 32); // cap at 32 to avoid huge brackets
  }

  return columns;
}

function McCell({
  mc,
  isWinner,
  isLoser,
}: {
  mc: McInfo | null;
  isWinner: boolean;
  isLoser: boolean;
}) {
  const base = 'flex items-center px-2 py-1.5 min-w-0';
  const color = isWinner
    ? 'text-yellow-300 font-semibold'
    : isLoser
    ? 'text-gray-600'
    : 'text-gray-300';

  return (
    <div className={`${base} ${color} border-b border-gray-800 last:border-b-0`}>
      {mc ? (
        <Link href={`/mc/${mc.id}`} className="truncate hover:underline text-xs leading-tight">
          {isWinner && <span className="mr-1">🏆</span>}
          {mc.name}
        </Link>
      ) : (
        <span className="text-gray-700 text-xs">?</span>
      )}
    </div>
  );
}

function MatchCard({ match, flex }: { match: Match; flex: number }) {
  const isUnknown = match.battleId === null && match.topMc === null;

  return (
    <div
      className="flex items-center"
      style={{ flex }}
    >
      <div className={`w-full mx-1 my-0.5 rounded border overflow-hidden ${
        isUnknown ? 'border-gray-800 opacity-40' : 'border-gray-700'
      } bg-gray-900`}>
        <McCell
          mc={match.topMc}
          isWinner={match.winner === 'top'}
          isLoser={match.winner === 'bottom'}
        />
        <McCell
          mc={match.bottomMc}
          isWinner={match.winner === 'bottom'}
          isLoser={match.winner === 'top'}
        />
      </div>
    </div>
  );
}

export default function TournamentBracket({ battles }: { battles: BracketBattle[] }) {
  const columns = buildColumns(battles);
  if (columns.length === 0) return null;

  const firstColCount = columns[0].matches.length;
  // min height per match slot so bracket doesn't get too tall
  const slotPx = Math.max(56, Math.min(80, 400 / firstColCount));
  const totalPx = firstColCount * slotPx;

  return (
    <div className="overflow-x-auto">
      <div
        className="flex gap-0 min-w-max"
        style={{ height: `${totalPx}px` }}
      >
        {columns.map((col, ci) => {
          // Each subsequent column has 2x fewer matches → each match takes 2x more flex
          const matchFlex = Math.pow(2, ci);

          return (
            <div key={ci} className="flex flex-col" style={{ minWidth: '130px' }}>
              {/* Round label */}
              <div className="text-center text-xs text-gray-600 pb-1 shrink-0 font-medium">
                {col.roundName}
              </div>
              {/* Matches fill remaining height */}
              <div className="flex flex-col flex-1">
                {col.matches.map((match, mi) => (
                  <MatchCard key={mi} match={match} flex={matchFlex} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
