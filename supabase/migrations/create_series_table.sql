-- シリーズ管理テーブル
CREATE TABLE IF NOT EXISTS series (
  name text PRIMARY KEY
);

-- 初期データ
INSERT INTO series (name) VALUES
  ('UMB'), ('戦極'), ('KOK'), ('FSD'), ('ADRENALINE'),
  ('SPOTLIGHT'), ('凱旋'), ('罵倒'), ('口喧嘩祭'), ('NEO GENESIS'), ('U-22')
ON CONFLICT DO NOTHING;
