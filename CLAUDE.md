# mcrating-web

MCバトルレーティングサイト。国内MCバトルシーン（UMB・KOK・戦極など）の拡張Eloレーティングランキングを公開するNext.jsアプリ。

## 環境・URL

| 環境 | URL |
|------|-----|
| 本番 | https://mcrating.vercel.app |
| ローカル | http://localhost:3000 |
| 管理画面 | https://mcrating.vercel.app/admin |
| GitHub | https://github.com/donrand/mcrating |
| Supabase | https://supabase.com/dashboard/project/vwwqbhadrzugvjtbmrbk |

## 技術スタック

Next.js 14（App Router）+ TypeScript + Tailwind CSS / Supabase（PostgreSQL + Auth）/ Vercel / Recharts

## ローカル開発

```bash
cd /workspaces/ClaudeCode/mcrating-web
npm run dev    # http://localhost:3000
npm run build  # デプロイ前に必ず実行
```

## よく使うコマンド（Skillsとして定義済み）

> **重要:** 以下のコマンドに該当する作業は必ず `Skill` ツールで呼び出すこと。手動で git コマンドや手順を実行しない。トークン節約・一貫性のため。

| コマンド | 用途 |
|---------|------|
| `/deploy` | ビルド確認 + git push（デプロイ時は必ずこれを使う） |
| `/recalculate` | 全レーティング再計算 |
| `/seed` | JSONからバトルデータ一括投入 |
| `/merge-mc` | MC名義統合 |
| `/add-page` | 新ページ・Server Action追加パターン |

## Subagents

| エージェント | 用途 |
|------------|------|
| `admin-reviewer` | 投稿レビュー・承認・バトル削除フロー |
| `data-registrar` | CSV登録・seed・tournament_master管理 |

---

## ページ構成とファイルマップ

| URL | ファイル | revalidate |
|-----|---------|------------|
| `/` | `app/page.tsx` + `RankingPage.tsx` | 60秒 |
| `/battles` | `app/battles/page.tsx` + `BattlesClient.tsx` | 300秒 |
| `/tournaments` | `app/tournaments/page.tsx` | 3600秒 |
| `/tournaments/[id]` | `app/tournaments/[id]/page.tsx` | 3600秒 |
| `/about` | `app/about/page.tsx` | static |
| `/submit` | `app/submit/page.tsx` | — |
| `/mc/[id]` | `app/mc/[id]/page.tsx` | 60秒 |
| `/admin/*` | `app/admin/` | no-cache |

### 主要ファイル

| ファイル | 役割 |
|---------|------|
| `lib/supabase.ts` | Supabaseクライアント + 型定義（MC, Battle, Rating, Tournament, Submission） |
| `lib/rating.ts` | 拡張Eloレーティング計算ロジック |
| `middleware.ts` | `/admin/*` の認証保護 |
| `data/tournament_master.ts` | 大会一覧ページのマスタデータ |

---

## データベーススキーマ

```
mcs          MCマスタ（name, current_rating, battle_count, is_active）
tournaments  大会マスタ（name, grade_coeff, held_on）
battles      試合結果（mc_a_id, mc_b_id, winner, round_name, status, tournament_id）
ratings      レーティング変動履歴（mc_id, battle_id, rating_before, rating_after, delta）
submissions  一般投稿受付（status: pending/approved/rejected）
```

RLS: `battles` は `status = 'approved'` のみ SELECT 可。書き込みはすべて `createAdminClient()`（service_role）。

FK制約: `ratings.battle_id → battles.id`、`battles.tournament_id → tournaments.id`（削除順に注意）

---

## レーティングアルゴリズム

```
新レート = 旧レート + K × 大会格係数 × (結果 - 期待勝率)
K = 20 / 初期レート = 1500 / 下限 = 1000
期待勝率 = 1 / (1 + 10^((相手レート - 自分レート) / 400))
```

計算順序: `held_on` → `ROUND_ORDER`（1回戦/シード戦/2回戦/ベスト16/ベスト8/準決勝/決勝）

全再計算は PostgreSQL 関数 `recalculate_all_ratings()` で実行（DB内完結、タイムアウトなし）。

---

## Supabaseクエリのルール

- `select('*')` 禁止。必要なカラムのみ指定する
- FK が複数ある場合は FK名を明示: `.select('mc_a:mcs!battles_mc_a_id_fkey(id, name)')`
- ネスト結果の型キャスト: `(data ?? []) as unknown as MyRow[]`
- 型は `lib/supabase.ts` から import する

### クライアント使い分け

| 場所 | クライアント |
|------|------------|
| Server Components / Server Actions（公開データ） | `supabase`（lib/supabase.ts） |
| Server Actions（書き込み・管理操作） | `createAdminClient()` |
| Client Components | `supabase`（anon key） |
| middleware.ts | `createMiddlewareClient()` |

---

## キャッシュ戦略

```typescript
export const revalidate = 60;    // ランキング・MCプロフィール
export const revalidate = 300;   // 試合一覧
export const revalidate = 3600;  // 大会一覧・大会詳細
// 管理画面は設定なし（常にSSR）
```

---

## 既知の設計上の注意点

1. **全再計算はPostgreSQL関数で実行** — TypeScript側でループ処理しないこと（タイムアウトの原因）
2. **`as unknown as Type` の多用** — Supabase の join 型推論の限界のため unavoidable
3. **ランキングは battle_count >= 10 のみ表示** — `app/page.tsx` で `.gte('battle_count', 10)`
4. **tournaments.category は未使用** — スキーマに列があるがクエリに含めない
5. **大会詳細は createAdminClient を使用** — anon key では全カラム取得できない可能性
6. **大会一覧は tournament_master.ts と Supabase をクロス参照** — 新大会追加時は両方更新
7. **MC名義統合後は全再計算が必要**

---

## 環境変数

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開用キー（RLS制限） |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理操作用（絶対にクライアントに露出しないこと） |
