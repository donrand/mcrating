-- peak_rating カラム追加 + バックフィル
-- Supabase SQL Editor で実行してください

-- 1. mcs テーブルにカラム追加
ALTER TABLE mcs ADD COLUMN IF NOT EXISTS peak_rating numeric DEFAULT 1500;

-- 2. _recalc_scratch テーブルにカラム追加
ALTER TABLE _recalc_scratch ADD COLUMN IF NOT EXISTS peak_rating numeric DEFAULT 1500;

-- 3. 既存レーティング履歴からバックフィル
UPDATE mcs SET peak_rating = COALESCE(
  (SELECT MAX(r.rating_after) FROM ratings r WHERE r.mc_id = mcs.id),
  current_rating
);
