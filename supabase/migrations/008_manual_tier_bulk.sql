-- 008_manual_tier_bulk.sql
-- シリーズ別に manual_tier を一括設定する
-- 実行後、recalculate_all_ratings() で final_tier・grade_coeff が確定する

-- Tier A: UMB / KOK / 戦極
UPDATE tournaments
SET
  manual_tier = 'A',
  final_tier  = 'A',
  grade_coeff = 1.15
WHERE series IN ('UMB', 'KOK', '戦極');

-- Tier C: 高校生ラップ / NEO GENESIS / U-22
UPDATE tournaments
SET
  manual_tier = 'C',
  final_tier  = 'C',
  grade_coeff = 0.90
WHERE series IN ('高校生ラップ', 'NEO GENESIS', 'U-22');

-- Tier B: それ以外（上記以外の全登録大会）
UPDATE tournaments
SET
  manual_tier = 'B',
  final_tier  = 'B',
  grade_coeff = 1.00
WHERE series NOT IN ('UMB', 'KOK', '戦極', '高校生ラップ', 'NEO GENESIS', 'U-22')
   OR series IS NULL;

-- 結果確認
SELECT
  series,
  manual_tier,
  count(*) AS cnt
FROM tournaments
GROUP BY series, manual_tier
ORDER BY manual_tier, series;
