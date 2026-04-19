# mcrating 保守運用ガイド

> 対象読者: サイト保守メンバー  
> 最終更新: 2026-04

---

## 目次

1. [全体像](#全体像)
2. [管理画面の使い方](#管理画面の使い方)
3. [大会データを一括登録する（seedスクリプト）](#大会データを一括登録するseedスクリプト)
4. [MC名義を統合する（mergeスクリプト）](#mc名義を統合するmergeスクリプト)
5. [レーティングを再計算する](#レーティングを再計算する)
6. [大会一覧ページへの反映](#大会一覧ページへの反映)
7. [ローカル環境のセットアップ](#ローカル環境のセットアップ)
8. [よくあるミスと対処法](#よくあるミスと対処法)

---

## 全体像

```
データ投入
  ↓
① スクリプトで一括登録 (seed.mjs)
  または
① 管理画面で1件ずつ承認 (/admin)
  ↓
② レーティング再計算 (管理画面ボタン or SQL Editor)
  ↓
③ サイトに反映（自動 or キャッシュクリアボタン）
```

サイト URL: https://mcrating.vercel.app  
管理画面 URL: https://mcrating.vercel.app/admin  
Supabase: https://supabase.com/dashboard/project/vwwqbhadrzugvjtbmrbk  
GitHub: https://github.com/donrand/mcrating

---

## 管理画面の使い方

### ログイン

https://mcrating.vercel.app/admin/login にアクセスし、管理者アカウントでログイン。  
（アカウントは Supabase Auth で管理。追加は Supabase ダッシュボード → Authentication → Users から）

### 各ページの役割

| ページ | URL | 用途 |
|--------|-----|------|
| 投稿レビュー | /admin | 一般ユーザーの投稿を承認 / 却下 |
| バトル管理 | /admin/battles | 登録済みバトルの削除・全再計算・キャッシュクリア |
| 一括登録 | /admin/register | バトルを手動でまとめて登録 |
| 係数管理 | /admin/coefficients | 大会格係数の調整 |

### 一般投稿を承認する

1. `/admin` を開く
2. 投稿内容・証拠URLを確認
3. 大会格係数を設定して「承認」ボタンを押す
4. → battles / ratings / mcs テーブルが自動更新される

> ⚠️ 承認ではレーティングの**増分計算のみ**行われます。  
> 大会格係数を後で変更した場合は「全再計算」が必要です。

---

## 大会データを一括登録する（seedスクリプト）

大会・バトルデータをまとめて Supabase に投入するスクリプトです。  
レーティングはこの時点では計算されません（後で再計算します）。

### 前提条件

- Node.js 18以上
- `.env.local` ファイルの配置（後述）
- リポジトリのクローン

### JSONデータの形式

`data/` ディレクトリに以下の形式でJSONファイルを作成します。

```json
{
  "tournaments": [
    {
      "key": "umb2024",
      "name": "UMB 2024 GRAND CHAMPIONSHIP",
      "held_on": "2024-12-28",
      "grade_coeff": 2.0
    }
  ],
  "battles": [
    {
      "tournament_key": "umb2024",
      "mc_a": "R-指定",
      "mc_b": "晋平太",
      "winner": "a",
      "round": "決勝"
    },
    {
      "tournament_key": "umb2024",
      "mc_a": "FORK",
      "mc_b": "D.O",
      "winner": "b",
      "round": "準決勝"
    }
  ]
}
```

#### フィールド説明

**tournaments**

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `key` | ✅ | ファイル内でバトルと紐付けるための識別子（英数字） |
| `name` | ✅ | Supabaseに登録する大会名（完全一致で重複チェックするため変えないこと） |
| `held_on` | ✅ | 開催日（`YYYY-MM-DD` 形式） |
| `grade_coeff` | ✅ | 大会格係数（UMB/KOK決勝: 2.0、準決勝: 1.5、予選: 1.0 など） |

**battles**

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `tournament_key` | ✅ | 上のtournamentsの`key`と一致させる |
| `mc_a` | ✅ | MC名（表記ゆれに注意。既存MCと完全一致で紐付け） |
| `mc_b` | ✅ | MC名 |
| `winner` | ✅ | `"a"` / `"b"` / `"draw"` のいずれか |
| `round` | — | ラウンド名（`決勝` / `準決勝` / `ベスト8` など） |

#### ラウンド名の標準表記

```
1回戦 / シード戦 / 2回戦 / ベスト16 / ベスト8 / 準決勝 / 決勝
```

この順番でレーティングが計算されます。表記を統一してください。

### スクリプトの実行

```bash
# リポジトリルートで実行
cd mcrating-web

# ファイルを指定して実行
node scripts/seed.mjs data/umb2024.json

# 実行結果例
読み込みファイル: data/umb2024.json
大会数: 1, バトル数: 15
[1/3] 大会を登録中... + 完了 (1件)
[2/3] MCを登録中...    完了 (新規 2件)
[3/3] バトルを登録中.. 完了 (挿入 15件 / スキップ 0件)
[後処理] MCのbattle_countを更新中... 完了

✓ シード完了。管理画面から「全再計算を実行」を押してレーティングを反映してください。
```

> - `.` は既存データをスキップ  
> - `+` は新規登録  
> - 同じ（大会×MC_A×MC_B×ラウンド）の組み合わせは重複登録されません

### 実行後の作業

1. 管理画面 `/admin/battles` を開く
2. 「全再計算を実行」ボタンを押す（→ 詳細は[レーティングを再計算する](#レーティングを再計算する)参照）

---

## MC名義を統合する（mergeスクリプト）

同一人物が別名義で登録されている場合（例: `R指定` → `R-指定`）に統合するスクリプトです。

### スクリプトの編集

`scripts/merge_mcs.mjs` を開き、`MERGE_GROUPS` に統合定義を追加します。

```javascript
const MERGE_GROUPS = [
  // { canonical: '正名義', aliases: ['別名義1', '別名義2'] }
  { canonical: 'R-指定',  aliases: ['R指定'] },
  { canonical: 'MOL53',   aliases: ['鬼ピュアワンライン', 'RAWAXXX'] },
  // ↓ 新しい統合を追加する場合はここに追記
  { canonical: '正しい名前', aliases: ['別名義'] },
];
```

> ⚠️ `canonical`（正名義）は現在DBに存在する名前を正確に入力すること。  
> `aliases`（別名義）も同様。スペルミスがあるとスキップされます。

### スクリプトの実行

```bash
node scripts/merge_mcs.mjs
```

```
=== MC名義統合スクリプト ===

【R-指定】(現在 31戦)
  「R指定」はDBに存在しないためスキップ

【MOL53】(現在 81戦)
  統合: 「鬼ピュアワンライン」(3戦) → 「MOL53」
    battles(mc_a): 2件, battles(mc_b): 1件, ratings: 3件 を更新
    「鬼ピュアワンライン」を削除しました
  ...

✓ 統合完了。管理画面から「全再計算を実行」でレーティングを再計算してください。
```

### 実行後の作業

統合後は必ず「全再計算を実行」してください（バトルの紐付けが変わるためレーティングがズレます）。

---

## レーティングを再計算する

全承認済みバトルをもとにレーティングを最初から計算し直します。  
バトル追加・削除・係数変更・MC統合の後は必ず実行してください。

### 方法A：管理画面ボタン（推奨）

1. https://mcrating.vercel.app/admin/battles を開く
2. 「全再計算を実行」ボタンを押す
3. 「再計算完了 (battles_processed: XXXX)」と表示されれば成功
4. サイトのキャッシュも自動でクリアされます

> 失敗した場合は画面にエラーメッセージが表示されます。  
> 問題が解消しない場合は方法Bを試してください。

### 方法B：SQL Editor（バックアップ手段）

1. https://supabase.com/dashboard/project/vwwqbhadrzugvjtbmrbk/sql/new を開く
2. 以下を実行:
   ```sql
   SELECT recalculate_all_ratings();
   ```
3. `{"battles_processed": XXXX}` が返れば成功
4. **別途キャッシュクリアが必要**: 管理画面の「キャッシュをクリア」ボタンを押す

> SQL Editor は管理画面ボタンが使えない緊急時のバックアップ手段です。  
> 通常は方法A を使ってください。

### 大会格係数を変更する場合

1. `/admin/coefficients` で係数を変更・保存
2. `/admin/battles` で「全再計算を実行」

---

## 大会一覧ページへの反映

新しい大会を追加した後、`/tournaments`（大会一覧ページ）に「登録済」バッジを表示するには`data/tournament_master.ts`の更新が必要です。

### tournament_master.ts の更新

`data/tournament_master.ts` を開き、該当大会の `supabaseName` と `status` を設定します。

```typescript
// 変更前（未登録）
{ key: 'umb2025', displayName: '2025', heldOn: '2025-12-29', supabaseName: null, status: 'none' },

// 変更後（登録済み）
{ key: 'umb2025', displayName: '2025', heldOn: '2025-12-29', supabaseName: 'UMB 2025 GRAND CHAMPIONSHIP', status: 'registered' },
```

> ⚠️ `supabaseName` はSupabaseに登録した大会名と**完全一致**させること。  
> スペース・大文字小文字の違いでリンクが機能しなくなります。

### status の値

| 値 | 意味 |
|----|------|
| `registered` | 全試合登録済み → 緑バッジ + 詳細リンクあり |
| `partial` | 一部試合のみ登録済み → 黄バッジ + 詳細リンクあり |
| `none` | 未収録 → グレーバッジ |
| `excluded` | 対象外（チーム戦など） → 薄グレー |

### 変更後のデプロイ

```bash
# ビルド確認
npm run build

# Gitにコミット＆プッシュ（Vercelが自動デプロイ）
git add data/tournament_master.ts
git commit -m "feat: ○○大会を大会一覧に追加"
git push
```

---

## ローカル環境のセットアップ

スクリプトを実行したり、コードを変更してテストするための手順です。

### 1. リポジトリをクローン

```bash
git clone https://github.com/donrand/mcrating.git
cd mcrating/mcrating-web
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.local` ファイルをプロジェクトルート（`mcrating-web/`直下）に作成:

```
NEXT_PUBLIC_SUPABASE_URL=https://vwwqbhadrzugvjtbmrbk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（管理者から入手）
SUPABASE_SERVICE_ROLE_KEY=（管理者から入手）
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` は秘密鍵です。GitHubにコミットしないこと。  
> `.gitignore` で除外されているため通常は問題ありませんが、念のため確認してください。

### 4. 開発サーバーを起動（コード変更時のみ）

```bash
npm run dev
# → http://localhost:3000 でアクセス可能
```

---

## よくあるミスと対処法

### スクリプト実行時のエラー

**「環境変数が不足しています」**  
→ `.env.local` が `mcrating-web/` 直下にあるか確認。ファイル名のスペルも確認。

**「MC名義が見つかりません」**  
→ JSONの`mc_a` / `mc_b`のスペルがDBの名前と一致していない。  
→ [Supabase ダッシュボード](https://supabase.com/dashboard/project/vwwqbhadrzugvjtbmrbk/editor) の `mcs` テーブルで正確な名前を確認。

**「大会キーが見つかりません」**  
→ バトルの `tournament_key` がtournamentsの`key`と一致していない。JSONを確認。

### 再計算ボタンのエラー

管理画面に具体的なエラーメッセージが表示されます。  
`code: 21000` が出た場合はSupabase SQL Editorで `SELECT recalculate_all_ratings();` を直接実行し、その後「キャッシュをクリア」ボタンを押してください。

### 大会一覧に「登録済」が出ない

→ `data/tournament_master.ts` の `supabaseName` がSupabaseの大会名と完全一致していない。  
→ Supabaseの `tournaments` テーブルで実際の名前をコピー&ペーストして設定する。  
→ 変更後はGitにコミット＆プッシュが必要（自動では更新されない）。

### バトルが重複登録されてしまった

1. `/admin/battles` でチェックを入れて削除
2. 「全再計算を実行」でレーティングをリセット

### MC名を間違えて登録してしまった

Supabaseのダッシュボードから直接 `mcs` テーブルを編集して名前を修正し、その後「全再計算を実行」。

---

## 通常の更新作業フロー（チェックリスト）

新しい大会のバトル結果を登録する際の標準手順:

```
□ JSONファイルを作成（data/大会名.json）
□ node scripts/seed.mjs data/大会名.json を実行
□ エラーがないか出力を確認
□ 管理画面 /admin/battles → 「全再計算を実行」
□ サイトでランキング・大会詳細ページが正しく表示されるか確認
□ data/tournament_master.ts に supabaseName を追加
□ git commit & push
```

MC統合が必要な場合（同一人物の別名義が混在している場合）:

```
□ scripts/merge_mcs.mjs の MERGE_GROUPS に追記
□ node scripts/merge_mcs.mjs を実行
□ 管理画面 → 「全再計算を実行」
□ サイトで該当MCのプロフィールページを確認
```
