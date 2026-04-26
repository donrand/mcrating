同一人物の別名義MCを統合する手順を案内する。

## 手順

1. `scripts/merge_mcs.mjs` を開き `MERGE_GROUPS` に追加する:

```javascript
const MERGE_GROUPS = [
  { canonical: '正しい名前', aliases: ['別名義1', '別名義2'] },
];
```

canonical・aliases ともに DB に存在する正確な名前を入力すること。スペルミスがあるとスキップされる。

2. スクリプトを実行:

```bash
node scripts/merge_mcs.mjs
```

3. 実行後、管理画面 /admin/battles で「全再計算を実行」する（バトルの紐付けが変わるためレーティングがズレる）。
