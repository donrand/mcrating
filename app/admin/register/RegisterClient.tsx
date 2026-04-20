'use client';

import { useState, useRef } from 'react';
import { registerBattles } from './actions';

// CSVテキストをBattleRow配列に変換
function parseCsv(text: string): { rows: BattleRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const rows: BattleRow[] = [];
  const errors: string[] = [];

  // ヘッダー行の検出（mc_a / mc_b / winner などが含まれていたらスキップ）
  let start = 0;
  const first = lines[0]?.toLowerCase() ?? '';
  if (first.includes('mc_a') || first.includes('mc a') || first.includes('winner')) start = 1;

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 3) { errors.push(`${i + 1}行目: カラム数が不足 (${cols.join(',')})`); continue; }

    const [mc_a_name, mc_b_name, winnerRaw, round_name = ''] = cols;
    if (!mc_a_name || !mc_b_name) { errors.push(`${i + 1}行目: MC名が空`); continue; }

    // winner の正規化
    const w = winnerRaw.toLowerCase().replace(/\s/g, '');
    let winner: BattleRow['winner'] = '';
    if (w === 'a' || w === 'a側' || w === '1') winner = 'a';
    else if (w === 'b' || w === 'b側' || w === '2') winner = 'b';
    else if (w === 'draw' || w === '引き分け' || w === '0') winner = 'draw';
    else { errors.push(`${i + 1}行目: winner の値が不正 (${winnerRaw}) — a / b / draw で指定`); continue; }

    rows.push({ mc_a_name, mc_b_name, winner, round_name });
  }

  return { rows, errors };
}

type MC = { id: string; name: string };
type Tournament = { id: string; name: string; held_on: string | null; grade_coeff: number };

type BattleRow = {
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw' | '';
  round_name: string;
};

const emptyRow = (): BattleRow => ({ mc_a_name: '', mc_b_name: '', winner: '', round_name: '' });

type Props = { mcs: MC[]; tournaments: Tournament[] };

