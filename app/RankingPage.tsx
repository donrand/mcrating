'use client';

import { useState } from 'react';
import RankingTable from '@/components/RankingTable';
import type { MC } from '@/lib/supabase';

type Category = '全体' | '主要' | '地方' | '地下';

type Props = {
  initialMcs: MC[];
};

export default function RankingPage({ initialMcs }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('全体');

  const filtered =
    selectedCategory === '全体'
      ? initialMcs
      : initialMcs.filter((mc) => (mc as MC & { category?: string }).category === selectedCategory);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">MCバトル レーティングランキング</h1>
      <p className="text-gray-500 text-sm mb-8">
        国内MCバトルシーンの拡張Eloレーティングによるランキング
      </p>
      <RankingTable
        mcs={filtered}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
    </div>
  );
}
