-- 007_recalculate_fn_v2.sql
-- 自動ティア判定付き全レーティング再計算関数（v2）
-- 006_tier_system.sql を先に実行してください
-- 呼び出し: SELECT recalculate_all_ratings();

CREATE OR REPLACE FUNCTION recalculate_all_ratings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10min'
AS $$
DECLARE
  -- Elo定数（lib/rating.ts と同値）
  c_initial CONSTANT numeric := 1500;
  c_k       CONSTANT numeric := 20;
  c_floor   CONSTANT numeric := 1000;

  -- ティア係数
  c_coeff_a CONSTANT numeric := 1.15;
  c_coeff_b CONSTANT numeric := 1.00;
  c_coeff_c CONSTANT numeric := 0.90;

  -- 計算バージョン（スキーマ変更時にインクリメント）
  c_version CONSTANT int := 2;

  -- 年間統計
  v_current_year int := NULL;
  v_y            numeric;   -- 年間平均レート
  v_sigma_y      numeric;   -- 年間σ

  -- 大会ループ変数
  t_rec              RECORD;
  v_t                numeric;   -- 大会参加者平均レート
  v_z                numeric;   -- z-score
  v_participant_count int;
  v_auto_tier        text;
  v_final_tier       text;
  v_grade_coeff      numeric;

  -- バトルループ変数
  rec     RECORD;
  v_ra    numeric;
  v_rb    numeric;
  v_exp_a numeric;
  v_sa    numeric;
  v_sb    numeric;
  v_da    numeric;
  v_db    numeric;
  v_na    numeric;
  v_nb    numeric;
  v_count integer := 0;
