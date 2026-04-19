import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 管理者操作用（サービスロールキーが必要な操作はサーバーサイドのみ使用）
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

// 型定義
export type MC = {
  id: string;
  name: string;
  name_kana: string | null;
  region: string | null;
  profile: string | null;
  image_url: string | null;
  is_active: boolean;
  current_rating: number;
  battle_count: number;
  created_at: string;
};

export type Tournament = {
  id: string;
  name: string;
  category: string | null;
  grade_coeff: number;
  held_on: string | null;
  created_at: string;
};

export type Battle = {
  id: string;
  tournament_id: string;
  mc_a_id: string;
  mc_b_id: string;
  winner: 'a' | 'b' | 'draw';
  round_name: string | null;
  evidence_url: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  submitted_at: string;
  approved_at: string | null;
};

export type Rating = {
  id: string;
  mc_id: string;
  battle_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
  created_at: string;
};

export type BattleCorrection = {
  id: string;
  battle_id: string;
  description: string;
  suggested_winner: 'a' | 'b' | 'draw' | null;
  suggested_round: string | null;
  evidence_url: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  submitted_at: string;
  resolved_at: string | null;
};

export type Submission = {
  id: string;
  tournament_name: string;
  held_on: string;
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw';
  round_name: string | null;
  evidence_url: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  submitted_at: string;
};
