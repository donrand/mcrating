-- 006_tier_system.sql
-- tournamentsテーブルにティア関連カラムを追加し、監査ログテーブルを作成する
-- Supabase SQL Editor で実行してください

-- tournaments にティア・計算根拠カラムを追加
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS auto_tier        text CHECK (auto_tier IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS manual_tier      text CHECK (manual_tier IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS final_tier       text CHECK (final_tier IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS tier_calc_version int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_locked      boolean DEFAULT false,
  -- z-score計算の根拠値（管理画面での透明性のため保存）
  ADD COLUMN IF NOT EXISTS tier_t           numeric,  -- 大会参加者の平均レート
  ADD COLUMN IF NOT EXISTS tier_y           numeric,  -- その年の開始時平均レート
  ADD COLUMN IF NOT EXISTS tier_sigma_y     numeric,  -- その年の開始時σ
  ADD COLUMN IF NOT EXISTS tier_z           numeric;  -- z-score = (T - Y) / σY

-- 手動ティア変更の監査ログ
CREATE TABLE IF NOT EXISTS tournament_tier_logs (
  id              bigserial PRIMARY KEY,
  tournament_id   uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  changed_by      uuid REFERENCES auth.users(id),
  prev_manual_tier text CHECK (prev_manual_tier IN ('A','B','C')),
  new_manual_tier  text CHECK (new_manual_tier IN ('A','B','C')),
  reason          text,
  auto_tier       text CHECK (auto_tier IN ('A','B','C')),
  final_tier      text CHECK (final_tier IN ('A','B','C'))
);

-- RLS: service_roleのみアクセス可能
ALTER TABLE tournament_tier_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON tournament_tier_logs
  TO service_role USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tier_logs_tournament_id
  ON tournament_tier_logs(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tier_logs_changed_at
  ON tournament_tier_logs(changed_at DESC);
