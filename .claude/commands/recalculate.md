全レーティング再計算の実行手順を案内する。

## 実行方法（推奨）

管理画面 https://mcrating.vercel.app/admin/battles を開き「全再計算を実行」ボタンを押す。
「再計算完了 (battles_processed: XXXX)」と表示されれば成功。

## バックアップ手段（管理画面ボタンが使えない場合）

Supabase SQL Editor https://supabase.com/dashboard/project/vwwqbhadrzugvjtbmrbk/sql/new で実行:
```sql
SELECT recalculate_all_ratings();
```
成功後、管理画面の「キャッシュをクリア」ボタンを押す。

## 仕組み

PostgreSQL 関数 `recalculate_all_ratings()` がDB内で完結して処理する（Vercel タイムアウトなし）。
1. ratings テーブルを全件削除
2. battles（approved）を held_on → ROUND_ORDER 順に取得
3. 各バトルのレーティングを計算して ratings に INSERT
4. mcs.current_rating / battle_count を更新

## ロジックを変更する場合

`supabase/migrations/002_recalculate_ratings_fn.sql` を編集後、SQL Editor で再実行（CREATE OR REPLACE で上書き）。
`lib/rating.ts` の定数・計算式と必ず同期すること。