BEGIN
  LOCK TABLE _recalc_scratch IN EXCLUSIVE MODE;

  -- ── スクラッチテーブルをリセット ──────────────────────────
  TRUNCATE _recalc_scratch;
  INSERT INTO _recalc_scratch (mc_id, current_rating, battle_count, win_count, peak_rating)
  SELECT id, c_initial, 0, 0, c_initial FROM mcs;

  -- 既存 ratings を全削除
  TRUNCATE ratings;

  -- ── 大会を日付順に処理（年→大会→バトル の3重ループ）──────
  FOR t_rec IN
    SELECT
      t.id              AS tournament_id,
      t.manual_tier,
      t.tier_locked,
      COALESCE(t.held_on, '1900-01-01'::date) AS held_on,
      EXTRACT(YEAR FROM COALESCE(t.held_on, '1900-01-01'::date))::int AS year
    FROM tournaments t
    WHERE EXISTS (
      SELECT 1 FROM battles b
      WHERE b.tournament_id = t.id AND b.status = 'approved'
    )
    ORDER BY COALESCE(t.held_on, '1900-01-01'::date), t.id
  LOOP
    -- ── 年が変わったら年間統計を更新 ──────────────────────
    IF t_rec.year IS DISTINCT FROM v_current_year THEN
      v_current_year := t_rec.year;
      -- 1試合以上経験したMCの現時点レートで年間平均・σを算出
      -- （初期値1500のまま未出場のMCは除外して希薄化を防ぐ）
      SELECT
        avg(current_rating),
        stddev_samp(current_rating)
      INTO v_y, v_sigma_y
      FROM _recalc_scratch
      WHERE battle_count > 0;
    END IF;

    -- ── 大会参加者のレートを取得してTを算出 ───────────────
    SELECT
      count(DISTINCT mc_id),
      avg(s.current_rating)
    INTO v_participant_count, v_t
    FROM (
      SELECT mc_a_id AS mc_id
      FROM battles
      WHERE tournament_id = t_rec.tournament_id AND status = 'approved'
      UNION
      SELECT mc_b_id AS mc_id
      FROM battles
      WHERE tournament_id = t_rec.tournament_id AND status = 'approved'
    ) p
    JOIN _recalc_scratch s ON s.mc_id = p.mc_id;

    -- ── z-scoreとauto_tierを決定 ──────────────────────────
    -- tier_locked=trueの場合はmanual_tierを強制適用（自動計算スキップ）
    IF t_rec.tier_locked AND t_rec.manual_tier IS NOT NULL THEN
      v_auto_tier := t_rec.manual_tier;  -- ロック時はauto_tierにも反映
      v_z := NULL;
    ELSIF v_participant_count < 8 OR v_sigma_y IS NULL OR v_sigma_y = 0 THEN
      -- 参加者不足またはσY=0の場合はB固定
      v_auto_tier := 'B';
      v_z := NULL;
    ELSE
      v_z := round(((v_t - v_y) / v_sigma_y)::numeric, 3);
      IF v_z >= 0.5 THEN
        v_auto_tier := 'A';
      ELSIF v_z <= -0.5 THEN
        v_auto_tier := 'C';
      ELSE
        v_auto_tier := 'B';
      END IF;
    END IF;

    -- manual_tierが設定されていればそちらを優先
    v_final_tier := COALESCE(t_rec.manual_tier, v_auto_tier);

    v_grade_coeff := CASE v_final_tier
      WHEN 'A' THEN c_coeff_a
      WHEN 'C' THEN c_coeff_c
      ELSE c_coeff_b
    END;

    -- ── tournamentsテーブルにティア計算結果を保存 ──────────
    UPDATE tournaments
    SET
      auto_tier        = v_auto_tier,
      final_tier       = v_final_tier,
      grade_coeff      = v_grade_coeff,
      tier_t           = round(v_t::numeric, 1),
      tier_y           = round(v_y::numeric, 1),
      tier_sigma_y     = round(v_sigma_y::numeric, 3),
      tier_z           = v_z,
      tier_calc_version = c_version
    WHERE id = t_rec.tournament_id;

    -- ── この大会のバトルをラウンド順に処理 ──────────────────
    FOR rec IN
      SELECT
        b.id,
        b.mc_a_id,
        b.mc_b_id,
        b.winner
      FROM battles b
      WHERE b.tournament_id = t_rec.tournament_id AND b.status = 'approved'
      ORDER BY
        CASE b.round_name
          WHEN '1回戦'   THEN 0
          WHEN 'シード戦' THEN 1
          WHEN '2回戦'   THEN 2
          WHEN 'ベスト16' THEN 3
          WHEN 'ベスト8'  THEN 4
          WHEN '準決勝'   THEN 5
          WHEN '決勝'     THEN 6
          ELSE 999
        END
    LOOP
      -- 現在レートを取得
      v_ra := COALESCE((SELECT current_rating FROM _recalc_scratch WHERE mc_id = rec.mc_a_id), c_initial);
      v_rb := COALESCE((SELECT current_rating FROM _recalc_scratch WHERE mc_id = rec.mc_b_id), c_initial);

      -- 期待勝率（標準Elo式）
      v_exp_a := 1.0 / (1.0 + power(10.0, (v_rb - v_ra) / 400.0));

      -- 実際のスコア
      IF rec.winner = 'a' THEN
        v_sa := 1.0; v_sb := 0.0;
      ELSIF rec.winner = 'b' THEN
        v_sa := 0.0; v_sb := 1.0;
      ELSE
        v_sa := 0.5; v_sb := 0.5;
      END IF;

      -- レート変動（小数第1位で丸め）
      v_da := round((c_k * v_grade_coeff * (v_sa - v_exp_a))::numeric, 1);
      v_db := round((c_k * v_grade_coeff * (v_sb - (1.0 - v_exp_a)))::numeric, 1);

      -- 新レート（下限あり）
      v_na := round(greatest(c_floor, v_ra + v_da)::numeric, 1);
      v_nb := round(greatest(c_floor, v_rb + v_db)::numeric, 1);

      -- ratings に挿入
      INSERT INTO ratings (mc_id, battle_id, rating_before, rating_after, delta)
      VALUES
        (rec.mc_a_id, rec.id, v_ra, v_na, v_da),
        (rec.mc_b_id, rec.id, v_rb, v_nb, v_db);

      -- スクラッチテーブルを更新
      UPDATE _recalc_scratch
      SET
        current_rating = v_na,
        battle_count   = battle_count + 1,
        win_count      = win_count + CASE WHEN rec.winner = 'a' THEN 1 ELSE 0 END,
        peak_rating    = GREATEST(peak_rating, v_na)
      WHERE mc_id = rec.mc_a_id;

      UPDATE _recalc_scratch
      SET
        current_rating = v_nb,
        battle_count   = battle_count + 1,
        win_count      = win_count + CASE WHEN rec.winner = 'b' THEN 1 ELSE 0 END,
        peak_rating    = GREATEST(peak_rating, v_nb)
      WHERE mc_id = rec.mc_b_id;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  -- ── 最終レートを mcs テーブルに書き戻し ───────────────────
  UPDATE mcs m
  SET
    current_rating = s.current_rating,
    battle_count   = s.battle_count,
    win_count      = s.win_count,
    peak_rating    = s.peak_rating
  FROM _recalc_scratch s
  WHERE m.id = s.mc_id;

  RETURN json_build_object(
    'battles_processed', v_count,
    'calc_version', c_version
  );
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_all_ratings() TO service_role;
