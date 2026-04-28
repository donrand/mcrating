# mcrating-web 設計ドキュメント

> 最終更新: 2026-04-26

---

## 1. システム概要

国内MCバトルシーン（UMB・KOK・戦極など）の試合結果を蓄積し、拡張Eloレーティングでランキングを公開するWebアプリ。

| 項目 | 内容 |
|------|------|
| 本番URL | https://mcrating.vercel.app |
| 管理画面 | https://mcrating.vercel.app/admin |
| リポジトリ | https://github.com/donrand/mcrating |
| Supabase | vwwqbhadrzugvjtbmrbk |

---

## 2. 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14 (App Router) / TypeScript / Tailwind CSS |
| バックエンド | Next.js Server Actions / Supabase PostgreSQL |
| 認証 | Supabase Auth (メール/パスワード) |
| グラフ | Recharts |
| ホスティング | Vercel |
| DB/BaaS | Supabase (PostgreSQL + RLS) |

---

## 3. アーキテクチャ

```
Browser
  │
  ├── Public Pages (ISR)
  │     app/page.tsx              → ランキング (revalidate: 60s)
  │     app/battles/page.tsx      → 試合一覧  (revalidate: 300s)
  │     app/tournaments/page.tsx  → 大会一覧  (revalidate: 3600s)
  │     app/mc/[id]/page.tsx      → MCプロフィール (revalidate: 60s)
  │     app/submit/page.tsx       → 試合投稿フォーム
  │
  ├── Admin Pages (SSR / no-cache)
  │     middleware.ts             → /admin/* を Supabase Auth で認証ガード
  │     app/admin/**              → 管理者のみアクセス可能
  │
  └── Server Actions
        'use server' 宣言ファイル群
        → Supabase Admin Client (service_role key) でDB書き込み
        → revalidatePath() でISRキャッシュを破棄

Supabase
  ├── PostgreSQL (mcs / tournaments / battles / ratings / submissions / series)
  ├── RLS: battles は status='approved' のみ SELECT 可
  ├── recalculate_all_ratings()  PostgreSQL関数（全再計算）
  └── Supabase Auth (管理者ログイン)
```

### レンダリング方式

| ページ | 方式 | 理由 |
|--------|------|------|
| ランキング・MCプロフィール | ISR (60s) | 読み取り多数、リアルタイム不要 |
| 試合一覧 | ISR (300s) | 更新頻度低め |
| 大会一覧・大会詳細 | ISR (3600s) | 静的に近い |
| 管理画面全般 | SSR (no-cache) | 常に最新データ必要 |
| 試合投稿 | CSR | フォームのみ、データ取得なし |

---

## 4. ページ構成

### 公開ページ

| URL | Server Component ファイル | Client Component | 説明 |
|-----|--------------------------|-----------------|------|
| `/` | `app/page.tsx` | `RankingPage.tsx` | Eloランキング表（battle_count≥5のみ表示） |
| `/battles` | `app/battles/page.tsx` | `BattlesClient.tsx` | 試合結果一覧（フィルタ・ページネーション） |
| `/tournaments` | `app/tournaments/page.tsx` | `TournamentsClient.tsx` | 大会一覧（tournament_master.ts と Supabase のクロス参照） |
| `/tournaments/[id]` | `app/tournaments/[id]/page.tsx` | — | 大会詳細・出場結果 |
| `/mc/[id]` | `app/mc/[id]/page.tsx` | — | MCプロフィール・レーティング推移グラフ |
| `/submit` | `app/submit/page.tsx` | `SubmitForm.tsx` / `BulkSubmitForm.tsx` | 一般ユーザーの試合投稿 |
| `/about` | `app/about/page.tsx` | — | サイト説明 |

### 管理画面

| URL | 機能 |
|-----|------|
| `/admin` | 投稿レビュー（承認 / 却下） |
| `/admin/register` | バトル一括登録（フォーム入力 + CSVインポート） |
| `/admin/battles` | 登録済みバトルの検索・削除・全再計算 |
| `/admin/corrections` | ユーザーからの誤り報告レビュー |
| `/admin/coefficients` | 大会格係数の編集 |
| `/admin/series` | シリーズ（UMB・KOK など）の追加・削除 |
| `/admin/guide` | 管理者向け操作ガイド |
| `/admin/login` | ログインフォーム |

---

## 5. データベーススキーマ

### テーブル一覧

