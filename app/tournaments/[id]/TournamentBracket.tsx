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

type Column = { roundName: string; matches: Match[] };

function buildColumns(battles: BracketBattle[]): Column[] {
  const roundSet = new Set(battles.map(b => b.round_name ?? '').filter(Boolean));
  const rounds = Array.from(roundSet).sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a);
    const rb = ROUND_ORDER.indexOf(b);
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  if (rounds.length === 0) return [];

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
    while (matches.length < expectedCount) {
      matches.push({ battleId: null, topMc: null, bottomMc: null, winner: null });
    }
    columns.unshift({ roundName, matches });
    expectedCount = Math.min(expectedCount * 2, 32);
  }

  return columns;
}

// Layout constants (px)
const CARD_W = 148;
const MC_H = 30;
const CARD_H = MC_H * 2 + 1; // 61
const COL_GAP = 32;
const COL_STEP = CARD_W + COL_GAP;
const LABEL_H = 22;

function McSlot({
  mc,
  isWinner,
  isLoser,
  isDraw,
}: {
  mc: McInfo | null;
  isWinner: boolean;
  isLoser: boolean;
  isDraw: boolean;
}) {
  const cls = isWinner
    ? 'bg-yellow-400/10 text-yellow-300 font-semibold'
    : isLoser
    ? 'text-gray-700'
    : isDraw
    ? 'text-gray-400'
    : mc
    ? 'text-gray-300'
    : 'text-gray-700';

  return (
    <div
      className={`flex items-center gap-1 px-2 text-xs overflow-hidden ${cls}`}
      style={{ height: MC_H }}
    >
      {isWinner && <span className="text-yellow-400 shrink-0 leading-none">▶</span>}
      {mc ? (
        <Link href={`/mc/${mc.id}`} className="truncate hover:underline min-w-0">
          {mc.name}
        </Link>
      ) : (
        <span className="text-gray-700">?</span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const empty = !match.topMc && !match.bottomMc && !match.battleId;
  const isDraw = match.winner === 'draw';
  return (
    <div
      className={`border rounded overflow-hidden bg-gray-900 ${
        empty ? 'border-gray-800/40 opacity-25' : 'border-gray-700'
      }`}
      style={{ width: CARD_W, height: CARD_H }}
    >
      <McSlot
        mc={match.topMc}
        isWinner={match.winner === 'top'}
        isLoser={match.winner === 'bottom'}
        isDraw={isDraw}
      />
      <div className="border-t border-gray-800" />
      <McSlot
        mc={match.bottomMc}
        isWinner={match.winner === 'bottom'}
        isLoser={match.winner === 'top'}
        isDraw={isDraw}
      />
    </div>
  );
}

export default function TournamentBracket({ battles }: { battles: BracketBattle[] }) {
  const columns = buildColumns(battles);
  if (columns.length === 0) return null;

  const N = columns[0].matches.length;
  const totalH = N * CARD_H;
  const totalW = columns.length * COL_STEP - COL_GAP;

  // Compute absolute position of every match card
  type Pos = { ci: number; mi: number; match: Match; x: number; y: number; cy: number };
  const positions: Pos[] = columns.flatMap((col, ci) => {
    const slotH = totalH / col.matches.length;
    return col.matches.map((match, mi) => {
      const cy = (mi + 0.5) * slotH;
      return { ci, mi, match, x: ci * COL_STEP, y: cy - CARD_H / 2, cy };
    });
  });

  const posMap = new Map(positions.map(p => [`${p.ci}-${p.mi}`, p]));

  // Build SVG bracket connector paths for each adjacent column pair
  const connectors: { d: string; key: string }[] = columns.slice(0, -1).flatMap((col, ci) => {
    const result: { d: string; key: string }[] = [];
    const mc = col.matches.length;
    for (let mi = 0; mi < mc; mi += 2) {
      const p1 = posMap.get(`${ci}-${mi}`);
      const p2 = posMap.get(`${ci}-${mi + 1}`);
      const p3 = posMap.get(`${ci + 1}-${Math.floor(mi / 2)}`);
      if (!p1 || !p3) continue;

      const rx = p1.x + CARD_W;       // right edge of card
      const mx = rx + COL_GAP / 2;    // horizontal midpoint between columns
      const midY = p2 ? (p1.cy + p2.cy) / 2 : p1.cy;

      // Horizontal arm from top match → midpoint
      let d = `M ${rx} ${p1.cy} H ${mx}`;
      if (p2) {
        // Horizontal arm from bottom match → midpoint, plus vertical bar
        d += ` M ${rx} ${p2.cy} H ${mx} M ${mx} ${p1.cy} V ${p2.cy}`;
      }
      // Horizontal line from midpoint to left edge of next-round match
      d += ` M ${mx} ${midY} H ${p3.x}`;

      result.push({ d, key: `${ci}-${mi}` });
    }
    return result;
  });

  return (
    <div className="overflow-x-auto pb-3">
      <div className="relative" style={{ width: totalW, height: totalH + LABEL_H }}>
        {/* Round labels */}
        {columns.map((col, ci) => (
          <div
            key={`lbl-${ci}`}
            className="absolute top-0 text-center text-[11px] text-gray-500 font-medium tracking-wide"
            style={{ left: ci * COL_STEP, width: CARD_W }}
          >
            {col.roundName}
          </div>
        ))}

        {/* SVG bracket connector lines */}
        <svg
          className="absolute pointer-events-none"
          style={{ left: 0, top: LABEL_H, overflow: 'visible' }}
          width={totalW}
          height={totalH}
        >
          {connectors.map(({ d, key }) => (
            <path key={key} d={d} fill="none" stroke="#374151" strokeWidth="1.5" />
          ))}
        </svg>

        {/* Match cards */}
        {positions.map(({ ci, mi, match, x, y }) => (
          <div
            key={`${ci}-${mi}`}
            className="absolute"
            style={{ left: x, top: y + LABEL_H }}
          >
            <MatchCard match={match} />
          </div>
        ))}
      </div>
    </div>
  );
}
