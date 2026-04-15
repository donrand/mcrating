'use client';

import Link from 'next/link';
import type { MC } from '@/lib/supabase';

type Category = '全体' | '主要' | '地方' | '地下';

type Props = {
  mcs: (MC & { category?: string })[];
  selectedCategory: Category;
  onCategoryChange: (cat: Category) => void;
};

const CATEGORIES: Category[] = ['全体', '主要', '地方', '地下'];

export default function RankingTable({ mcs, selectedCategory, onCategoryChange }: Props) {
  return (
    <div>
      {/* カテゴリフィルター */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-yellow-400 text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="pb-3 pr-4 w-12">順位</th>
              <th className="pb-3 pr-4">MC名</th>
              <th className="pb-3 pr-4 hidden sm:table-cell">活動カテゴリ</th>
              <th className="pb-3 pr-4 text-right">レート</th>
              <th className="pb-3 pr-4 text-right hidden sm:table-cell">変動</th>
              <th className="pb-3 text-right hidden sm:table-cell">試合数</th>
            </tr>
          </thead>
          <tbody>
            {mcs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-600">
                  データがありません
                </td>
              </tr>
            )}
            {mcs.map((mc, i) => (
              <tr
                key={mc.id}
                className="border-b border-gray-900 hover:bg-gray-900 transition-colors"
              >
                <td className="py-3 pr-4 text-gray-500 font-mono">
                  {i + 1}
                </td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/mc/${mc.id}`}
                    className="font-semibold hover:text-yellow-400 transition-colors"
                  >
                    {mc.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-gray-400 hidden sm:table-cell">
                  {mc.category ?? '—'}
                </td>
                <td className="py-3 pr-4 text-right font-mono font-bold text-yellow-400">
                  {Math.round(mc.current_rating)}
                </td>
                <td className="py-3 pr-4 text-right hidden sm:table-cell">
                  —
                </td>
                <td className="py-3 text-right text-gray-400 hidden sm:table-cell">
                  {mc.battle_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
