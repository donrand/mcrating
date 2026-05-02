-- MC名義統合ルールテーブル
-- 再計算時にこのテーブルから alias_name を canonical_name へ統合する
CREATE TABLE IF NOT EXISTS mc_merge_rules (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_name text       NOT NULL,
  alias_name    text        NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (canonical_name, alias_name)
);

-- RLS: service_role のみアクセス可（管理者専用）
ALTER TABLE mc_merge_rules ENABLE ROW LEVEL SECURITY;

-- 既存の統合定義をシード
INSERT INTO mc_merge_rules (canonical_name, alias_name) VALUES
  ('呂布カルマ',               'ヤングたかじん'),
  ('呂布カルマ',               '呂布000カルマ'),
  ('R-指定',                   'R指定'),
  ('MOL53',                    '鬼ピュアワンライン'),
  ('MOL53',                    'RAWAXXX'),
  ('CHEHON',                   'BUFFALO SOLDIER'),
  ('S-kaine',                  'S-kainê'),
  ('MC☆ニガリ a.k.a 赤い稲妻', 'MC☆ニガリa.k.a赤い稲妻'),
  ('MC☆ニガリ a.k.a 赤い稲妻', 'MCニガリ'),
  ('MC☆ニガリ a.k.a 赤い稲妻', 'MC☆ニガリ'),
  ('Fuma no KTR',              '八咫烏'),
  ('Fuma no KTR',              '藤KooS'),
  ('T-TANGG',                  'T-TONGUE'),
  ('T-TANGG',                  'T-Tongue'),
  ('T-TANGG',                  'T-Toungue'),
  ('蛆密',                     'ウジミツ'),
  ('裂固',                     '泰斗a.k.a.裂固'),
  ('Rude-α',                   '5LEEP3ALKER'),
  ('キョンス',                  'Kyons'),
  ('漢 a.k.a. GAMI',           '漢 a.k.a GAMI'),
  ('漢 a.k.a. GAMI',           '漢'),
  ('MU-TON',                   'MUTON'),
  ('MU-TON',                   'COCRGI WHITE'),
  ('T-pablow',                 'K-九'),
  ('Shamis',                   '＄hamis')
ON CONFLICT DO NOTHING;
