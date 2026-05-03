'use client';

import { useState, useTransition } from 'react';
import { deleteTournament } from './actions';

type TournamentRow = {
  id: string;
  name: string;
  held_on: string | null;
  grade_coeff: number;
  battle_count: number;
};

type Props = { tournaments: TournamentRow[] };

export default function TournamentsClient({ tournaments }: Props) {
  const [pending, startTransition] = useTransition();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, string>>({});

  function handleDelete(t: TournamentRow) {
    if (!confirm(`「${t.name}」とその全バトル（${t.battle_count}件）を削除します。\nこの操作は取り消せません。よろしいですか？`)) return;
    startTransition(async () => {
      const res = await deleteTournament(t.id);
      if (res.ok) {
        setDeletedIds(prev => new Set(Array.from(prev).concat(t.id)));
      }
      setMessages(prev => ({ ...prev, [t.id]: res.message }));
    });
  }

  const visible = tournaments.filter(t => !deletedIds.has(t.id));

  if (tournaments.length === 0) {
    return <p className="text-gray-600 text-center py-16">大会データがありません</p>;
  }

  return (
    <div className="space-y-1">
      {visible.map(t => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-800"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{t.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t.held_on ?? '日付不明'} · {t.battle_count}試合 · 格係数{t.grade_coeff}
            </p>
            {messages[t.id] && (
              <p className="text-xs text-green-400 mt-1">{messages[t.id]}</p>
            )}
          </div>
          <button
            onClick={() => handleDelete(t)}
            disabled={pending}
            className="px-3 py-1.5 text-xs bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white font-semibold rounded transition-colors shrink-0"
          >
            削除
          </button>
        </div>
      ))}
      {deletedIds.size > 0 && (
        <p className="text-xs text-gray-500 pt-2">
          {deletedIds.size}件を削除しました。レーティングへの反映は「バトル管理」→「全再計算を実行」で行ってください。
        </p>
      )}
    </div>
  );
}
