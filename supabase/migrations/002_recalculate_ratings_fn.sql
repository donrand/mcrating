-- 全レーティング再計算 PostgreSQL関数
-- Supabase SQL Editor で実行してください
-- 呼び出し: SELECT recalculate_all_ratings();
--           または admin.rpc('recalculate_all_ratings')

CREATE OR REPLACE FUNCTION recalculate_all_ratings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10min'
AS $$
DECLARE
  -- 定数（lib/rating.ts と同値）
  c_initial CONSTANT numeric := 1500;
  c_k       CONSTANT numeric := 20;
  c_floor   CONSTANT numeric := 1000;
  c_bonus   CONSTANT numeric := 5;

  rec       RECORD;

  -- 現在レートと試合数をJSONBでメモリ管理（一時テーブル不要）
  mc_ratings JSONB := '{}'::JSONB;
  mc_counts  JSONB := '{}'::JSONB;

  v_key_a text;
  v_key_b text;
  v_ra    numeric;
  v_rb    numeric;
  v_exp_a numeric;
  v_sa    numeric;
  v_sb    numeric;
  v_ba    numeric;
  v_bb    numeric;
  v_da    numeric;
  v_db    numeric;
  v_na    numeric;
  v_nb    numeric;
  v_count integer := 0;
BEGIN
  -- ── 既存 ratings を全削除（クリーン再構築）──────────────
  DELETE FROM ratings;

  -- ── 承認済みバトルを時系列順に処理 ─────────────────────
  FOR rec IN
    SELECT
      b.id,
      b.mc_a_id,
      b.mc_b_id,
      b.winner,
      COALESCE(t.grade_coeff, 1.0) AS grade_coeff
    FROM battles b
    LEFT JOIN tournaments t ON b.tournament_id = t.id
    WHERE b.status = 'approved'
    ORDER BY
      COALESCE(t.held_on, '1900-01-01'::date),
      CASE b.round_name
        WHEN '1回戦'    THEN 0
        WHEN 'シード戦'  THEN 1
        WHEN '2回戦'    THEN 2
        WHEN 'ベスト16'  THEN 3
        WHEN 'ベスト8'   THEN 4
        WHEN '準決勝'    THEN 5
        WHEN '決勝'      THEN 6
        ELSE 999
      END
  LOOP
    v_key_a := rec.mc_a_id::text;
    v_key_b := rec.mc_b_id::text;

    -- 現在レートを取得（初出場なら初期値）
    v_ra := COALESCE((mc_ratings ->> v_key_a)::numeric, c_initial);
    v_rb := COALESCE((mc_ratings ->> v_key_b)::numeric, c_initial);

    -- 期待勝率（標準 Elo 式）
    v_exp_a := 1.0 / (1.0 + power(10.0, (v_rb - v_ra) / 400.0));

    -- 実際のスコアと勝者ボーナス（勝者のみ付与）
    IF rec.winner = 'a' THEN
      v_sa := 1.0; v_sb := 0.0;
      v_ba := rec.grade_coeff * c_bonus; v_bb := 0;
    ELSIF rec.winner = 'b' THEN
      v_sa := 0.0; v_sb := 1.0;
      v_ba := 0; v_bb := rec.grade_coeff * c_bonus;
    ELSE  -- draw
      v_sa := 0.5; v_sb := 0.5;
      v_ba := 0;   v_bb := 0;
    END IF;

    -- レート変動（小数第1位で丸め）
    v_da := round((v_ba + c_k * rec.grade_coeff * (v_sa - v_exp_a))::numeric, 1);
    v_db := round((v_bb + c_k * rec.grade_coeff * (v_sb - (1.0 - v_exp_a)))::numeric, 1);

    -- 新レート（下限あり）
    v_na := round(greatest(c_floor, v_ra + v_da)::numeric, 1);
    v_nb := round(greatest(c_floor, v_rb + v_db)::numeric, 1);

    -- ratings に挿入
    INSERT INTO ratings (mc_id, battle_id, rating_before, rating_after, delta)
    VALUES
      (rec.mc_a_id, rec.id, v_ra, v_na, v_da),
      (rec.mc_b_id, rec.id, v_rb, v_nb, v_db);

    -- JSONB でメモリ内レートを更新
    mc_ratings := jsonb_set(mc_ratings, ARRAY[v_key_a], to_jsonb(v_na), true);
    mc_ratings := jsonb_set(mc_ratings, ARRAY[v_key_b], to_jsonb(v_nb), true);
    mc_counts  := jsonb_set(mc_counts,  ARRAY[v_key_a],
      to_jsonb(COALESCE((mc_counts ->> v_key_a)::integer, 0) + 1), true);
    mc_counts  := jsonb_set(mc_counts,  ARRAY[v_key_b],
      to_jsonb(COALESCE((mc_counts ->> v_key_b)::integer, 0) + 1), true);

    v_count := v_count + 1;
  END LOOP;

  -- ── 最終レートを mcs テーブルに書き戻し ─────────────────
  UPDATE mcs m
  SET
    current_rating = COALESCE((mc_ratings ->> m.id::text)::numeric, c_initial),
    battle_count   = COALESCE((mc_counts  ->> m.id::text)::integer, 0);

  RETURN json_build_object('battles_processed', v_count);
END;
$$;

-- service_role に実行権限を付与
GRANT EXECUTE ON FUNCTION recalculate_all_ratings() TO service_role;
