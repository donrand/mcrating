'use client';

import { useState } from 'react';
import { bulkSubmit } from '@/app/submit/bulkSubmit';

type MC = { id: string; name: string };
type Tournament = { id: string; name: string };

type BattleRow = {
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw' | '';
  round_name: string;
};

const emptyRow = (): BattleRow => ({ mc_a_name: '', mc_b_name: '', winner: '', round_name: '' });

type Props = { mcs: MC[]; tournaments: Tournament[] };

export default function BulkSubmitForm({ mcs, tournaments }: Props) {
  const [isNewTournament, setIsNewTournament] = useState(false);
  const [tournamentId, setTournamentId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [heldOn, setHeldOn] = useState('');
  const [rows, setRows] = useState<BattleRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ registered: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mcNames = mcs.map(m => m.name);

  function updateRow(index: number, patch: Partial<BattleRow>) {
    setRows(r => r.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function removeRow(index: number) {
    setRows(r => r.filter((_, i) => i !== index));
  }

  function handleTournamentSelect(id: string) {
    setTournamentId(id);
    const t = tournaments.find(t => t.id === id);
    if (t) setTournamentName(t.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const tName = isNewTournament ? tournamentName.trim() : tournaments.find(t => t.id === tournamentId)?.name ?? '';
    if (!tName) { setError('大会名を入力してください'); return; }

    const validRows = rows.filter(r => r.mc_a_name.trim() && r.mc_b_name.trim() && r.winner);
    if (validRows.length === 0) { setError('バトルを1件以上入力してください（勝者未選択は除外されます）'); return; }

    setSubmitting(true);
    const res = await bulkSubmit({
      tournament_name: tName,
      held_on: heldOn,
      battles: validRows.map(r => ({ ...r, winner: r.winner as 'a' | 'b' | 'draw' })),
    });
    setSubmitting(false);
    setResult(res);
    if (res.errors.length === 0) setDone(true);
  }

  if (done) {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 text-center">
        <p className="text-green-400 font-semibold text-lg mb-2">{result?.registered}件の投稿を受け付けました</p>
        <p className="text-gray-400 text-sm">管理者が確認後、レーティングに反映されます。</p>
        <button
          className="mt-6 px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          onClick={() => { setDone(false); setResult(null); setRows([emptyRow(), emptyRow(), emptyRow()]); setTournamentId(''); setTournamentName(''); setHeldOn(''); }}
        >
          続けて投稿する
        </button>
      </div>
    );
  }

  const readyCount = rows.filter(r => r.mc_a_name && r.mc_b_name && r.winner).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 大会 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">大会 <span className="text-red-400">*</span></label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => setIsNewTournament(false)} className={`px-3 py-1 rounded text-xs ${!isNewTournament ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>既存から選択</button>
          <button type="button" onClick={() => setIsNewTournament(true)} className={`px-3 py-1 rounded text-xs ${isNewTournament ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>新規入力</button>
        </div>
        {isNewTournament ? (
          <input
            type="text"
            placeholder="大会名を入力"
            value={tournamentName}
            onChange={e => setTournamentName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          />
        ) : (
          <select
            value={tournamentId}
            onChange={e => handleTournamentSelect(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          >
            <option value="">選択してください</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* 開催日 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">開催日 <span className="text-gray-600 font-normal text-xs">（任意）</span></label>
        <input
          type="date"
          value={heldOn}
          onChange={e => setHeldOn(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
        />
      </div>

      {/* バトル一覧 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            バトル <span className="text-red-400">*</span>
            {readyCount > 0 && <span className="ml-2 text-xs text-yellow-400 font-normal">{readyCount}件入力中</span>}
          </label>
        </div>

        <datalist id="bulk-mc-list">
          {mcNames.map(name => <option key={name} value={name} />)}
        </datalist>

        <div className="space-y-2">
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_7rem_7rem_1.5rem] gap-2 px-2 text-xs text-gray-600">
            <span>MC A</span><span>MC B</span><span>勝者</span><span>ラウンド</span><span></span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_7rem_7rem_1.5rem] gap-2 items-center">
              <input type="text" list="bulk-mc-list" placeholder="MC A" value={row.mc_a_name}
                onChange={e => updateRow(i, { mc_a_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full" />
              <input type="text" list="bulk-mc-list" placeholder="MC B" value={row.mc_b_name}
                onChange={e => updateRow(i, { mc_b_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full" />
              <select value={row.winner} onChange={e => updateRow(i, { winner: e.target.value as BattleRow['winner'] })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full">
                <option value="">勝者</option>
                <option value="a">A 勝利</option>
                <option value="b">B 勝利</option>
                <option value="draw">引き分け</option>
              </select>
              <input type="text" placeholder="ラウンド" value={row.round_name}
                onChange={e => updateRow(i, { round_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full" />
              <button type="button" onClick={() => removeRow(i)}
                className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors text-center">×</button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows(r => [...r, emptyRow()])}
          className="mt-3 w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-600 hover:text-gray-400 hover:border-gray-600 transition-colors"
        >
          + 行を追加
        </button>
      </div>

      {result && result.errors.length > 0 && (
        <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-xl text-sm text-yellow-300">
          <p className="font-semibold mb-1">{result.registered}件送信、{result.errors.length}件エラー</p>
          <ul className="space-y-1 text-xs mt-2">
            {result.errors.map((e, i) => <li key={i}>・{e}</li>)}
          </ul>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? '送信中...' : `${readyCount}件をまとめて送信する`}
      </button>
    </form>
  );
}
