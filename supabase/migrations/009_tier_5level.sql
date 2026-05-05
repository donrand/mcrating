-- 009_tier_5level.sql
-- ティアをA/B/C/D/Eの5段階に拡張し、Q_participants用カラムを追加
-- Supabase SQL Editor で実行してください

-- CHECK制約を更新（A-E対応）
ALTER TABLE tournaments
  DROP CONSTRAINT IF EXISTS tournaments_auto_tier_check,
  DROP CONSTRAINT IF EXISTS tournaments_manual_tier_check,
  DROP CONSTRAINT IF EXISTS tournaments_final_tier_check;

ALTER TABLE tournaments
  ADD CONSTRAINT tournaments_auto_tier_check   CHECK (auto_tier   IN ('A','B','C','D','E')),
  ADD CONSTRAINT tournaments_manual_tier_check CHECK (manual_tier IN ('A','B','C','D','E')),
  ADD CONSTRAINT tournaments_final_tier_check  CHECK (final_tier  IN ('A','B','C','D','E'));

-- Q_participants値を保存するカラムを追加
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS tier_q numeric;

-- 監査ログテーブルのCHECK制約も更新
ALTER TABLE tournament_tier_logs
  DROP CONSTRAINT IF EXISTS tournament_tier_logs_prev_manual_tier_check,
  DROP CONSTRAINT IF EXISTS tournament_tier_logs_new_manual_tier_check,
  DROP CONSTRAINT IF EXISTS tournament_tier_logs_auto_tier_check,
  DROP CONSTRAINT IF EXISTS tournament_tier_logs_final_tier_check;

ALTER TABLE tournament_tier_logs
  ADD CONSTRAINT tournament_tier_logs_prev_manual_tier_check CHECK (prev_manual_tier IN ('A','B','C','D','E')),
  ADD CONSTRAINT tournament_tier_logs_new_manual_tier_check  CHECK (new_manual_tier  IN ('A','B','C','D','E')),
  ADD CONSTRAINT tournament_tier_logs_auto_tier_check        CHECK (auto_tier        IN ('A','B','C','D','E')),
  ADD CONSTRAINT tournament_tier_logs_final_tier_check       CHECK (final_tier       IN ('A','B','C','D','E'));
