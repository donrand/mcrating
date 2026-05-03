'use client';

import { useRef, useState } from 'react';
import { importTournamentCsv, type TournamentCsvRow } from './actions';

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

  let start = 0;
  const first = lines[0].toLowerCase();
  if (first.includes('mc_a') || first.includes('mc a') || first.includes('winner') || first.includes('勝者')) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const lineNo = i + 1;
    // CSVパース（ダブルクォート対応）
    const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)
      ?.map(c => c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c)
      .map(c => c.trim()) ?? [];
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
    reader.onload = ev => {
      setCsvText(ev.target?.result as string ?? '');
      setPreview(null);
      setResult(null);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
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

  return (
    <div className="mt-8 border-t border-gray-800 pt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">CSV インポート</h2>
        <button
          onClick={() => { setOpen(v => !v); setPreview(null); setResult(null); }}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          {open ? '閉じる' : '開く'}
        </button>
      </div>

      {open && (
        <div className="border border-gray-700 rounded-xl p-5 space-y-4 bg-gray-900/60">
          <div className="text-xs text-gray-600 bg-gray-800/60 rounded-lg p-3 space-y-1">
            <p className="text-gray-500 font-medium">フォーマット（ダウンロードしたCSVと同じ形式）</p>
            <code className="text-gray-400">mc_a, mc_b, winner, round_name</code>
            <p>winner: <code>a</code>（左勝）/ <code>b</code>（右勝）/ <code>draw</code>（引き分け）</p>
            <p className="text-gray-700">既存バトルと重複する行は自動スキップされます</p>
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
            onChange={e => { setCsvText(e.target.value); setPreview(null); setResult(null); }}
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
              <p className="text-xs text-gray-400 font-medium">{preview.length}行を読み込みました（既存バトルと重複する行はスキップされます）</p>
              <div className="border border-gray-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
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
                            {row.winner === 'a' ? 'A勝' : row.winner === 'b' ? 'B勝' : '引分'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{row.round_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result && (
                <div className={`p-3 rounded-lg text-xs border ${result.errors.length === 0 && result.registered > 0 ? 'bg-green-900/30 border-green-700 text-green-400' : result.registered === 0 && result.errors.length === 0 ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-yellow-900/30 border-yellow-700 text-yellow-300'}`}>
                  <p className="font-semibold">
                    {result.registered > 0 ? `${result.registered}件を新規登録しました` : '新規バトルはありませんでした（全行スキップ）'}
                  </p>
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
                {processing ? '登録中...' : `インポート実行（${preview.length}行）`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
