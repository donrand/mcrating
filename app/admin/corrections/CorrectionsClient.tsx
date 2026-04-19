'use client';

import { useState, useTransition } from 'react';
import { applyCorrection, dismissCorrection } from './actions';

type CorrectionRow = {
  id: string;
  battle_id: string;
  description: string;
  suggested_winner: 'a' | 'b' | 'draw' | null;
  suggested_round: string | null;
  evidence_url: string | null;
  submitted_at: string;
  battle: {
    winner: string;
    round_name: string | null;
    tournament_name: string | null;
    held_on: string | null;
    mc_a_name: string | null;
    mc_b_name: string | null;
  } | null;
};

function CorrectionCard({ c }: { c: CorrectionRow }) {
  const [pending, startTransition] = useTransition();
  const [winner, setWinner] = useState<string>(c.suggested_winner ?? c.battle?.winner ?? 'a');
  const [round, setRound] = useState(c.suggested_round ?? c.battle?.round_name ?? '');
  const [done, setDone] = useState<'resolved' | 'dismissed' | null>(null);

  const mcA = c.battle?.mc_a_name ?? 'MC A';
  const mcB = c.battle?.mc_b_name ?? 'MC B';
  const currentWinner = c.battle?.winner;

  if (done) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 opacity-40 text-sm text-gray-500">
        {done === 'resolved' ? '✓ 修正を適用しました' : '✗ 却下しました'}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      {/* バトル情報 */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs text-gray-500">{c.battle?.tournament_name ?? '—'}</span>
          {c.battle?.held_on && <span className="text-xs text-gray-700">{c.battle.held_on}</span>}
          {c.battle?.round_name && (
            <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">{c.battle.round_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={currentWinner === 'a' ? 'text-yellow-400' : 'text-gray-400'}>{mcA}</span>
          <span className="text-gray-600 text-xs">vs</span>
          <span className={currentWinner === 'b' ? 'text-yellow-400' : 'text-gray-400'}>{mcB}</span>
          <span className="text-xs text-gray-600 ml-1">
            現在: {currentWinner === 'a' ? mcA : currentWinner === 'b' ? mcB : '引き分け'} 勝利
          </span>
        </div>
      </div>

      {/* 報告内容 */}
      <div className="mb-4 p-3 bg-gray-800 rounded text-xs text-gray-300 space-y-1">
        <p className="font-medium text-gray-400 mb-1">報告内容:</p>
        <p>{c.description}</p>
        {c.suggested_winner && (
          <p className="text-yellow-400">
            提案: {c.suggested_winner === 'a' ? mcA : c.suggested_winner === 'b' ? mcB : '引き分け'} 側が正しい
          </p>
        )}
        {c.suggested_round && <p className="text-blue-400">提案ラウンド: {c.suggested_round}</p>}
        {c.evidence_url && (
          <a href={c.evidence_url} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 underline block truncate">
            証拠: {c.evidence_url}
          </a>
        )}
        <p className="text-gray-600">{new Date(c.submitted_at).toLocaleString('ja-JP')}</p>
      </div>

      {/* 修正フォーム */}
      <div className="flex flex-wrap gap-3 items-end mb-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">修正後の勝者</label>
          <select
            value={winner}
            onChange={e => setWinner(e.target.value)}
            disabled={pending}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-yellow-500"
          >
            <option value="a">{mcA}</option>
            <option value="b">{mcB}</option>
            <option value="draw">引き分け</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">修正後のラウンド</label>
          <input
            type="text"
            value={round}
            onChange={e => setRound(e.target.value)}
            disabled={pending}
            placeholder="例: 準決勝"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-yellow-500 w-32"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => startTransition(async () => {
            await applyCorrection(c.id, c.battle_id, winner as 'a' | 'b' | 'draw', round);
            setDone('resolved');
          })}
          disabled={pending}
          className="px-4 py-1.5 text-sm bg-yellow-400 text-gray-900 font-bold rounded hover:bg-yellow-300 disabled:opacity-50 transition-colors"
        >
          {pending ? '処理中...' : '修正を適用'}
        </button>
        <button
          onClick={() => startTransition(async () => {
            await dismissCorrection(c.id);
            setDone('dismissed');
          })}
          disabled={pending}
          className="px-4 py-1.5 text-sm bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors"
        >
          却下
        </button>
      </div>
    </div>
  );
}

export default function CorrectionsClient({ corrections }: { corrections: CorrectionRow[] }) {
  if (corrections.length === 0) {
    return <p className="text-gray-600 text-center py-16">未処理の報告はありません</p>;
  }

  return (
    <div className="space-y-4">
      {corrections.map(c => (
        <CorrectionCard key={c.id} c={c} />
      ))}
    </div>
  );
}
