-- 再計算用スクラッチテーブル（unlogged = WALなしで高速）
-- Supabase SQL Editor で実行してください

CREATE UNLOGGED TABLE IF NOT EXISTS _recalc_scratch (
  mc_id          uuid    PRIMARY KEY,
  current_rating numeric NOT NULL DEFAULT 1500,
  battle_count   integer NOT NULL DEFAULT 0,
  win_count      integer NOT NULL DEFAULT 0
);

GRANT ALL ON _recalc_scratch TO service_role;
