-- mcs テーブルに win_count カラムを追加
-- Supabase SQL Editor で実行してください

ALTER TABLE mcs ADD COLUMN IF NOT EXISTS win_count integer NOT NULL DEFAULT 0;
