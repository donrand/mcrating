'use client';

import { useRef, useState } from 'react';
import { importTournamentCsv, type TournamentCsvRow } from './actions';

const ROUND_OPTIONS = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '3位決定戦', '決勝'];

function normalizeWinner(raw: string): 'a' | 'b' | 'draw' | null {
  const w = raw.toLowerCase().replace(/\s/g, '');
  if (w === 'a' || w === 'a側' || w === '1') return 'a';
  if (w === 'b' || w === 'b側' || w === '2') return 'b';
  if (w === 'draw' || w === '引き分け' || w === '0') return 'draw';
  return null;
}

function parseCsv(text: string): { rows: TournamentCsvRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const errors: string[] = [];
  const rows: TournamentCsvRow[] = [];
  if (lines.length === 0) return { rows, errors };

  // skip header if detected
  let start = 0;
  const first = lines[0].toLowerCase();
  if (first.includes('mc_a') || first.includes('mc a') || first.includes('winner') || first.includes('勝者')) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 3) {
      errors.push(`${lineNo}行目: 列数不足（mc_a, mc_b, winner[, round_name]）`);
      continue;
    }
    const [mc_a_name, mc_b_name, winnerRaw, round_name = ''] = cols;
    if (!mc_a_name || !mc_b_name) { errors.push(`${lineNo}行目: MC名が空`); continue; }
    const winner = normalizeWinner(winnerRaw);
    if (!winner) {
      errors.push(`${lineNo}行目: winner が不正 (${winnerRaw}) — a / b / draw で指定`);
      continue;
    }
    rows.push({ mc_a_name, mc_b_name, winner, round_name });
  }

  return { rows, errors };
}

type Props = { tournamentId: string; gradeCoeff: number };

export default function TournamentCsvImport({ tournamentId, gradeCoeff }: Props) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<TournamentCsvRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ registered: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string ?? '');
    reader.readAsText(file, 'utf-8');
  }

  function handleParse() {
    const { rows, errors } = parseCsv(csvText);
    setParseErrors(errors);
    setPreview(rows.length > 0 ? rows : null);
    setResult(null);
  }

  async function handleSubmit() {
    if (!preview || preview.length === 0) return;
    setProcessing(true);
    setResult(null);
    const res = await importTournamentCsv(tournamentId, gradeCoeff, preview);
    setResult({ registered: res.registered, errors: res.errors });
    setProcessing(false);
    if (res.success) {
      setPreview(null);
      setCsvText('');
    }
  }

  if (!open) {
    return (
      <div className="mt-6 border-t border-gray-800 pt-4">
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          + CSV でバトルを一括登録
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 border border-gray-700 rounded-xl p-5 space-y-4 bg-gray-900/60">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">CSV 一括登録</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">閉じる</button>
      </div>

      <div className="text-xs text-gray-600 bg-gray-800/60 rounded-lg p-3 space-y-1">
        <p className="text-gray-500 font-medium">フォーマット</p>
        <code className="text-gray-400">mc_a, mc_b, winner[, round_name]</code>
        <p>winner: <code>a</code> / <code>b</code> / <code>draw</code></p>
        <p>round_name（省略可）: {ROUND_OPTIONS.join(' / ')}</p>
        <p className="text-gray-700">例: R-指定,呂布カルマ,a,決勝</p>
      </div>

      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
        >
          ファイルを選択
        </button>
        <span className="text-xs text-gray-700">または下に貼り付け</span>
      </div>

      <textarea
        value={csvText}
        onChange={e => setCsvText(e.target.value)}
        placeholder={'mc_a,mc_b,winner,round_name\nR-指定,呂布カルマ,a,決勝\nT-PABLOW,晋平太,a,準決勝'}
        rows={6}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono placeholder-gray-700 focus:outline-none focus:border-yellow-400 resize-y"
      />

      {parseErrors.length > 0 && (
        <ul className="text-xs text-red-400 space-y-0.5">
          {parseErrors.map((e, i) => <li key={i}>・{e}</li>)}
        </ul>
      )}

      <button
        type="button"
        onClick={handleParse}
        disabled={!csvText.trim()}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 text-sm rounded-lg transition-colors"
      >
        内容を確認
      </button>

      {preview && preview.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium">{preview.length}件のバトルが検出されました</p>
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800 text-gray-500">
                  <th className="px-3 py-1.5 text-left font-medium">MC A</th>
                  <th className="px-3 py-1.5 text-left font-medium">MC B</th>
                  <th className="px-3 py-1.5 text-left font-medium">勝者</th>
                  <th className="px-3 py-1.5 text-left font-medium">ラウンド</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {preview.map((row, i) => (
                  <tr key={i} className="bg-gray-900">
                    <td className="px-3 py-1.5 text-gray-300">{row.mc_a_name}</td>
                    <td className="px-3 py-1.5 text-gray-300">{row.mc_b_name}</td>
                    <td className="px-3 py-1.5">
                      <span className={row.winner === 'a' ? 'text-yellow-300' : row.winner === 'b' ? 'text-blue-300' : 'text-gray-400'}>
                        {row.winner === 'a' ? 'A勝利' : row.winner === 'b' ? 'B勝利' : '引き分け'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{row.round_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-xs border ${result.errors.length === 0 ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-yellow-900/30 border-yellow-700 text-yellow-300'}`}>
              <p className="font-semibold">{result.registered}件を登録しました</p>
              {result.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>・{e}</li>)}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={processing}
            className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold text-sm rounded-lg transition-colors"
          >
            {processing ? '登録中...' : `${preview.length}件を登録する`}
          </button>
        </div>
      )}
    </div>
  );
}
