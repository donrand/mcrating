-- 010_recalculate_fn_v3.sql
-- grade_coeff = clamp(1.0, 3.0, B_tier × Q_participants)
-- B_tier: A=2.6 / B=2.2 / C=1.8 / D=1.4 / E=1.1
-- Q = clamp(0.92, 1.08, 1 + 0.12 × (T-Y)/σY)
-- 009_tier_5level.sql を先に実行してください

CREATE OR REPLACE FUNCTION recalculate_all_ratings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10min'
AS $$
DECLARE
  -- Elo定数
  c_initial CONSTANT numeric := 1500;
  c_k       CONSTANT numeric := 20;
  c_floor   CONSTANT numeric := 1000;

  -- ティアベース係数
  c_base_a CONSTANT numeric := 2.6;
  c_base_b CONSTANT numeric := 2.2;
  c_base_c CONSTANT numeric := 1.8;
  c_base_d CONSTANT numeric := 1.4;
  c_base_e CONSTANT numeric := 1.1;

  -- Q_participants パラメータ
  c_alpha   CONSTANT numeric := 0.12;
  c_q_min   CONSTANT numeric := 0.92;
  c_q_max   CONSTANT numeric := 1.08;

  -- grade_coeff クランプ
  c_coeff_min CONSTANT numeric := 1.0;
  c_coeff_max CONSTANT numeric := 3.0;

  c_version CONSTANT int := 3;

  -- 年間統計
  v_current_year int := NULL;
  v_y            numeric;
  v_sigma_y      numeric;

  -- 大会ループ変数
  t_rec              RECORD;
  v_t                numeric;
  v_z                numeric;
  v_q                numeric;
  v_participant_count int;
  v_b_tier           numeric;
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

  TRUNCATE _recalc_scratch;
  INSERT INTO _recalc_scratch (mc_id, current_rating, battle_count, win_count, peak_rating)
  SELECT id, c_initial, 0, 0, c_initial FROM mcs;

  TRUNCATE ratings;

  FOR t_rec IN
    SELECT
      t.id         AS tournament_id,
      t.manual_tier,
      COALESCE(t.held_on, '1900-01-01'::date) AS held_on,
      EXTRACT(YEAR FROM COALESCE(t.held_on, '1900-01-01'::date))::int AS year
    FROM tournaments t
    WHERE EXISTS (
      SELECT 1 FROM battles b WHERE b.tournament_id = t.id AND b.status = 'approved'
    )
    ORDER BY COALESCE(t.held_on, '1900-01-01'::date), t.id
  LOOP
    -- 年が変わったら年間統計を更新（1試合以上経験MCのみ）
    IF t_rec.year IS DISTINCT FROM v_current_year THEN
      v_current_year := t_rec.year;
      SELECT avg(current_rating), stddev_samp(current_rating)
      INTO v_y, v_sigma_y
      FROM _recalc_scratch
      WHERE battle_count > 0;
    END IF;

    -- T: 大会参加者の平均レート（大会直前時点）
    SELECT count(DISTINCT p.mc_id), avg(s.current_rating)
    INTO v_participant_count, v_t
    FROM (
      SELECT mc_a_id AS mc_id FROM battles
      WHERE tournament_id = t_rec.tournament_id AND status = 'approved'
      UNION
      SELECT mc_b_id AS mc_id FROM battles
      WHERE tournament_id = t_rec.tournament_id AND status = 'approved'
    ) p
    JOIN _recalc_scratch s ON s.mc_id = p.mc_id;

    -- B_tier: manual_tier から固定ベース係数を決定
    v_b_tier := CASE t_rec.manual_tier
      WHEN 'A' THEN c_base_a
      WHEN 'B' THEN c_base_b
      WHEN 'C' THEN c_base_c
      WHEN 'D' THEN c_base_d
      WHEN 'E' THEN c_base_e
      ELSE c_base_b  -- 未設定はB扱い
    END;

    -- Q_participants: 参加者レートによる微調整 (clamp 0.92〜1.08)
    IF v_participant_count < 8 OR v_sigma_y IS NULL OR v_sigma_y = 0 THEN
      v_q := 1.0;
      v_z := NULL;
    ELSE
      v_z := round(((v_t - v_y) / v_sigma_y)::numeric, 3);
      v_q := GREATEST(c_q_min, LEAST(c_q_max, 1.0 + c_alpha * v_z));
    END IF;

    -- grade_coeff = clamp(1.0, 3.0, B_tier × Q)
    v_grade_coeff := GREATEST(c_coeff_min,
                     LEAST(c_coeff_max,
                     round((v_b_tier * v_q)::numeric, 3)));

    v_final_tier := COALESCE(t_rec.manual_tier, 'B');

    -- 大会テーブルに計算結果を保存
    UPDATE tournaments
    SET
      final_tier        = v_final_tier,
      grade_coeff       = v_grade_coeff,
      tier_t            = round(v_t::numeric, 1),
      tier_y            = round(v_y::numeric, 1),
      tier_sigma_y      = round(v_sigma_y::numeric, 3),
      tier_z            = v_z,
      tier_q            = round(v_q::numeric, 4),
      tier_calc_version = c_version
    WHERE id = t_rec.tournament_id;

    -- バトルをラウンド順に処理
    FOR rec IN
      SELECT b.id, b.mc_a_id, b.mc_b_id, b.winner
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
      v_ra := COALESCE((SELECT current_rating FROM _recalc_scratch WHERE mc_id = rec.mc_a_id), c_initial);
      v_rb := COALESCE((SELECT current_rating FROM _recalc_scratch WHERE mc_id = rec.mc_b_id), c_initial);

      v_exp_a := 1.0 / (1.0 + power(10.0, (v_rb - v_ra) / 400.0));

      IF rec.winner = 'a' THEN v_sa := 1.0; v_sb := 0.0;
      ELSIF rec.winner = 'b' THEN v_sa := 0.0; v_sb := 1.0;
      ELSE v_sa := 0.5; v_sb := 0.5;
      END IF;

      v_da := round((c_k * v_grade_coeff * (v_sa - v_exp_a))::numeric, 1);
      v_db := round((c_k * v_grade_coeff * (v_sb - (1.0 - v_exp_a)))::numeric, 1);
      v_na := round(greatest(c_floor, v_ra + v_da)::numeric, 1);
      v_nb := round(greatest(c_floor, v_rb + v_db)::numeric, 1);

      INSERT INTO ratings (mc_id, battle_id, rating_before, rating_after, delta)
      VALUES (rec.mc_a_id, rec.id, v_ra, v_na, v_da),
             (rec.mc_b_id, rec.id, v_rb, v_nb, v_db);

      UPDATE _recalc_scratch SET
        current_rating = v_na,
        battle_count   = battle_count + 1,
        win_count      = win_count + CASE WHEN rec.winner = 'a' THEN 1 ELSE 0 END,
        peak_rating    = GREATEST(peak_rating, v_na)
      WHERE mc_id = rec.mc_a_id;

      UPDATE _recalc_scratch SET
        current_rating = v_nb,
        battle_count   = battle_count + 1,
        win_count      = win_count + CASE WHEN rec.winner = 'b' THEN 1 ELSE 0 END,
        peak_rating    = GREATEST(peak_rating, v_nb)
      WHERE mc_id = rec.mc_b_id;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  UPDATE mcs m
  SET
    current_rating = s.current_rating,
    battle_count   = s.battle_count,
    win_count      = s.win_count,
    peak_rating    = s.peak_rating
  FROM _recalc_scratch s
  WHERE m.id = s.mc_id;

  RETURN json_build_object('battles_processed', v_count, 'calc_version', c_version);
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_all_ratings() TO service_role;
