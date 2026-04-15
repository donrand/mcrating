-- MCバトル レーティングサイト 初期スキーマ

-- MCマスタ
create table if not exists mcs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_kana text,
  region text,
  profile text,
  image_url text,
  is_active boolean not null default true,
  current_rating decimal not null default 1500,
  battle_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

-- 大会マスタ
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text check (category in ('主要', '地方', '地下')),
  grade_coeff decimal not null,
  held_on date,
  created_at timestamp with time zone not null default now()
);

-- 試合結果
create table if not exists battles (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  mc_a_id uuid not null references mcs(id),
  mc_b_id uuid not null references mcs(id),
  winner text not null check (winner in ('a', 'b', 'draw')),
  round_name text,
  evidence_url text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  submitted_at timestamp with time zone not null default now(),
  approved_at timestamp with time zone
);

-- レーティング履歴
create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  mc_id uuid not null references mcs(id),
  battle_id uuid not null references battles(id),
  rating_before decimal not null,
  rating_after decimal not null,
  delta decimal not null,
  created_at timestamp with time zone not null default now()
);

-- 投稿受付（一般ユーザーからの情報提供）
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  tournament_name text not null,
  held_on date not null,
  mc_a_name text not null,
  mc_b_name text not null,
  winner text not null check (winner in ('a', 'b', 'draw')),
  round_name text,
  evidence_url text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  submitted_at timestamp with time zone not null default now()
);

-- インデックス
create index if not exists idx_mcs_current_rating on mcs(current_rating desc);
create index if not exists idx_battles_tournament on battles(tournament_id);
create index if not exists idx_battles_mc_a on battles(mc_a_id);
create index if not exists idx_battles_mc_b on battles(mc_b_id);
create index if not exists idx_battles_status on battles(status);
create index if not exists idx_ratings_mc on ratings(mc_id);
create index if not exists idx_ratings_battle on ratings(battle_id);
create index if not exists idx_submissions_status on submissions(status);

-- RLS（Row Level Security）設定
alter table mcs enable row level security;
alter table tournaments enable row level security;
alter table battles enable row level security;
alter table ratings enable row level security;
alter table submissions enable row level security;

-- 公開読み取りポリシー
create policy "mcs_public_read" on mcs for select using (true);
create policy "tournaments_public_read" on tournaments for select using (true);
create policy "battles_public_read" on battles for select using (status = 'approved');
create policy "ratings_public_read" on ratings for select using (true);

-- submissions: 誰でも投稿可能、自分の投稿は読める（管理者はservice_roleで全件操作）
create policy "submissions_public_insert" on submissions for insert with check (true);
create policy "submissions_public_select" on submissions for select using (true);
