// 拡張Eloレーティング計算ロジック

const K = 20;
const INITIAL_RATING = 1500;
const RATING_FLOOR = 1000;

export type BattleResult = 'a' | 'b' | 'draw';

/**
 * 期待勝率を計算する（標準Elo式）
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * 1試合のレーティング変動を計算する
 * @param ratingA - MC A の現在レート
 * @param ratingB - MC B の現在レート
 * @param result  - 試合結果 ('a' | 'b' | 'draw')
 * @param gradeCoeff - 大会格係数
 * @returns { deltaA, deltaB, newRatingA, newRatingB }
 */
export function calcRatingDelta(
  ratingA: number,
  ratingB: number,
  result: BattleResult,
  gradeCoeff: number,
): {
  deltaA: number;
  deltaB: number;
  newRatingA: number;
  newRatingB: number;
} {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  let scoreA: number;
  let scoreB: number;

  if (result === 'a') {
    scoreA = 1.0;
    scoreB = 0.0;
  } else if (result === 'b') {
    scoreA = 0.0;
    scoreB = 1.0;
  } else {
    scoreA = 0.5;
    scoreB = 0.5;
  }

  const deltaA = K * gradeCoeff * (scoreA - expectedA);
  const deltaB = K * gradeCoeff * (scoreB - expectedB);

  const newRatingA = Math.max(RATING_FLOOR, ratingA + deltaA);
  const newRatingB = Math.max(RATING_FLOOR, ratingB + deltaB);

  return {
    deltaA: parseFloat(deltaA.toFixed(1)),
    deltaB: parseFloat(deltaB.toFixed(1)),
    newRatingA: parseFloat(newRatingA.toFixed(1)),
    newRatingB: parseFloat(newRatingB.toFixed(1)),
  };
}

// ティアベース係数（010_recalculate_fn_v3.sql と同値）
export const TIER_BASE_COEFFS = {
  A: 2.6,
  B: 2.2,
  C: 1.8,
  D: 1.4,
  E: 1.1,
} as const;

export type TierLabel = keyof typeof TIER_BASE_COEFFS;

// Q_participants パラメータ
export const TIER_Q_ALPHA = 0.12;
export const TIER_Q_MIN   = 0.92;
export const TIER_Q_MAX   = 1.08;

// grade_coeff 最終クランプ範囲
export const TIER_COEFF_MIN = 1.0;
export const TIER_COEFF_MAX = 3.0;

// grade_coeff = clamp(1.0, 3.0, B_tier × Q)
export function calcGradeCoeff(tier: TierLabel, q: number): number {
  const base = TIER_BASE_COEFFS[tier];
  return Math.max(TIER_COEFF_MIN, Math.min(TIER_COEFF_MAX, base * q));
}

export { INITIAL_RATING, RATING_FLOOR, K };
