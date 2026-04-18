'use client';

import { useState } from 'react';
import { submitBattle } from '@/app/submit/actions';

type MC = { id: string; name: string };
type Tournament = { id: string; name: string };

type Props = {
  mcs: MC[];
  tournaments: Tournament[];
};

export default function SubmitForm({ mcs, tournaments }: Props) {
  const [form, setForm] = useState({
    tournament_id: '',
    tournament_name: '',
    held_on: '',
    mc_a_id: '',
    mc_a_name: '',
    mc_b_id: '',
    mc_b_name: '',
    winner: '' as 'a' | 'b' | 'draw' | '',
    round_name: '',
    evidence_url: '',
    note: '',
  });
  const [isNewTournament, setIsNewTournament] = useState(false);
  const [isNewMcA, setIsNewMcA] = useState(false);
  const [isNewMcB, setIsNewMcB] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isYouTubeUrl = (url: string) =>
    url.includes('youtube.com') || url.includes('youtu.be');
  const isXUrl = (url: string) => url.includes('twitter.com') || url.includes('x.com');

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?\s]+)/);
    return match ? match[1] : null;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.winner) { setError('勝者を選択してください'); return; }
    if (!form.held_on) { setError('開催日を入力してください'); return; }

    const mcAName = isNewMcA ? form.mc_a_name : mcs.find(m => m.id === form.mc_a_id)?.name ?? '';
    const mcBName = isNewMcB ? form.mc_b_name : mcs.find(m => m.id === form.mc_b_id)?.name ?? '';
    const tournamentName = isNewTournament ? form.tournament_name : tournaments.find(t => t.id === form.tournament_id)?.name ?? '';

    if (!mcAName || !mcBName) { setError('MC A・MC B を入力してください'); return; }
    if (mcAName === mcBName) { setError('MC A と MC B は別のMCにしてください'); return; }
    if (!tournamentName) { setError('大会名を入力してください'); return; }

    setSubmitting(true);
    const { error: actionError } = await submitBattle({
      tournament_name: tournamentName,
      held_on: form.held_on,
      mc_a_name: mcAName,
      mc_b_name: mcBName,
      winner: form.winner as 'a' | 'b' | 'draw',
      round_name: form.round_name || null,
      evidence_url: form.evidence_url || null,
      note: form.note || null,
    });
    setSubmitting(false);

    if (actionError) {
      setError(actionError);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 text-center">
        <p className="text-green-400 font-semibold text-lg mb-2">投稿を受け付けました</p>
        <p className="text-gray-400 text-sm">管理者が確認後、レーティングに反映されます。</p>
        <button
          className="mt-6 px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          onClick={() => { setDone(false); setForm({ tournament_id: '', tournament_name: '', held_on: '', mc_a_id: '', mc_a_name: '', mc_b_id: '', mc_b_name: '', winner: '', round_name: '', evidence_url: '', note: '' }); }}
        >
          続けて投稿する
        </button>
      </div>
    );
  }

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
            value={form.tournament_name}
            onChange={e => setForm(f => ({ ...f, tournament_name: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            required
          />
        ) : (
          <select
            value={form.tournament_id}
            onChange={e => setForm(f => ({ ...f, tournament_id: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            required={!isNewTournament}
          >
            <option value="">選択してください</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 開催日 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">開催日 <span className="text-red-400">*</span></label>
        <input
          type="date"
          value={form.held_on}
          onChange={e => setForm(f => ({ ...f, held_on: e.target.value }))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          required
        />
      </div>

      {/* MC A */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">MC A <span className="text-red-400">*</span></label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => setIsNewMcA(false)} className={`px-3 py-1 rounded text-xs ${!isNewMcA ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>既存から選択</button>
          <button type="button" onClick={() => setIsNewMcA(true)} className={`px-3 py-1 rounded text-xs ${isNewMcA ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>新規入力</button>
        </div>
        {isNewMcA ? (
          <input type="text" placeholder="MC名を入力" value={form.mc_a_name} onChange={e => setForm(f => ({ ...f, mc_a_name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" required />
        ) : (
          <select value={form.mc_a_id} onChange={e => setForm(f => ({ ...f, mc_a_id: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" required={!isNewMcA}>
            <option value="">選択してください</option>
            {mcs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      {/* MC B */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">MC B <span className="text-red-400">*</span></label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => setIsNewMcB(false)} className={`px-3 py-1 rounded text-xs ${!isNewMcB ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>既存から選択</button>
          <button type="button" onClick={() => setIsNewMcB(true)} className={`px-3 py-1 rounded text-xs ${isNewMcB ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>新規入力</button>
        </div>
        {isNewMcB ? (
          <input type="text" placeholder="MC名を入力" value={form.mc_b_name} onChange={e => setForm(f => ({ ...f, mc_b_name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" required />
        ) : (
          <select value={form.mc_b_id} onChange={e => setForm(f => ({ ...f, mc_b_id: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" required={!isNewMcB}>
            <option value="">選択してください</option>
            {mcs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      {/* 勝者 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">勝者 <span className="text-red-400">*</span></label>
        <div className="flex gap-3">
          {(['a', 'b', 'draw'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setForm(f => ({ ...f, winner: v }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.winner === v ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {v === 'a' ? 'MC A 勝利' : v === 'b' ? 'MC B 勝利' : '引き分け'}
            </button>
          ))}
        </div>
      </div>

      {/* ラウンド名（任意） */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">ラウンド名 <span className="text-gray-600 font-normal">（任意）</span></label>
        <input type="text" placeholder="例: 決勝、予選Bブロック" value={form.round_name} onChange={e => setForm(f => ({ ...f, round_name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" />
      </div>

      {/* 証拠URL（任意） */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">証拠URL <span className="text-gray-600 font-normal">（任意・YouTube/X）</span></label>
        <input type="url" placeholder="https://..." value={form.evidence_url} onChange={e => setForm(f => ({ ...f, evidence_url: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" />
        {/* YouTubeプレビュー */}
        {form.evidence_url && isYouTubeUrl(form.evidence_url) && getYouTubeId(form.evidence_url) && (
          <div className="mt-2 aspect-video max-w-sm">
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(form.evidence_url)}`}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        )}
        {form.evidence_url && isXUrl(form.evidence_url) && (
          <p className="mt-1 text-xs text-gray-500">X(Twitter)のリンクが入力されました</p>
        )}
      </div>

      {/* 備考（任意） */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">備考 <span className="text-gray-600 font-normal">（任意）</span></label>
        <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-none" />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-xl hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? '送信中...' : '情報を送信する'}
      </button>
    </form>
  );
}