```
mcs
  id            uuid PK
  name          text NOT NULL
  name_kana     text
  region        text
  profile       text
  image_url     text
  is_active     boolean DEFAULT true
  current_rating  numeric DEFAULT 1500
  battle_count    integer DEFAULT 0
  created_at    timestamptz

tournaments
  id            uuid PK
  name          text NOT NULL
  category      text          ※未使用（クエリに含めないこと）
  grade_coeff   numeric NOT NULL
  held_on       date
  series        text          ← tournaments.series (FK: series.name)
  created_at    timestamptz

battles
  id            uuid PK
  tournament_id uuid FK → tournaments.id
  mc_a_id       uuid FK → mcs.id
  mc_b_id       uuid FK → mcs.id
  winner        text CHECK IN ('a','b','draw')
  round_name    text
  evidence_url  text
  note          text
  status        text CHECK IN ('pending','approved','rejected')
  reject_reason text
  submitted_at  timestamptz
  approved_at   timestamptz

ratings
  id            uuid PK
  mc_id         uuid FK → mcs.id
  battle_id     uuid FK → battles.id
  rating_before numeric
  rating_after  numeric
  delta         numeric
  created_at    timestamptz

submissions
  id              uuid PK
  tournament_name text
  held_on         date
  mc_a_name       text
  mc_b_name       text
  winner          text
  round_name      text
  evidence_url    text
  note            text
  status          text CHECK IN ('pending','approved','rejected')
  reject_reason   text
  submitted_at    timestamptz

series
  id    uuid PK
  name  text NOT NULL UNIQUE
```

### RLS ポリシー

| テーブル | SELECT | INSERT/UPDATE/DELETE |
|---------|--------|----------------------|
| `battles` | `status = 'approved'` のみ | service_role のみ |
| `mcs` | 全行 | service_role のみ |
| `ratings` | 全行 | service_role のみ |
| `tournaments` | 全行 | service_role のみ |
| `submissions` | 全行 | 全ユーザー INSERT 可 / service_role で UPDATE |
| `series` | 全行 | service_role のみ |

### FK制約・削除順序

バトルを削除する際は以下の順番で行うこと（FK制約のため）：

1. `ratings` の該当 `battle_id` 行を削除
2. `battles` の行を削除

大会を削除する際：
1. 関連する `ratings` を削除
2. 関連する `battles` を削除
3. `tournaments` の行を削除

---

## 6. レーティングアルゴリズム

### 計算式

```
新レート = max(1000, 旧レート + 出場ボーナス + Kファクター)

Kファクター = K × 大会格係数 × (実績スコア - 期待勝率)
期待勝率   = 1 / (1 + 10^((相手レート - 自分レート) / 400))
出場ボーナス = 大会格係数 × 5pt（勝者のみ）

定数:
  K            = 20
  初期レート    = 1500
  レート下限    = 1000
```

### 実績スコア

| 結果 | 勝者スコア | 敗者スコア |
|------|-----------|-----------|
| 勝利 | 1.0 | 0.0 |
| 引き分け | 0.5 | 0.5 |

### 大会格係数

| 係数 | 対象 |
|------|------|
| 3.0 | 主要大会（UMB・KOK・戦極） |
| 1.5 | 地方大会 |
| 1.0 | 地下バトル |

### 全再計算

`recalculate_all_ratings()` PostgreSQL関数で実行。計算順序:

1. `tournaments.held_on` 昇順
2. ラウンド順: `1回戦 → シード戦 → 2回戦 → ベスト16 → ベスト8 → 準決勝 → 決勝`

TypeScript側でのループ処理は禁止（タイムアウト原因）。

---

## 7. 認証フロー

```
ブラウザ → /admin/xxx
  ↓
middleware.ts
  ├── supabase.auth.getUser() でセッション確認
  ├── 未ログイン → /admin/login にリダイレクト
  └── ログイン済み → 通過

/admin/login (LoginForm.tsx)
  → supabase.auth.signInWithPassword()
  → セッションCookie をセット
  → /admin へリダイレクト

各 Server Action
  → requireAdmin(): createSupabaseServerClient().auth.getUser()
  → user が null なら throw Error（二重チェック）
```

### Supabaseクライアントの使い分け

| 使用箇所 | クライアント | キー |
|---------|------------|------|
| Server Components / Server Actions（読み取り） | `supabase` (lib/supabase.ts) | ANON KEY |
| Server Actions（書き込み・管理操作） | `createAdminClient()` | SERVICE_ROLE KEY |
| Client Components | `supabase` (lib/supabase.ts) | ANON KEY |
| middleware.ts | `createMiddlewareClient()` | ANON KEY |

---

## 8. データ登録フロー

### 管理者による一括登録（主要フロー）

