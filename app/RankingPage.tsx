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
      <p className="text-gray-500 text-sm mb-8">
        国内MCバトルシーンの拡張Eloレーティングによるランキング
      </p>
      <RankingTable mcs={initialMcs} />
    </div>
  );
}