export default function RegisterClient({ mcs, tournaments }: Props) {
  const [tournamentId, setTournamentId] = useState('');
  const [isNewTournament, setIsNewTournament] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [heldOn, setHeldOn] = useState('');
  const [gradeCoeff, setGradeCoeff] = useState<number | ''>('');
  const [rows, setRows] = useState<BattleRow[]>([emptyRow(), emptyRow()]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ registered: number; errors: string[] } | null>(null);

  // CSV インポート用
  const [csvText, setCsvText] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showCsv, setShowCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string ?? '');
    reader.readAsText(file, 'utf-8');
  }

  function handleCsvImport() {
    const { rows: parsed, errors } = parseCsv(csvText);
    setCsvErrors(errors);
    if (parsed.length > 0) {
      setRows(parsed);
      setShowCsv(false);
      setCsvText('');
    }
  }

  const mcNames = mcs.map(m => m.name);

  function updateRow(index: number, patch: Partial<BattleRow>) {
    setRows(r => r.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function addRow() {
    setRows(r => [...r, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows(r => r.filter((_, i) => i !== index));
  }

  // 大会選択時に開催日・格係数を自動入力
  function handleTournamentSelect(id: string) {
    setTournamentId(id);
    const t = tournaments.find(t => t.id === id);
    if (t) {
      if (t.held_on) setHeldOn(t.held_on);
      setGradeCoeff(t.grade_coeff);
    }
  }

  async function handleSubmit() {
    if (!gradeCoeff) { alert('大会格係数を設定してください'); return; }
    const validRows = rows.filter(r => r.mc_a_name.trim() && r.mc_b_name.trim() && r.winner);
    if (validRows.length === 0) { alert('バトルを1件以上入力してください（勝者未設定のものは除外されます）'); return; }

    const tName = isNewTournament ? tournamentName.trim() : tournaments.find(t => t.id === tournamentId)?.name ?? '';
    if (!tName) { alert('大会名を入力してください'); return; }

    setProcessing(true);
    setResult(null);

    const res = await registerBattles(
      {
        id: isNewTournament ? null : tournamentId || null,
        name: tName,
        held_on: heldOn,
        grade_coeff: Number(gradeCoeff),
      },
      validRows.map(r => ({ ...r, winner: r.winner as 'a' | 'b' | 'draw' })),
    );

    setResult({ registered: res.registered, errors: res.errors });
    setProcessing(false);

    if (res.success) {
      setRows([emptyRow(), emptyRow()]);
    }
  }

  const filledRows = rows.filter(r => r.mc_a_name || r.mc_b_name || r.winner).length;

  return (
    <div className="space-y-8">
      {/* 大会設定 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">大会設定</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* 大会選択 */}
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">大会</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsNewTournament(false)}
                className={`px-3 py-1 rounded text-xs ${!isNewTournament ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}
              >
                既存から選択
              </button>
              <button
                type="button"
                onClick={() => setIsNewTournament(true)}
                className={`px-3 py-1 rounded text-xs ${isNewTournament ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}
              >
                新規作成
              </button>
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
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.held_on ? ` (${t.held_on})` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* 開催日 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">開催日</label>
            <input
              type="date"
              value={heldOn}
              onChange={e => setHeldOn(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* 大会格係数 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">大会格係数 <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              <select
                value={gradeCoeff}
                onChange={e => setGradeCoeff(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
              >
                <option value="">選択</option>
                <option value="3.0">3.0 — 主要大会（UMB・KOK・戦極）</option>
                <option value="1.5">1.5 — 地方大会</option>
                <option value="1.0">1.0 — 地下バトル</option>
              </select>
              <input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="手入力"
                value={gradeCoeff}
                onChange={e => setGradeCoeff(e.target.value ? Number(e.target.value) : '')}
                className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CSV インポート */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">CSV インポート</h2>
          <button
            type="button"
            onClick={() => setShowCsv(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showCsv ? '閉じる' : '開く'}
          </button>
        </div>

        {!showCsv && (
          <p className="text-xs text-gray-600">
            CSVファイルまたはテキストから行を一括読み込みできます。形式:{' '}
            <code className="bg-gray-800 px-1 rounded">mc_a,mc_b,winner,round</code>
          </p>
        )}

        {showCsv && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              1行目はヘッダー行として自動スキップされます。winner は{' '}
              <code className="bg-gray-800 px-1 rounded">a</code> /{' '}
              <code className="bg-gray-800 px-1 rounded">b</code> /{' '}
              <code className="bg-gray-800 px-1 rounded">draw</code> で指定してください。
            </p>

            {/* ファイル選択 */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                ファイルを選択
              </button>
              <span className="text-xs text-gray-600">または下に貼り付け</span>
            </div>

            {/* テキスト貼り付け */}
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={'mc_a,mc_b,winner,round\nR-指定,呂布カルマ,a,決勝\nMOL53,CIMA,b,準決勝'}
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono placeholder-gray-700 focus:outline-none focus:border-yellow-400 resize-y"
            />

            {csvErrors.length > 0 && (
              <ul className="text-xs text-red-400 space-y-0.5">
                {csvErrors.map((e, i) => <li key={i}>・{e}</li>)}
              </ul>
            )}

            <button
              type="button"
              onClick={handleCsvImport}
              disabled={!csvText.trim()}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold text-sm rounded-lg transition-colors"
            >
              読み込んでバトル一覧に反映
            </button>
          </div>
        )}
      </div>

      {/* バトル一覧 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            バトル一覧
            {filledRows > 0 && <span className="ml-2 text-yellow-400">{filledRows}件入力中</span>}
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            + 行を追加
          </button>
        </div>

        {/* MCサジェスト用datalist */}
        <datalist id="mc-list">
          {mcNames.map(name => <option key={name} value={name} />)}
        </datalist>

        <div className="space-y-2">
          {/* ヘッダー */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_8rem_8rem_2rem] gap-2 px-3 text-xs text-gray-600">
            <span>MC A</span>
            <span>MC B</span>
            <span>勝者</span>
            <span>ラウンド</span>
            <span></span>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_8rem_8rem_2rem] gap-2 items-center bg-gray-900 rounded-lg p-3 border border-gray-800">
              <input
                type="text"
                list="mc-list"
                placeholder="MC A"
                value={row.mc_a_name}
                onChange={e => updateRow(i, { mc_a_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              />
              <input
                type="text"
                list="mc-list"
                placeholder="MC B"
                value={row.mc_b_name}
                onChange={e => updateRow(i, { mc_b_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              />
              <select
                value={row.winner}
                onChange={e => updateRow(i, { winner: e.target.value as BattleRow['winner'] })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              >
                <option value="">勝者</option>
                <option value="a">A 勝利</option>
                <option value="b">B 勝利</option>
                <option value="draw">引き分け</option>
              </select>
              <input
                type="text"
                placeholder="ラウンド（任意）"
                value={row.round_name}
                onChange={e => updateRow(i, { round_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors"
                aria-label="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-600 hover:text-gray-400 hover:border-gray-600 transition-colors"
        >
          + 行を追加
        </button>
      </div>

      {/* 結果表示 */}
      {result && (
        <div className={`p-4 rounded-xl border text-sm ${result.errors.length === 0 ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-yellow-900/30 border-yellow-700 text-yellow-300'}`}>
          <p className="font-semibold mb-1">{result.registered}件を登録しました</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {result.errors.map((e, i) => <li key={i}>・{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={processing}
        className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold rounded-xl transition-colors"
      >
        {processing ? '登録中...' : `${rows.filter(r => r.mc_a_name && r.mc_b_name && r.winner).length}件を一括登録する`}
      </button>
    </div>
  );
}
