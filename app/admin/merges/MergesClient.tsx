'use client';

import { useState, useTransition } from 'react';
import { addMergeRule, deleteMergeRule } from './actions';
import type { McaMergeRule } from '@/lib/supabase';

type GroupedRule = {
  canonical_name: string;
  aliases: { id: string; alias_name: string }[];
};

function groupRules(rules: McaMergeRule[]): GroupedRule[] {
  const map = new Map<string, { id: string; alias_name: string }[]>();
  for (const r of rules) {
    if (!map.has(r.canonical_name)) map.set(r.canonical_name, []);
    map.get(r.canonical_name)!.push({ id: r.id, alias_name: r.alias_name });
  }
  return Array.from(map.entries()).map(([canonical_name, aliases]) => ({
    canonical_name,
    aliases,
  }));
}

function AddForm() {
  const [canonical, setCanonical] = useState('');
  const [alias, setAlias] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await addMergeRule(canonical, alias);
        setCanonical('');
        setAlias('');
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : '追加に失敗しました');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl mb-8">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">正名義（canonical）</label>
        <input
          value={canonical}
          onChange={e => setCanonical(e.target.value)}
          placeholder="例: R-指定"
          className="w-48 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">別名義（alias）</label>
        <input
          value={alias}
          onChange={e => setAlias(e.target.value)}
          placeholder="例: R指定"
          className="w-48 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
          required
        />
      </div>
      <button
        type="submit"
        disabled={pending || !canonical.trim() || !alias.trim()}
        className="px-4 py-1.5 text-sm rounded bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? '追加中…' : '追加'}
      </button>
      {ok && <span className="text-xs text-green-400">追加しました</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}

function DeleteButton({ id, alias }: { id: string; alias: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm(`「${alias}」のルールを削除しますか？`)) return;
        startTransition(() => deleteMergeRule(id));
      }}
      disabled={pending}
      className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors"
    >
      {pending ? '…' : '削除'}
    </button>
  );
}

export default function MergesClient({ rules }: { rules: McaMergeRule[] }) {
  const groups = groupRules(rules);

  return (
    <div>
      <AddForm />

      {groups.length === 0 ? (
        <p className="text-gray-500 text-sm">統合ルールが登録されていません。</p>
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.canonical_name} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <div className="text-sm font-semibold text-yellow-300 mb-2">{g.canonical_name}</div>
              <div className="space-y-1">
                {g.aliases.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-gray-600 text-xs">←</span>
                      <span>{a.alias_name}</span>
                    </div>
                    <DeleteButton id={a.id} alias={a.alias_name} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
