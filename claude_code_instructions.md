# Claude Code 作業指示書
# MCバトル レーティング — Supabaseシードデータ登録

---

## あなたへの依頼

以下の手順でUMBバトルデータをSupabaseに登録するスクリプトを作成・実行してください。

---

## プロジェクト構成（想定）

```
mcrating/
├── src/
├── supabase/
└── data/
    ├── seed_data.json   ← このファイルを作成済み（下記参照）
    └── seed.ts          ← このスクリプトを作成・実行してください
```

---

## Supabase接続情報

以下を `.env.local` から読み込んでください：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # anon keyではなくservice role keyを使用
```

---

## テーブル定義（要件定義書より）

```sql
-- mcs（MCマスタ）
CREATE TABLE mcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  current_rating DECIMAL DEFAULT 1500,
  battle_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- tournaments（大会マスタ）
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  grade_coeff DECIMAL NOT NULL,
  held_on DATE,
  created_at TIMESTAMP DEFAULT now()
);

-- battles（試合結果）
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  mc_a_id UUID REFERENCES mcs(id),
  mc_b_id UUID REFERENCES mcs(id),
  winner TEXT CHECK (winner IN ('a', 'b', 'draw')),
  round_name TEXT,
  status TEXT DEFAULT 'approved',
  approved_at TIMESTAMP DEFAULT now()
);

-- ratings（レーティング履歴）
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mc_id UUID REFERENCES mcs(id),
  battle_id UUID REFERENCES battles(id),
  rating_before DECIMAL,
  rating_after DECIMAL,
  delta DECIMAL,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Eloレーティング計算ロジック

```typescript
const K = 20;
const INITIAL_RATING = 1500;
const MIN_RATING = 1000;

function calcElo(
  ratingA: number,
  ratingB: number,
  result: number,      // 1.0=A勝利 / 0.0=A敗北 / 0.5=引き分け
  gradeCoeff: number
): { deltaA: number; deltaB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const bonus = gradeCoeff * 5; // 出場ボーナス（両者）

  const deltaA = bonus + K * gradeCoeff * (result - expectedA);
  const deltaB = bonus + K * gradeCoeff * ((1 - result) - expectedB);

  return { deltaA, deltaB };
}
```

---

## シードデータ（data/seed_data.json に配置）

