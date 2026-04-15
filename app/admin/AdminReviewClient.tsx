'use client';

import { useState } from 'react';
import { approveSubmission, rejectSubmission } from './actions';
import type { Submission } from '@/lib/supabase';

type MC = { id: string; name: string };
type Tournament = { id: string; name: string; grade_coeff: number };

type Props = {
  submissions: Submission[];
  mcs: MC[];
  tournaments: Tournament[];
};

export default function AdminReviewClient({ submissions: initialSubmissions, mcs, tournaments }: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [gradeCoeffs, setGradeCoeffs] = useState<Record<string, number>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const isYouTubeUrl = (url: string) =>
    url?.includes('youtube.com') || url?.includes('youtu.be');
  const getYouTubeId = (url: string) => {
    const match = url?.match(/(?:v=|youtu\.be\/)([^&?\s]+)/);
    return match ? match[1] : null;
  };

  async function handleApprove(submission: Submission) {
    const gradeCoeff = gradeCoeffs[submission.id] ?? 1.0;
    setProcessing(submission.id);
    await approveSubmission(submission, gradeCoeff, mcs, tournaments);
    setSubmissions(s => s.filter(sub => sub.id !== submission.id));
    setProcessing(null);
  }

  async function handleReject(submission: Submission) {
    const reason = rejectReasons[submission.id] ?? '';
    setProcessing(submission.id);
    await rejectSubmission(submission.id, reason);
    setSubmissions(s => s.filter(sub => sub.id !== submission.id));
    setProcessing(null);
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        未承認の投稿はありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {submissions.map(sub => {
        const ytId = sub.evidence_url ? getYouTubeId(sub.evidence_url) : null;
        return (
          <div key={sub.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">大会</p>
                <p className="font-semibold">{sub.tournament_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">開催日</p>
                <p>{sub.held_on}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">対戦</p>
                <p className="font-semibold">
                  {sub.mc_a_name} <span className="text-gray-500">vs</span> {sub.mc_b_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">勝者</p>
                <p className="font-bold text-yellow-400">
                  {sub.winner === 'a' ? sub.mc_a_name : sub.winner === 'b' ? sub.mc_b_name : '引き分け'}
                </p>
              </div>
              {sub.round_name && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">ラウンド</p>
                  <p>{sub.round_name}</p>
                </div>
              )}
              {sub.note && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">備考</p>
                  <p className="text-sm text-gray-400">{sub.note}</p>
                </div>
              )}
            </div>

            {/* 証拠URL */}
            {sub.evidence_url && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">証拠URL</p>
                <a href={sub.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline break-all">
                  {sub.evidence_url}
                </a>
                {ytId && isYouTubeUrl(sub.evidence_url) && (
                  <div className="mt-2 aspect-video max-w-sm">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            {/* 承認時の大会格係数設定 */}
            <div className="mb-4 p-4 bg-gray-800 rounded-lg">
              <label className="block text-xs text-gray-400 mb-2">大会格係数（承認時に設定）</label>
              <div className="flex items-center gap-3">
                <select
                  value={gradeCoeffs[sub.id] ?? ''}
                  onChange={e => setGradeCoeffs(g => ({ ...g, [sub.id]: parseFloat(e.target.value) }))}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
                >
                  <option value="">選択してください</option>
                  <option value="3.0">3.0 — 主要大会（UMB・KOK・戦極など）</option>
                  <option value="1.5">1.5 — 地方大会</option>
                  <option value="1.0">1.0 — 地下バトル</option>
                </select>
                <span className="text-xs text-gray-500">または</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="手入力"
                  className="w-24 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
                  onChange={e => setGradeCoeffs(g => ({ ...g, [sub.id]: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            {/* アクション */}
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(sub)}
                disabled={processing === sub.id || !gradeCoeffs[sub.id]}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {processing === sub.id ? '処理中...' : '承認してレーティングに反映'}
              </button>
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  placeholder="却下理由（任意）"
                  value={rejectReasons[sub.id] ?? ''}
                  onChange={e => setRejectReasons(r => ({ ...r, [sub.id]: e.target.value }))}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                />
                <button
                  onClick={() => handleReject(sub)}
                  disabled={processing === sub.id}
                  className="px-4 py-2 bg-red-900 hover:bg-red-700 disabled:opacity-40 text-red-300 font-semibold rounded-lg text-sm transition-colors"
                >
                  却下
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
