'use client';

import { useState, useTransition } from 'react';
import { supabase } from '@/lib/supabase';

type Props = {
  battleId: string;
  mcAName: string;
  mcBName: string;
};

export default function ReportButton({ battleId, mcAName, mcBName }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [description, setDescription] = useState('');
  const [suggestedWinner, setSuggestedWinner] = useState('');
  const [suggestedRound, setSuggestedRound] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [error, setError] = useState('');

  function handleOpen() {
    setOpen(true);
    setDone(false);
    setError('');
    setDescription('');
    setSuggestedWinner('');
    setSuggestedRound('');
    setEvidenceUrl('');
  }

  function handleSubmit() {
    if (!description.trim()) { setError('内容を入力してください'); return; }
    setError('');
    startTransition(async () => {
      const { error: err } = await supabase.from('battle_corrections').insert({
        battle_id: battleId,
        description: description.trim(),
        suggested_winner: suggestedWinner || null,
        suggested_round: suggestedRound.trim() || null,
        evidence_url: evidenceUrl.trim() || null,
      });
      if (err) { setError('送信に失敗しました。時間をおいて再試行してください。'); return; }
      setDone(true);
    });
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors shrink-0"
        title="誤りを報告する"
      >
        報告
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700 text-sm">
      {done ? (
        <div className="flex items-center justify-between">
          <span className="text-green-400 text-xs">報告を送信しました。ご協力ありがとうございます。</span>
          <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-300 ml-4">閉じる</button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-300">
              誤り報告: {mcAName} vs {mcBName}
            </span>
            <button onClick={() => setOpen(false)} className="text-xs text-gray-600 hover:text-gray-400">✕</button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">誤りの内容 <span className="text-red-400">*</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="例: 決勝の勝者が逆です。正しくはA側が勝っています。"
                rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs placeholder-gray-600 focus:outline-none focus:border-yellow-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">正しい勝者（任意）</label>
                <select
                  value={suggestedWinner}
                  onChange={e => setSuggestedWinner(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-yellow-500"
                >
                  <option value="">選択しない</option>
                  <option value="a">{mcAName} 側</option>
                  <option value="b">{mcBName} 側</option>
                  <option value="draw">引き分け</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">正しいラウンド（任意）</label>
                <input
                  type="text"
                  value={suggestedRound}
                  onChange={e => setSuggestedRound(e.target.value)}
                  placeholder="例: 準決勝"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs placeholder-gray-600 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">証拠URL（任意）</label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={e => setEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs placeholder-gray-600 focus:outline-none focus:border-yellow-500"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={pending}
                className="px-3 py-1.5 text-xs bg-yellow-400 text-gray-900 font-bold rounded hover:bg-yellow-300 disabled:opacity-50 transition-colors"
              >
                {pending ? '送信中...' : '送信'}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
