'use client';

import { useState, useTransition } from 'react';
import { updateTournamentCoeff, updateCategoryCoeff } from './actions';

export type TournamentRow = {
  id: string;
  name: string;
  held_on: string | null;
  grade_coeff: number;
  displayName: string;
};

export type CategoryGroup = {
  id: string;
  label: string;
  tournaments: TournamentRow[];
};

const PRESET_COEFFS = [1.0, 1.5, 1.8, 2.0, 2.5, 3.0];

function CoeffInput({
  value,
  onSave,
  disabled,
}: {
  value: number;
  onSave: (v: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [input, setInput] = useState(value.toFixed(1));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const changed = parseFloat(input) !== value;

  function handleSave() {
    const v = parseFloat(input);
    if (isNaN(v) || v <= 0) return;
    startTransition(async () => {
      await onSave(v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        step="0.1"
        min="0.5"
        max="5.0"
        value={input}
        onChange={e => { setInput(e.target.value); setSaved(false); }}
        disabled={disabled || pending}
        className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-mono text-center focus:outline-none focus:border-yellow-400 disabled:opacity-50"
      />
      <button
        onClick={handleSave}
        disabled={!changed || pending || disabled}
        className="px-2 py-1 text-xs rounded bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? '…' : saved ? '✓' : '保存'}
      </button>
    </div>
  );
}

function CategoryBulkUpdate({ category }: { category: CategoryGroup }) {
  const [coeff, setCoeff] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleBulkSave() {
    const v = parseFloat(coeff);
    if (isNaN(v) || v <= 0) return;
    if (!confirm(`「${category.label}」の全${category.tournaments.length}件を格係数 ${v.toFixed(1)} に変更しますか？`)) return;
    startTransition(async () => {
      await updateCategoryCoeff(category.tournaments.map(t => t.id), v);
      setResult(`全${category.tournaments.length}件を ${v.toFixed(1)} に更新しました`);
      setCoeff('');
      setTimeout(() => setResult(null), 3000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700">
      <span className="text-xs text-gray-400 font-medium">カテゴリ全体:</span>
      <div className="flex gap-1 flex-wrap">
        {PRESET_COEFFS.map(p => (
          <button
            key={p}
            onClick={() => setCoeff(p.toFixed(1))}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              coeff === p.toFixed(1)
                ? 'bg-yellow-400 text-gray-900 border-yellow-400 font-bold'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-yellow-400'
            }`}
          >
            {p.toFixed(1)}
          </button>
        ))}
        <input
          type="number"
          step="0.1"
          min="0.5"
          max="5.0"
          value={coeff}
          onChange={e => setCoeff(e.target.value)}
          placeholder="任意"
          className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs font-mono text-center focus:outline-none focus:border-yellow-400"
        />
      </div>
      <button
        onClick={handleBulkSave}
        disabled={!coeff || isNaN(parseFloat(coeff)) || pending}
        className="px-3 py-1 text-xs rounded bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? '更新中…' : '一括適用'}
      </button>
      {result && <span className="text-xs text-green-400">{result}</span>}
    </div>
  );
}

export default function CoefficientClient({ categories }: { categories: CategoryGroup[] }) {
  return (
    <div className="space-y-10">
      {categories.map(cat => (
        <section key={cat.id}>
          {/* カテゴリヘッダー */}
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-800">
            <h2 className="text-base font-bold text-white">{cat.label}</h2>
            <span className="text-xs text-gray-500">{cat.tournaments.length}件</span>
          </div>

          {/* カテゴリ一括変更 */}
          <CategoryBulkUpdate category={cat} />

          {/* 個別リスト */}
          <div className="space-y-1">
            {cat.tournaments.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white font-medium">{t.displayName}</span>
                  <span className="text-xs text-gray-600 ml-2">{t.held_on ?? '—'}</span>
                </div>
                <span className="text-xs text-gray-600 hidden sm:block truncate max-w-48">{t.name}</span>
                <CoeffInput
                  value={t.grade_coeff}
                  onSave={v => updateTournamentCoeff(t.id, v)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
