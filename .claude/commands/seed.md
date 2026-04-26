シードスクリプトでバトルデータを Supabase に一括投入する手順を案内する。

## JSONフォーマット

`data/` 以下に以下の形式でファイルを作成する:

```json
{
  "tournaments": [
    { "key": "umb2026", "name": "UMB 2026 GRAND CHAMPIONSHIP", "held_on": "2026-12-XX", "grade_coeff": 3.0 }
  ],
  "battles": [
    { "tournament_key": "umb2026", "mc_a": "R-指定", "mc_b": "呂布カルマ", "winner": "a", "round": "決勝" }
  ]
}
```

## 実行

```bash
cd /workspaces/ClaudeCode/mcrating-web
node scripts/seed.mjs data/<ファイル名>.json
```

- 同じ（大会×MC_A×MC_B×ラウンド）の組み合わせは重複登録されない
- バトルは held_on → ROUND_ORDER 順で処理される

## 実行後

1. 管理画面 /admin/battles で「全再計算を実行」
2. `data/tournament_master.ts` に新大会の supabaseName と status を追加
3. git commit & push
