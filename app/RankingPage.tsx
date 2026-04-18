'use client';

import RankingTable from '@/components/RankingTable';

export type RankingMC = {
  id: string;
  name: string;
  current_rating: number;
  battle_count: number;
};

type Props = {
  initialMcs: RankingMC[];
};

export default function RankingPage({ initialMcs }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">MCバトル レーティングランキング</h1>
      <p className="text-gray-500 text-sm mb-4">
        国内MCバトルシーンの拡張Eloレーティングによるランキング
      </p>
      <p className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2 mb-8">
        ⚠️ レーティングはラッパーの強さや実力を示すものではありません。あくまで独自指標です、参考程度に！
      </p>
      <RankingTable mcs={initialMcs} />
    </div>
  );
}