```json
{
  "tournaments": [
    {
      "key": "umb2025",
      "name": "UMB 2025 GRAND CHAMPIONSHIP",
      "category": "主要大会",
      "grade_coeff": 3.0,
      "held_on": "2025-12-29"
    },
    {
      "key": "umb2024",
      "name": "UMB 2024 GRAND CHAMPIONSHIP",
      "category": "主要大会",
      "grade_coeff": 3.0,
      "held_on": "2024-12-28"
    },
    {
      "key": "umb2022",
      "name": "UMB 2022 GRAND CHAMPIONSHIP",
      "category": "主要大会",
      "grade_coeff": 3.0,
      "held_on": "2022-12-23"
    },
    {
      "key": "umb2021",
      "name": "UMB 2021 GRAND CHAMPIONSHIP",
      "category": "主要大会",
      "grade_coeff": 3.0,
      "held_on": "2021-12-26"
    }
  ],
  "battles": [
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "RISKY",
      "mc_b": "hoRao",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "サクト",
      "mc_b": "SWANKY MONKEY",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "11'Back",
      "mc_b": "LAFRAN",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "Cherry",
      "mc_b": "YO-1",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "238",
      "mc_b": "FURAIIR.C",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "nkm-Le0t0rio",
      "mc_b": "KOOPA",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "JAKE",
      "mc_b": "Keyser",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "JOLLY BIG",
      "mc_b": "Gremlin",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "灯火",
      "mc_b": "LINKRAZY",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "だーひー",
      "mc_b": "n",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "ゐLL AuguSt.",
      "mc_b": "Hawk-I",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "1回戦",
      "mc_a": "35xv",
      "mc_b": "熊の皮",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "Bendy",
      "mc_b": "芭撫琉",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "怪士",
      "mc_b": "KOKI",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "セブン",
      "mc_b": "KENSHIN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "吟時",
      "mc_b": "MC☆ニガリ a.k.a 赤い稲妻",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "aonisai",
      "mc_b": "ZERO",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "RISKY",
      "mc_b": "SWANKY MONKEY",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "11'Back",
      "mc_b": "YO-1",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "238",
      "mc_b": "nkm-Le0t0rio",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "MAC-T",
      "mc_b": "KYAPER",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "蘇流邪",
      "mc_b": "Manchies nice",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "菊蔵",
      "mc_b": "wani galay mycel",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "紅蓮",
      "mc_b": "JAG-ME",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "レイジ",
      "mc_b": "PONEY",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "Gremlin",
      "mc_b": "Keyser",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "LINKRAZY",
      "mc_b": "だーひー",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "2回戦",
      "mc_a": "35xv",
      "mc_b": "Hawk-I",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "KOKI",
      "mc_b": "芭撫琉",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "MC☆ニガリ a.k.a 赤い稲妻",
      "mc_b": "KENSHIN",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "RISKY",
      "mc_b": "aonisai",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "nkm-Le0t0rio",
      "mc_b": "YO-1",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "MAC-T",
      "mc_b": "蘇流邪",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "菊蔵",
      "mc_b": "JAG-ME",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "レイジ",
      "mc_b": "Keyser",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト16",
      "mc_a": "Hawk-I",
      "mc_b": "だーひー",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト8",
      "mc_a": "MC☆ニガリ a.k.a 赤い稲妻",
      "mc_b": "KOKI",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト8",
      "mc_a": "YO-1",
      "mc_b": "aonisai",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト8",
      "mc_a": "蘇流邪",
      "mc_b": "JAG-ME",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "ベスト8",
      "mc_a": "だーひー",
      "mc_b": "レイジ",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "準決勝",
      "mc_a": "MC☆ニガリ a.k.a 赤い稲妻",
      "mc_b": "aonisai",
      "winner": "a"
    },
    {
      "tournament_key": "umb2025",
      "round": "準決勝",
      "mc_a": "JAG-ME",
      "mc_b": "レイジ",
      "winner": "b"
    },
    {
      "tournament_key": "umb2025",
      "round": "決勝",
      "mc_a": "レイジ",
      "mc_b": "MC☆ニガリ a.k.a 赤い稲妻",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "灯火",
      "mc_b": "mita beats",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "B_ZERO",
      "mc_b": "KOOPA",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "或観樹",
      "mc_b": "MATTO",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "黄猿",
      "mc_b": "MAC-T",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "KANDAI",
      "mc_b": "K'iLL",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "ユウヤキタイ",
      "mc_b": "COCORO",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "GCI",
      "mc_b": "ふーわ",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "素",
      "mc_b": "ENEMY",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "脱走",
      "mc_b": "BZN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "天邪鬼",
      "mc_b": "AWAKE",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "CHARLIE",
      "mc_b": "彩",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "諳泰",
      "mc_b": "GIL",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "笑夢珈琲",
      "mc_b": "照",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "1回戦",
      "mc_a": "YSK",
      "mc_b": "ZERO",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "GOTIT",
      "mc_b": "Chakr@The3rd",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "Joker clown",
      "mc_b": "灯火",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "YONA",
      "mc_b": "KOOPA",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "SUMFLAT",
      "mc_b": "或観樹",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "miniRA",
      "mc_b": "黄猿",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "lonelow",
      "mc_b": "K'iLL",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "Ryo",
      "mc_b": "COCORO",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "マユツバ",
      "mc_b": "GCI",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "Key",
      "mc_b": "KOKI",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "NAJIMI",
      "mc_b": "ENEMY",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "Rugshot",
      "mc_b": "BZN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "Alpha",
      "mc_b": "AWAKE",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "K.K FLOW",
      "mc_b": "CHARLIE",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "d.a.b.d.e",
      "mc_b": "GIL",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "Cherry",
      "mc_b": "照",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "2回戦",
      "mc_a": "JAKE",
      "mc_b": "YSK",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "灯火",
      "mc_b": "GOTIT",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "KOOPA",
      "mc_b": "SUMFLAT",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "K'iLL",
      "mc_b": "黄猿",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "Ryo",
      "mc_b": "GCI",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "ENEMY",
      "mc_b": "KOKI",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "BZN",
      "mc_b": "Alpha",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "CHARLIE",
      "mc_b": "GIL",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト16",
      "mc_a": "JAKE",
      "mc_b": "Cherry",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト8",
      "mc_a": "GOTIT",
      "mc_b": "KOOPA",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト8",
      "mc_a": "Ryo",
      "mc_b": "黄猿",
      "winner": "b"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト8",
      "mc_a": "ENEMY",
      "mc_b": "Alpha",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "ベスト8",
      "mc_a": "JAKE",
      "mc_b": "GIL",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "準決勝",
      "mc_a": "KOOPA",
      "mc_b": "黄猿",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "準決勝",
      "mc_a": "JAKE",
      "mc_b": "ENEMY",
      "winner": "a"
    },
    {
      "tournament_key": "umb2024",
      "round": "決勝",
      "mc_a": "JAKE",
      "mc_b": "KOOPA",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "天邪鬼",
      "mc_b": "Keyser",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "S-fuu",
      "mc_b": "詩言",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "JACK-GX",
      "mc_b": "BALA a.k.a SBKN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "CROWN-D",
      "mc_b": "fuuga",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "COCORO",
      "mc_b": "黒さき拓海",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "ふーわ",
      "mc_b": "OSCAR",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "歩歩",
      "mc_b": "MCリトル",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "Luvit",
      "mc_b": "ILOHA",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "TERU",
      "mc_b": "尺out2",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "外れくじ",
      "mc_b": "ENEMY",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "紅蓮",
      "mc_b": "DARK",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "ASS-B.Miller",
      "mc_b": "御笑門",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "STARGAZE",
      "mc_b": "脱走",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "しおん",
      "mc_b": "MC☆ニガリ a.k.a 赤い稲妻",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "凛",
      "mc_b": "K'iLL",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "1回戦",
      "mc_a": "Amg",
      "mc_b": "SEA-MEN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "晋平太",
      "mc_b": "Keyser",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "JINTOKU",
      "mc_b": "CROWN-D",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "ビッグサンフラワー",
      "mc_b": "黒さき拓海",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "PONEY",
      "mc_b": "Luvit",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "SILENT KILLA JOINT",
      "mc_b": "TERU",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "JAVE",
      "mc_b": "御笑門",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "ChillER",
      "mc_b": "脱走",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "シード戦",
      "mc_a": "HYPERNONMC",
      "mc_b": "SEA-MEN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "詩言",
      "mc_b": "Keyser",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "CROWN-D",
      "mc_b": "BALA a.k.a SBKN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "ふーわ",
      "mc_b": "黒さき拓海",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "PONEY",
      "mc_b": "MCリトル",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "ENEMY",
      "mc_b": "SILENT KILLA JOINT",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "紅蓮",
      "mc_b": "JAVE",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "脱走",
      "mc_b": "MC☆ニガリ a.k.a 赤い稲妻",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト16",
      "mc_a": "SEA-MEN",
      "mc_b": "K'iLL",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト8",
      "mc_a": "BALA a.k.a SBKN",
      "mc_b": "Keyser",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト8",
      "mc_a": "ふーわ",
      "mc_b": "PONEY",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト8",
      "mc_a": "紅蓮",
      "mc_b": "SILENT KILLA JOINT",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "ベスト8",
      "mc_a": "K'iLL",
      "mc_b": "脱走",
      "winner": "a"
    },
    {
      "tournament_key": "umb2022",
      "round": "準決勝",
      "mc_a": "PONEY",
      "mc_b": "BALA a.k.a SBKN",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "準決勝",
      "mc_a": "K'iLL",
      "mc_b": "SILENT KILLA JOINT",
      "winner": "b"
    },
    {
      "tournament_key": "umb2022",
      "round": "決勝",
      "mc_a": "SILENT KILLA JOINT",
      "mc_b": "BALA a.k.a SBKN",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "MERCY",
      "mc_b": "Z-Loop",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "BIG MOOLA",
      "mc_b": "USTR",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "ふーわ",
      "mc_b": "智大",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "SHAMO",
      "mc_b": "脱兎",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "T-TANGG",
      "mc_b": "ABLO",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "aTp",
      "mc_b": "MC☆ニガリ a.k.a 赤い稲妻",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "KUREHA",
      "mc_b": "OLIVA",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "誠 a.k.a JAFEM",
      "mc_b": "黒さき海斗",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "MAC-T",
      "mc_b": "OSCAR",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "ハイロ",
      "mc_b": "Armadillo",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "K.K FLOW",
      "mc_b": "GCI",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "KANDAI",
      "mc_b": "DADDY MUM",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "怪士",
      "mc_b": "MAG",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "脱走",
      "mc_b": "早雲",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "K'iLL",
      "mc_b": "PONEY",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "1回戦",
      "mc_a": "KAKKY",
      "mc_b": "黄猿",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "Z-Loop",
      "mc_b": "BIG MOOLA",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "智大",
      "mc_b": "SHAMO",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "MC☆ニガリ a.k.a 赤い稲妻",
      "mc_b": "T-TANGG",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "OLIVA",
      "mc_b": "黒さき海斗",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "ハイロ",
      "mc_b": "MAC-T",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "GCI",
      "mc_b": "KANDAI",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "早雲",
      "mc_b": "怪士",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト16",
      "mc_a": "K'iLL",
      "mc_b": "黄猿",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト8",
      "mc_a": "智大",
      "mc_b": "BIG MOOLA",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト8",
      "mc_a": "OLIVA",
      "mc_b": "MC☆ニガリ a.k.a 赤い稲妻",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト8",
      "mc_a": "GCI",
      "mc_b": "ハイロ",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "ベスト8",
      "mc_a": "黄猿",
      "mc_b": "早雲",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "準決勝",
      "mc_a": "MC☆ニガリ a.k.a 赤い稲妻",
      "mc_b": "智大",
      "winner": "a"
    },
    {
      "tournament_key": "umb2021",
      "round": "準決勝",
      "mc_a": "ハイロ",
      "mc_b": "黄猿",
      "winner": "b"
    },
    {
      "tournament_key": "umb2021",
      "round": "決勝",
      "mc_a": "黄猿",
      "mc_b": "MC☆ニガリ a.k.a 赤い稲妻",
      "winner": "b"
    }
  ]
}
```

