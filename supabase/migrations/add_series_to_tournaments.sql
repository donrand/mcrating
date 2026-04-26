-- tournaments テーブルにシリーズ（大会タグ）カラムを追加
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS series text;
