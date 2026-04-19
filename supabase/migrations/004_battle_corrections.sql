-- バトルの誤り報告テーブル
CREATE TABLE IF NOT EXISTS battle_corrections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id   UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  suggested_winner  TEXT CHECK (suggested_winner IN ('a','b','draw')) DEFAULT NULL,
  suggested_round   TEXT DEFAULT NULL,
  evidence_url      TEXT DEFAULT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ DEFAULT NULL
);

-- RLS
ALTER TABLE battle_corrections ENABLE ROW LEVEL SECURITY;

-- 一般ユーザーは INSERT のみ（anon key で OK）
CREATE POLICY "public_insert_corrections"
  ON battle_corrections FOR INSERT
  WITH CHECK (true);

-- SELECT は全員許可（管理画面でservice_roleを使うが念のため）
CREATE POLICY "public_select_corrections"
  ON battle_corrections FOR SELECT
  USING (true);
