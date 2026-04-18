# mcrating-web — 引継ぎドキュメント

MCバトルレーティングサイト。国内MCバトルシーン（UMB・KOK・戦極など）の拡張Eloレーティングランキングを公開するNext.jsアプリ。

## 環境・URL

| 環境 | URL |
|------|-----|
| 本番 | https://mcrating.vercel.app |
| ローカル | http://localhost:3000 |
| 管理画面（本番） | https://mcrating.vercel.app/admin |
| GitHub | https://github.com/donrand/mcrating |
| Supabase | https://supabase.com/dashboard/project/vwwqbhadrzugvjtbmrbk |

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14（App Router）+ TypeScript + Tailwind CSS |
| DB・認証 | Supabase（PostgreSQL + Auth） |
| ホスティング | Vercel（main push で自動デプロイ） |
| グラフ | Recharts |

## ローカル開発

```bash
cd /workspaces/ClaudeCode/mcrating-web
npm run dev      # http://localhost:3000
npm run build    # ビルドチェック（デプロイ前に必ず実行）
```

`.env.local` が必要（`.env.local.example` 参照）:
```
NEXT_PUBLIC_SUPABASE_URL=https://vwwqbhadrzugvjtbmrbk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## デプロイ

```bash
npm run build  # エラーがないことを確認
git add -A && git commit -m "変更内容" && git push
# → Vercel が main への push で自動デプロイ
```

---

## ページ構成とファイルマップ

| URL | ファイル | 役割 | revalidate |
|-----|---------|------|------------|
| `/` | `app/page.tsx` + `app/RankingPage.tsx` | ランキング表示 | 60秒 |
| `/battles` | `app/battles/page.tsx` + `BattlesClient.tsx` | 試合履歴・MC名検索・ページネーション | 300秒 |
| `/tournaments` | `app/tournaments/page.tsx` | 大会一覧（カテゴリ別・登録状況表示） | 3600秒 |
| `/tournaments/[id]` | `app/tournaments/[id]/page.tsx` | 大会詳細 | 3600秒 |
| `/about` | `app/about/page.tsx` | レーティング説明・連絡先 | static |
| `/submit` | `app/submit/page.tsx` | 情報提供フォーム（匿名） | — |
| `/mc/[id]` | `app/mc/[id]/page.tsx` | MCプロフィール・レート推移・試合履歴ページネーション | 60秒 |
| `/admin` | `app/admin/page.tsx` + `AdminReviewClient.tsx` | 投稿レビュー | no-cache |
| `/admin/battles` | `app/admin/battles/page.tsx` + `BattleDeleteClient.tsx` | バトル削除・全再計算 | no-cache |
| `/admin/coefficients` | `app/admin/coefficients/page.tsx` + `CoefficientClient.tsx` | 大会格係数管理 | no-cache |
| `/admin/register` | `app/admin/register/page.tsx` + `RegisterClient.tsx` | 大会単位一括登録 | no-cache |
| `/admin/login` | `app/admin/login/` | 管理者ログイン | — |

### コンポーネント

| ファイル | 役割 |
|---------|------|
| `components/RankingTable.tsx` | ランキングテーブル（Client） |
| `components/RatingChart.tsx` | レーティング推移グラフ（Recharts） |
| `components/SubmitForm.tsx` | 単一試合投稿フォーム（Client） |
| `components/BulkSubmitForm.tsx` | 一括投稿フォーム（Client） |
| `components/SubmitTabs.tsx` | 投稿フォームのタブUI（Client） |

### ライブラリ

| ファイル | 役割 |
|---------|------|
| `lib/supabase.ts` | Supabaseクライアント + 型定義（MC, Battle, Rating, Tournament, Submission） |
| `lib/supabase-server.ts` | Server Components専用クライアント |
| `lib/supabase-middleware.ts` | middleware専用クライアント |
| `lib/rating.ts` | 拡張Eloレーティング計算ロジック |
| `middleware.ts` | `/admin/*` の認証保護 |

---

## データベーススキーマ

```
mcs             MCマスタ（name, current_rating, battle_count, is_active）
tournaments     大会マスタ（name, grade_coeff, held_on）
battles         試合結果（mc_a_id, mc_b_id, winner, round_name, status, tournament_id）
ratings         レーティング変動履歴（mc_id, battle_id, rating_before, rating_after, delta）
submissions     一般投稿受付（status: pending/approved/rejected）
```

**RLS（行レベルセキュリティ）**:
- `mcs`, `tournaments`, `ratings`: 全件 SELECT 可（anon key で OK）
- `battles`: `status = 'approved'` のもののみ SELECT 可
- `submissions`: INSERT 可・SELECT 可（管理者は service_role で全件操作）
- 書き込み（INSERT/UPDATE/DELETE）はすべて service_role（Server Actions 内で `createAdminClient()`）

**FK制約（削除時の注意）**:
- `ratings.battle_id` → `battles.id`（バトル削除前に ratings を先に削除）
- `battles.tournament_id` → `tournaments.id`

---

## レーティングアルゴリズム（`lib/rating.ts`）

```
新レート = 旧レート + 出場ボーナス + K × 大会格係数 × (結果 - 期待勝率)

K = 20（固定）
初期レート = 1500
下限 = 1000
出場ボーナス = 大会格係数 × 5pt（勝者のみ）
期待勝率 = 1 / (1 + 10^((相手レート - 自分レート) / 400))
```

**重要**: レーティングは必ず**時系列順**（`held_on` → `ROUND_ORDER`）で計算する。  
バトル削除時は全 ratings を削除して最初から再計算する（`app/admin/battles/actions.ts: recalculateAllRatings`）。

```typescript
const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];
```

---

## 全再計算の仕組み（Supabase RPC）

全レーティング再計算は **PostgreSQL 関数** として実装されている。計算はDB内で完結するためVercelのタイムアウト制限を受けない。

### 関数の登録（初回のみ / ロジック変更時のみ）

`supabase/migrations/002_recalculate_ratings_fn.sql` の内容を  
[Supabase SQL Editor](https://supabase.com/dashboard/project/vwwqbhadrzugvjtbmrbk/sql/new) で実行する。  
**一度登録すればDBに永続保存される。管理画面のボタンを使う限り再実行不要。**

### 呼び出し（Next.js側）

```typescript
// app/admin/battles/actions.ts
const { error } = await admin.rpc('recalculate_all_ratings');
```

### 関数の内部動作

1. `ratings` テーブルを全件削除
2. `battles`（approved）を `held_on` → `ROUND_ORDER` 順に全件取得
3. 各バトルをループし、JSONB変数でMCの現在レートをメモリ管理しながら計算
4. 各バトルの `ratings` 行を INSERT
5. 最終レートを `mcs.current_rating` / `mcs.battle_count` に一括 UPDATE
6. 処理件数を JSON で返す

### ロジックを変更する場合

`supabase/migrations/002_recalculate_ratings_fn.sql` を編集後、SQL Editorで再実行（`CREATE OR REPLACE` なので上書きされる）。  
`lib/rating.ts` の定数・計算式と必ず同期すること。

---

## 管理者フロー

```
1. 一般ユーザーが /submit から試合結果を投稿
   → submissions テーブルに保存（status: 'pending'）

2. 管理者が /admin でレビュー
   → 「承認」: battles/ratings/mcs を更新（app/admin/actions.ts: approveSubmission）
   → 「却下」: submissions.status を 'rejected' に更新

3. バトルを削除したい場合は /admin/battles
   → チェックして削除 → ratings を削除 → battles を削除
   （app/admin/battles/actions.ts: deleteBattles）

4. 大会単位で一括登録する場合は /admin/register
   → app/admin/register/actions.ts: registerBattles

5. 全レーティングを再計算したい場合は /admin/battles の「全再計算を実行」
   → admin.rpc('recalculate_all_ratings') → PostgreSQL関数がDB内で完結処理
   → タイムアウトなし・データ量無制限

6. 大会格係数を調整したい場合は /admin/coefficients
   → 個別調整 or カテゴリ一括適用
   → 係数変更後は「全再計算を実行」でレーティングに反映させること
```

---

## Supabaseクエリのルール

### SELECT は必要なカラムのみ

```typescript
// ✅ 正しい
supabase.from('mcs').select('id, name, current_rating, battle_count')

// ❌ 禁止（全カラムを取得してしまう）
supabase.from('mcs').select('*')
```

### ネスト結合の書き方

Supabase の外部キーが複数ある場合、FK名を明示する:

```typescript
// mc_a_id, mc_b_id の両方が mcs を参照するため FK名を指定
.select('mc_a:mcs!battles_mc_a_id_fkey(id, name), mc_b:mcs!battles_mc_b_id_fkey(id, name)')
```

### 型キャスト（Supabaseのネスト型問題）

Supabase はネスト結果の型推論が不完全なため、以下のパターンを使用する:

```typescript
type MyRow = { battles: { winner: string } | null };
const rows = (data ?? []) as unknown as MyRow[];
```

### クライアント使い分け

| 場所 | 使用クライアント |
|------|----------------|
| Server Components, Server Actions（公開データ） | `supabase`（`lib/supabase.ts`） |
| Server Components（大会詳細など認証不要でも管理側データ） | `createAdminClient()` |
| Server Actions（書き込み・管理操作） | `createAdminClient()` |
| Client Components（投稿フォームなど） | `supabase`（anon key） |
| middleware.ts | `createMiddlewareClient()` |

---

## キャッシュ戦略

### revalidate 設定方針

```typescript
export const revalidate = 60;    // ランキング・MCプロフィール（更新頻度: 中）
export const revalidate = 300;   // 試合一覧（更新頻度: 低）
export const revalidate = 3600;  // 大会一覧・大会詳細（更新頻度: 極低）
// 管理画面は revalidate 設定なし（常にサーバーサイドレンダリング）
```

### 承認後の手動再検証

`app/admin/actions.ts` の `approveSubmission` では承認後に以下を再検証する:

```typescript
revalidatePath('/');
revalidatePath('/battles');
revalidatePath('/admin');
revalidatePath(`/mc/${mcAId}`);
revalidatePath(`/mc/${mcBId}`);
```

`app/admin/battles/actions.ts` の `deleteBattles` では:

```typescript
revalidatePath('/');
revalidatePath('/battles');
revalidatePath('/admin/battles');
```

---

## 型定義の参照

型は `lib/supabase.ts` に集約されている。新規ファイルでは必ずここから import する:

```typescript
import type { MC, Battle, Rating, Tournament, Submission } from '@/lib/supabase';
```

ページ固有のネスト型（join結果）はそのファイル内にローカル定義してよい。

---

## 認証フロー

1. `middleware.ts` が `/admin/*` へのアクセスを監視
2. Supabase セッションなし → `/admin/login` にリダイレクト
3. `/admin/login` → `LoginForm.tsx` で `supabase.auth.signInWithPassword()` を実行
4. ログイン成功 → `/admin` へリダイレクト
5. ログアウト → `LogoutButton.tsx` で `supabase.auth.signOut()`

管理者アカウントは Supabase Auth で管理（ダッシュボードから追加）。

---

## よくある作業パターン

### 新しいページを追加する

1. `app/新ページ/page.tsx` を作成（Server Component）
2. 必要なら `app/新ページ/NewClient.tsx`（Client Component）を作成
3. `app/layout.tsx` のナビゲーションに追加
4. revalidate 値を設定

### 新しい Supabase テーブルを追加する

1. `supabase/migrations/` に SQL ファイルを追加
2. `lib/supabase.ts` に型定義を追加
3. Supabase ダッシュボードで SQL を実行

### Server Action を追加する

```typescript
'use server';
import { createAdminClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function myAction(param: string) {
  const admin = createAdminClient();
  // ... DB操作
  revalidatePath('/関連ページ');
}
```

### MCプロフィールページの試合履歴ソート

`app/mc/[id]/page.tsx` でのソートパターン（時系列で正しい順序を保証）:

```typescript
const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];

const sortedRatings = [...ratings].sort((a, b) => {
  const dateA = a.battles?.tournaments?.held_on ?? '';
  const dateB = b.battles?.tournaments?.held_on ?? '';
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  const roundA = ROUND_ORDER.indexOf(a.battles?.round_name ?? '');
  const roundB = ROUND_ORDER.indexOf(b.battles?.round_name ?? '');
  return (roundA === -1 ? 999 : roundA) - (roundB === -1 ? 999 : roundB);
});
```

---

## 既知の設計上の注意点

1. **全再計算はPostgreSQL関数で実行**: `recalculate_all_ratings()` はDB内で完結する。TypeScript側でループ処理しないこと（タイムアウトの原因になる）。

2. **`as unknown as Type` の多用**: Supabase の join 型推論の限界のため unavoidable。パターンは既存コードを参照。

3. **ランキングは battle_count >= 5 のみ表示**: `app/page.tsx` で `.gte('battle_count', 5)` フィルタを適用している。

4. **tournaments.category カラムは未使用**: スキーマに category 列があるが UI からは削除済み。クエリには含めない。

5. **大会詳細ページは createAdminClient を使用**: `app/tournaments/[id]/page.tsx` は anon key では tournaments の全カラムが取れない可能性があるため admin client を使用。

6. **大会一覧のカテゴリ管理は `data/tournament_master.ts`**: Supabaseの登録状況と`TOURNAMENT_MASTER`をクロス参照して表示。新規大会追加時はここも更新すること。

7. **MC名義統合は `scripts/merge_mcs.mjs`**: 同一人物の別名義を統合する場合は`MERGE_GROUPS`に追加して実行。統合後は全再計算が必要。

---

## 環境変数

| 変数名 | 用途 | 必要な場所 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開用 API キー（RLS で制限） | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理操作用（RLS バイパス） | Server のみ |

`SUPABASE_SERVICE_ROLE_KEY` は絶対にクライアントに露出させないこと。

---

## スクリプト

| ファイル | 用途 | 実行方法 |
|---------|------|---------|
| `scripts/seed.mjs` | JSONからtournaments/battles/mcsを一括投入 | `node scripts/seed.mjs [datafile.json]` |
| `scripts/merge_mcs.mjs` | MC名義統合（別名義→正名義） | `MERGE_GROUPS`を編集して `node scripts/merge_mcs.mjs` |

両スクリプト実行後は管理画面の「全再計算を実行」が必要。

---

## ファイル変更履歴の要点

- `supabase/migrations/002_recalculate_ratings_fn.sql`: 全再計算をPostgreSQL関数化（タイムアウト対策）（2026-04）
- `app/admin/battles/actions.ts`: 全再計算をadmin.rpc()呼び出しに簡略化（2026-04）
- `app/admin/coefficients/`: 大会格係数管理ページを追加（2026-04）
- `app/about/page.tsx`: Aboutページを追加（2026-04）
- `app/mc/[id]/page.tsx`: 試合履歴ページネーション（20件/ページ）追加（2026-04）
- `app/battles/page.tsx` + `BattlesClient.tsx`: MC名検索・ページネーション（50件/ページ）・レート変動表示（2026-04）
- `app/tournaments/page.tsx`: カテゴリ別表示・登録状況バッジ（data/tournament_master.ts参照）（2026-04）
- `app/page.tsx`: battle_count >= 5 のみランキング表示（2026-04）
