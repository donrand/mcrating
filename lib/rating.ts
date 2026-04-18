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
 * 出場ボーナスを計算する（大会格係数 × 5pt）
 */
export function participationBonus(gradeCoeff: number): number {
  return gradeCoeff * 5;
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

  // 出場ボーナスは勝者のみに付与
  const bonusA = result === 'a' ? gradeCoeff * 5 : 0;
  const bonusB = result === 'b' ? gradeCoeff * 5 : 0;

  const deltaA = bonusA + K * gradeCoeff * (scoreA - expectedA);
  const deltaB = bonusB + K * gradeCoeff * (scoreB - expectedB);

  const newRatingA = Math.max(RATING_FLOOR, ratingA + deltaA);
  const newRatingB = Math.max(RATING_FLOOR, ratingB + deltaB);

  return {
    deltaA: parseFloat(deltaA.toFixed(1)),
    deltaB: parseFloat(deltaB.toFixed(1)),
    newRatingA: parseFloat(newRatingA.toFixed(1)),
    newRatingB: parseFloat(newRatingB.toFixed(1)),
  };
}

export { INITIAL_RATING, RATING_FLOOR, K };