```
/admin/register (RegisterClient.tsx)
  │
  ├── ① 大会設定
  │     既存大会を選択 または 新規名称を入力
  │     シリーズ / 開催日 / 大会格係数 を設定
  │
  ├── ② 出場MC登録
  │     MC名をタグとして登録（オプション）
  │     登録するとバトル入力がドロップダウン化
  │     未登録時は全MCからドロップダウン選択
  │
  ├── ③ ラウンド設定
  │     使用するラウンドをトグルで選択
  │     デフォルト: 1回戦 / 2回戦 / 準決勝 / 決勝
  │
  ├── ④ バトル入力
  │     MC A / MC B / 勝者 / ラウンド をドロップダウンで入力
  │     行を追加して複数バトルを一括入力
  │
  └── 登録ボタン → registerBattles() Server Action
        ├── 大会を解決（既存更新 or 新規INSERT）
        ├── MC名を解決（既存検索 or 新規INSERT）
        ├── 同一大会内の重複バトルをスキップ
        ├── 現在レートを取得 → calcRatingDelta() で変動計算
        ├── battles / ratings を INSERT
        ├── mcs.current_rating / battle_count を UPDATE
        └── revalidatePath() でISRキャッシュをクリア
```

### CSVインポート（折りたたみで利用可能）

```
フォーマット: tournament_name, held_on, grade_coeff, mc_a, mc_b, winner[, round[, series]]

parseCsv() → TournamentGroup[] に変換
  └── registerMultipleTournaments() → 各グループで registerBattles() を呼出
```

### 一般ユーザー投稿フロー

```
/submit (SubmitForm.tsx)
  └── submitBattle() → submissions テーブルに INSERT (status: 'pending')

/admin (AdminReviewClient.tsx)
  ├── approveSubmission()
  │     → submissions から battles に転記
  │     → レーティング計算・更新
  │     → submissions.status = 'approved'
  └── rejectSubmission()
        → submissions.status = 'rejected'
        → reject_reason を記録
```

---

## 9. ファイル構成

```
mcrating-web/
├── app/
│   ├── layout.tsx                    # ルートレイアウト（フォント・グローバルCSS）
│   ├── page.tsx                      # ランキングページ（ISR 60s）
│   ├── RankingPage.tsx               # ランキングテーブル Client Component
│   ├── about/page.tsx                # 静的説明ページ
│   ├── battles/
│   │   ├── page.tsx                  # 試合一覧（ISR 300s）
│   │   └── BattlesClient.tsx         # フィルタ・ページネーション
│   ├── tournaments/
│   │   ├── page.tsx                  # 大会一覧（ISR 3600s）
│   │   ├── [id]/page.tsx             # 大会詳細（ISR 3600s）
│   │   └── TournamentsClient.tsx
│   ├── mc/[id]/page.tsx              # MCプロフィール（ISR 60s）
│   ├── submit/
│   │   ├── page.tsx
│   │   ├── actions.ts                # submitBattle()
│   │   └── bulkSubmit.ts             # 複数投稿ハンドラ
│   └── admin/
│       ├── page.tsx                  # 投稿レビュー
│       ├── actions.ts                # approveSubmission() / rejectSubmission()
│       ├── AdminNav.tsx              # タブナビゲーション
│       ├── AdminReviewClient.tsx
│       ├── LogoutButton.tsx
│       ├── login/                    # ログインページ
│       ├── register/                 # バトル一括登録
│       │   ├── page.tsx
│       │   ├── actions.ts            # registerBattles() / registerMultipleTournaments()
│       │   └── RegisterClient.tsx    # 4セクション構成フォーム
│       ├── battles/                  # バトル管理・削除
│       │   ├── actions.ts            # deleteBattles() / recalculateAllRatings()
│       │   └── BattleDeleteClient.tsx
│       ├── corrections/              # 誤り報告レビュー
│       │   └── actions.ts            # applyCorrection() / dismissCorrection()
│       ├── coefficients/             # 大会格係数管理
│       │   └── actions.ts            # updateTournamentCoeff()
│       ├── series/                   # シリーズ管理
│       │   └── actions.ts            # addSeries() / deleteSeries()
│       └── guide/page.tsx            # 操作ガイド
│
├── lib/
│   ├── supabase.ts                   # クライアント + 全型定義
│   ├── supabase-server.ts            # Server Component用クライアント
│   ├── supabase-middleware.ts        # middleware用クライアント
│   └── rating.ts                     # calcRatingDelta() / expectedScore()
│
├── components/
│   ├── RankingTable.tsx
│   ├── RatingChart.tsx               # Recharts レーティング推移グラフ
│   ├── SubmitForm.tsx
│   ├── BulkSubmitForm.tsx
│   ├── SubmitTabs.tsx
│   └── ReportButton.tsx
│
├── data/
│   ├── tournament_master.ts          # 大会一覧ページのマスタデータ
│   ├── seed.ts                       # 初期データ投入スクリプト
│   └── *.json                        # 各大会のシードデータ
│
├── docs/
│   ├── design.md                     # 本ドキュメント
│   ├── admin-csv-import.md           # CSV取込ガイド
│   └── maintenance-guide.md          # 保守手順
│
├── .claude/
│   ├── commands/                     # Claude Code スキル定義
│   │   ├── deploy.md                 # /deploy
│   │   ├── recalculate.md            # /recalculate
│   │   ├── seed.md                   # /seed
│   │   ├── merge-mc.md               # /merge-mc
│   │   └── add-page.md               # /add-page
│   └── agents/
│       ├── admin-reviewer.md         # 投稿レビュー・承認フロー
│       └── data-registrar.md         # データ登録・seed管理
│
├── middleware.ts                     # /admin/* 認証ガード
├── CLAUDE.md                         # Claude Code 向けプロジェクト説明
└── next.config.js
```