---

## 作成するスクリプト（data/seed.ts）の仕様

以下の処理を順番に行うスクリプトを作成してください。

1. `data/seed_data.json` を読み込む
2. **大会登録**：tournamentsテーブルにUPSERT（name重複時はスキップ）
3. **MC登録**：battlesに登場するMC名を全件抽出 → mcsテーブルにUPSERT（name重複時はスキップ）
4. **バトル登録**：各battlesを時系列順（tournament held_on → round順）に処理
   - mc_a_id・mc_b_id・tournament_idを名前から解決
   - battlesテーブルにINSERT（status='approved'）
   - Eloレーティングを計算
   - ratingsテーブルに2行（MC_A分・MC_B分）INSERT
   - mcsテーブルのcurrent_rating・battle_countをUPDATE
5. 処理完了後、登録件数をコンソールに表示

### ラウンドの処理順

```typescript
const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '決勝'];
```

### 実行コマンド

```bash
npx ts-node data/seed.ts
# または
npx tsx data/seed.ts
```

### 必要なパッケージ

```bash
npm install @supabase/supabase-js dotenv
npm install -D tsx
```

---

## 注意事項

- `SUPABASE_SERVICE_ROLE_KEY` を使うこと（anon keyではRLSに引っかかる場合あり）
- 重複実行しても安全なように、既存データのチェックを入れること
- エラーが出た場合はどのバトルで失敗したかを表示すること
