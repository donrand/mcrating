# data/ — シードデータ管理フォルダ

今後バトルデータを追加・管理するためのフォルダです。

## ファイル構成

| ファイル | 用途 |
|---------|------|
| `seed_data.json` | 登録済みバトルデータ（UMB 2021〜2025） |
| `seed.ts` | Supabaseへの一括登録スクリプト |

## 新しいデータを追加する方法

### 1. seed_data.json に追記

`tournaments` に大会を追加：
```json
{
  "key": "umb2026",
  "name": "UMB 2026 GRAND CHAMPIONSHIP",
  "category": "主要大会",
  "grade_coeff": 3.0,
  "held_on": "2026-12-XX"
}
```

`battles` にバトルを追加：
```json
{
  "tournament_key": "umb2026",
  "round": "決勝",
  "mc_a": "MC名A",
  "mc_b": "MC名B",
  "winner": "a"
}
```

### 2. スクリプトを実行

```bash
cd /workspaces/ClaudeCode/mcrating-web
npx tsx data/seed.ts
```

- 既存のデータは重複チェックでスキップされるので、追記して再実行しても安全
- バトルは `held_on` → `ROUND_ORDER` の順で処理される

## ラウンド処理順

```
1回戦 → シード戦 → 2回戦 → ベスト16 → ベスト8 → 準決勝 → 決勝
```

## 現在の登録データ

| 大会 | 開催日 | バトル数 |
|------|--------|---------|
| UMB 2021 GRAND CHAMPIONSHIP | 2021-12-26 | 31件 |
| UMB 2022 GRAND CHAMPIONSHIP | 2022-12-23 | 39件 |
| UMB 2024 GRAND CHAMPIONSHIP | 2024-12-28 | 47件 |
| UMB 2025 GRAND CHAMPIONSHIP | 2025-12-29 | 41件 |