---

## 10. 型定義（lib/supabase.ts）

```typescript
type MC = {
  id, name, name_kana, region, profile, image_url,
  is_active, current_rating, battle_count, created_at
}

type Tournament = {
  id, name, category(未使用), grade_coeff, held_on, created_at
}

type Battle = {
  id, tournament_id, mc_a_id, mc_b_id,
  winner: 'a' | 'b' | 'draw',
  round_name, evidence_url, note,
  status: 'pending' | 'approved' | 'rejected',
  reject_reason, submitted_at, approved_at
}

type Rating = {
  id, mc_id, battle_id,
  rating_before, rating_after, delta, created_at
}

type BattleCorrection = {
  id, battle_id, description,
  suggested_winner: 'a' | 'b' | 'draw' | null,
  suggested_round, evidence_url,
  status: 'pending' | 'resolved' | 'dismissed',
  submitted_at, resolved_at
}

type Submission = {
  id, tournament_name, held_on,
  mc_a_name, mc_b_name,
  winner: 'a' | 'b' | 'draw',
  round_name, evidence_url, note,
  status: 'pending' | 'approved' | 'rejected',
  reject_reason, submitted_at
}
```

---

## 11. Supabaseクエリのルール

- `select('*')` 禁止。必要なカラムのみ指定する
- FK が複数ある場合は FK名を明示:
  ```typescript
  .select('mc_a:mcs!battles_mc_a_id_fkey(id, name)')
  ```
- ネスト結果の型キャスト:
  ```typescript
  (data ?? []) as unknown as MyRow[]
  ```
- `tournaments.category` は存在するがクエリに含めないこと

---

## 12. 環境変数

| 変数名 | 用途 | 公開可否 |
|--------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | 公開可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS制限付き読み取りキー | 公開可 |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理操作用フルアクセスキー | **秘密** (クライアントに露出禁止) |

---

## 13. 既知の設計上の注意点

1. **全再計算はPostgreSQL関数で実行** — TypeScript側でループ処理しないこと（タイムアウト原因）
2. **`as unknown as Type` の多用** — Supabaseのjoin型推論の限界のため unavoidable
3. **ランキングは battle_count ≥ 5 のみ表示** — `app/page.tsx` の `.gte('battle_count', 5)`
4. **tournaments.category は未使用** — スキーマに列があるがクエリに含めない
5. **大会詳細は createAdminClient を使用** — anon keyでは全カラム取得できない可能性
6. **大会一覧は tournament_master.ts と Supabase をクロス参照** — 新大会追加時は両方更新が必要
7. **MC名義統合後は全再計算が必要** — `/merge-mc` スキル実行後に `/recalculate` を実行
8. **registerBattles() はレーティングを逐次計算** — 同一バッチ内の試合順序が結果に影響する

---

## 14. Claude Code スキル・エージェント

### スキル（`/deploy` などで呼び出す）

| コマンド | 処理内容 |
|---------|---------|
| `/deploy` | `npm run build` でビルド確認後 `git push` |
| `/recalculate` | `recalculate_all_ratings()` を呼び出してレーティング全再計算 |
| `/seed` | JSONファイルから `registerMultipleTournaments()` でバトルデータ一括投入 |
| `/merge-mc` | 指定したMC名義を統合し全再計算 |
| `/add-page` | 新ページ・Server Action のボイラープレート生成 |

### エージェント

| エージェント | 用途 |
|------------|------|
| `admin-reviewer` | 投稿レビュー・承認・バトル削除フロー |
| `data-registrar` | CSV登録・seed・tournament_master管理 |
