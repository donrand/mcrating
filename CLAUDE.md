# mcrating-web — 開発ガイド

MCバトルレーティングサイト。国内MCバトルシーン（UMB・KOK・戦極など）の拡張Eloレーティングランキングを公開するNext.jsアプリ。

## URL

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
| ホスティング | Vercel |
| グラフ | Recharts |

## ローカル開発

```bash
cd /workspaces/ClaudeCode/mcrating-web
npm run dev
# → http://localhost:3000
```

`.env.local` が必要（`.env.local.example` を参照）:
```
NEXT_PUBLIC_SUPABASE_URL=https://vwwqbhadrzugvjtbmrbk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## デプロイ

`main` ブランチへの push で Vercel が自動デプロイ。

```bash
git add -A && git commit -m "変更内容" && git push
```

## ページ構成

| パス | 説明 | 認証 |
|------|------|------|
| `/` | ランキング（トップ） | 不要 |
| `/battles` | 登録履歴（承認済みバトル一覧） | 不要 |
| `/tournaments` | 大会一覧 | 不要 |
| `/submit` | 情報提供フォーム（匿名投稿） | 不要 |
| `/mc/[id]` | MCプロフィール・レーティング推移 | 不要 |
| `/admin` | 投稿レビュー・承認フロー | 要ログイン |
| `/admin/battles` | バトル削除管理 | 要ログイン |
| `/admin/login` | 管理者ログイン | — |

## ディレクトリ構成

```
app/
├── page.tsx                  # ランキング
├── RankingPage.tsx           # カテゴリフィルター（Client）
├── battles/page.tsx          # 登録履歴
├── tournaments/page.tsx      # 大会一覧
├── submit/page.tsx           # 情報提供フォーム
├── mc/[id]/page.tsx          # MCプロフィール
└── admin/
    ├── page.tsx              # 投稿レビュー
    ├── AdminReviewClient.tsx # 承認・却下UI
    ├── actions.ts            # 承認Server Action（Elo計算・DB反映）
    ├── LogoutButton.tsx      # ログアウト
    ├── login/                # ログインページ
    └── battles/              # バトル削除管理
components/
├── RankingTable.tsx          # ランキングテーブル
├── RatingChart.tsx           # Rechartsグラフ
└── SubmitForm.tsx            # 情報提供フォーム
lib/
├── rating.ts                 # 拡張Eloレーティング計算ロジック
├── supabase.ts               # Supabaseクライアント・型定義
├── supabase-server.ts        # Server Components用クライアント
└── supabase-middleware.ts    # middleware用クライアント
middleware.ts                 # /admin/* の認証保護
supabase/migrations/
└── 001_initial_schema.sql    # DBスキーマ
```

## レーティングロジック

```
新レート = 旧レート + 出場ボーナス + K × 大会格係数 × (結果 - 期待勝率)
```

- K = 20（固定）
- 初期レート = 1500
- 下限 = 1000
- 出場ボーナス = 大会格係数 × 5pt
- 実装: `lib/rating.ts`

## DBテーブル

| テーブル | 用途 |
|---------|------|
| `mcs` | MCマスタ（レート・試合数） |
| `tournaments` | 大会マスタ（格係数） |
| `battles` | 試合結果（承認済み） |
| `ratings` | レーティング変動履歴 |
| `submissions` | 一般ユーザーからの投稿（承認待ち） |

## 管理者フロー

1. 一般ユーザーが `/submit` から試合結果を投稿 → `submissions` テーブルに保存
2. 管理者が `/admin` で内容を確認・大会格係数を設定
3. 「承認」→ `battles` に登録・`ratings` にレート変動記録・MCのレートを更新
4. 「却下」→ 理由を記録して非表示
5. バトルを削除したい場合は `/admin/battles` でチェックして削除（レート自動再計算）
