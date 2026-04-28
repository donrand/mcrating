'use client';

import { useState, useRef } from 'react';
import { registerBattles, registerMultipleTournaments, MultiRegisterResult } from './actions';

// ---- 型定義 ----------------------------------------------------------------

type MC = { id: string; name: string };
type Tournament = { id: string; name: string; held_on: string | null; grade_coeff: number };

type BattleRow = {
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw' | '';
  round_name: string;
};

type TournamentGroup = {
  tournament_name: string;
  held_on: string;
  grade_coeff: number;
  series: string;
  battles: BattleRow[];
};

type ParseResult = { groups: TournamentGroup[] };

// ---- CSV パーサー ----------------------------------------------------------

function normalizeWinner(raw: string): BattleRow['winner'] | null {
  const w = raw.toLowerCase().replace(/\s/g, '');
  if (w === 'a' || w === 'a側' || w === '1') return 'a';
  if (w === 'b' || w === 'b側' || w === '2') return 'b';
  if (w === 'draw' || w === '引き分け' || w === '0') return 'draw';
  return null;
}

function parseCsv(text: string): { result: ParseResult; errors: string[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const errors: string[] = [];
  if (lines.length === 0) return { result: { groups: [] }, errors };

  let start = 0;
  const firstLower = lines[0].toLowerCase();
  if (firstLower.includes('tournament') || firstLower.includes('mc_a') || firstLower.includes('mc a') || firstLower.includes('winner')) {
    start = 1;
  }

  const groupMap = new Map<string, TournamentGroup>();

  for (let i = start; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 6) {
      errors.push(`${lineNo}行目: カラム数不足（最低6列: tournament_name,held_on,grade_coeff,mc_a,mc_b,winner）`);
      continue;
    }

    const [tournament_name, held_on, grade_coeff_str, mc_a_name, mc_b_name, winnerRaw, round_name = '', series = ''] = cols;

    if (!tournament_name) { errors.push(`${lineNo}行目: 大会名が空`); continue; }
    if (!mc_a_name || !mc_b_name) { errors.push(`${lineNo}行目: MC名が空`); continue; }

    const grade_coeff = parseFloat(grade_coeff_str);
    if (isNaN(grade_coeff) || grade_coeff <= 0) {
      errors.push(`${lineNo}行目: grade_coeff が不正 (${grade_coeff_str}) — 例: 3.0`);
      continue;
    }

    const winner = normalizeWinner(winnerRaw);
    if (!winner) {
      errors.push(`${lineNo}行目: winner の値が不正 (${winnerRaw}) — a / b / draw で指定`);
      continue;
    }

    if (!groupMap.has(tournament_name)) {
      groupMap.set(tournament_name, { tournament_name, held_on: held_on || '', grade_coeff, series, battles: [] });
    } else if (series && !groupMap.get(tournament_name)!.series) {
      groupMap.get(tournament_name)!.series = series;
    }
    groupMap.get(tournament_name)!.battles.push({ mc_a_name, mc_b_name, winner, round_name });
  }

  return { result: { groups: Array.from(groupMap.values()) }, errors };
}

// ---- 定数 -----------------------------------------------------------------

const ALL_ROUNDS = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '3位決定戦', '決勝'];
const DEFAULT_ROUNDS = ['1回戦', '2回戦', '準決勝', '決勝'];

const emptyRow = (): BattleRow => ({ mc_a_name: '', mc_b_name: '', winner: '', round_name: '' });

type Props = { mcs: MC[]; tournaments: Tournament[]; seriesOptions: string[] };

// ---- コンポーネント --------------------------------------------------------

export default function RegisterClient({ mcs, tournaments, seriesOptions }: Props) {
  // 大会設定
  const [tournamentId, setTournamentId] = useState('');
  const [isNewTournament, setIsNewTournament] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [heldOn, setHeldOn] = useState('');
  const [gradeCoeff, setGradeCoeff] = useState<number | ''>('');
  const [series, setSeries] = useState('');

  // 出場MC
  const [participantMcs, setParticipantMcs] = useState<string[]>([]);
  const [mcInput, setMcInput] = useState('');

  // ラウンド設定
  const [selectedRounds, setSelectedRounds] = useState<string[]>(DEFAULT_ROUNDS);

  // バトル入力
  const [rows, setRows] = useState<BattleRow[]>([emptyRow(), emptyRow()]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ registered: number; errors: string[] } | null>(null);

  // CSV インポート
  const [csvText, setCsvText] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showCsv, setShowCsv] = useState(false);
  const [csvDefaultSeries, setCsvDefaultSeries] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 複数大会インポート
  const [multiGroups, setMultiGroups] = useState<TournamentGroup[] | null>(null);
  const [multiProcessing, setMultiProcessing] = useState(false);
  const [multiResult, setMultiResult] = useState<MultiRegisterResult | null>(null);

  // ---- MC 登録ハンドラー ---------------------------------------------------

  function addParticipant(name: string) {
    const trimmed = name.trim();
    if (!trimmed || participantMcs.includes(trimmed)) return;
    setParticipantMcs(p => [...p, trimmed]);
    setMcInput('');
  }

  function removeParticipant(name: string) {
    setParticipantMcs(p => p.filter(m => m !== name));
    setRows(r => r.map(row => ({
      ...row,
      mc_a_name: row.mc_a_name === name ? '' : row.mc_a_name,
      mc_b_name: row.mc_b_name === name ? '' : row.mc_b_name,
    })));
  }

  // ---- ラウンド設定ハンドラー -----------------------------------------------

  function toggleRound(round: string) {
    setSelectedRounds(r =>
      r.includes(round) ? r.filter(x => x !== round) : [...r, round]
    );
  }

  // ---- CSV ハンドラー -------------------------------------------------------

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string ?? '');
    reader.readAsText(file, 'utf-8');
  }

  function handleCsvImport() {
    const { result: parsed, errors } = parseCsv(csvText);
    setCsvErrors(errors);
    if (parsed.groups.length > 0) {
      const groups = csvDefaultSeries
        ? parsed.groups.map(g => ({ ...g, series: g.series || csvDefaultSeries }))
        : parsed.groups;
      setMultiGroups(groups);
      setMultiResult(null);
      setShowCsv(false);
      setCsvText('');
    }
  }

  // ---- 複数大会ハンドラー ---------------------------------------------------

  async function handleMultiSubmit() {
    if (!multiGroups || multiGroups.length === 0) return;
    setMultiProcessing(true);
    setMultiResult(null);

    const res = await registerMultipleTournaments(
      multiGroups.map(g => ({
        tournament_name: g.tournament_name,
        held_on: g.held_on,
        grade_coeff: g.grade_coeff,
        series: g.series || undefined,
        battles: g.battles.map(b => ({ ...b, winner: b.winner as 'a' | 'b' | 'draw' })),
      })),
    );

    setMultiResult(res);
    setMultiProcessing(false);
    if (res.success) setMultiGroups(null);
  }

  // ---- バトル行ハンドラー ---------------------------------------------------

  function updateRow(index: number, patch: Partial<BattleRow>) {
    setRows(r => r.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function addRow() { setRows(r => [...r, emptyRow()]); }
  function removeRow(index: number) { setRows(r => r.filter((_, i) => i !== index)); }

  function handleTournamentSelect(id: string) {
    setTournamentId(id);
    const t = tournaments.find(t => t.id === id);
    if (t) {
      if (t.held_on) setHeldOn(t.held_on);
      setGradeCoeff(t.grade_coeff);
    }
  }

  // ---- 単一大会登録 ---------------------------------------------------------

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
        series: series || undefined,
      },
      validRows.map(r => ({ ...r, winner: r.winner as 'a' | 'b' | 'draw' })),
    );

    setResult({ registered: res.registered, errors: res.errors });
    setProcessing(false);
    if (res.success) setRows([emptyRow(), emptyRow()]);
  }

  const filledRows = rows.filter(r => r.mc_a_name || r.mc_b_name || r.winner).length;
  const multiTotal = multiGroups?.reduce((s, g) => s + g.battles.length, 0) ?? 0;
  const mcNames = mcs.map(m => m.name);

  // ドロップダウン用MCリスト: 出場MC登録済みならそちらを優先、なければ全MCから選択
  const dropdownMcs = participantMcs.length > 0 ? participantMcs : mcNames;

  // ---- レンダリング --------------------------------------------------------

  return (
    <div className="space-y-8">

      {/* CSV インポート（折りたたみ） */}
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
          <div className="text-xs text-gray-600">
            <code className="bg-gray-800 px-1 rounded">tournament_name, held_on, grade_coeff, mc_a, mc_b, winner[, round[, series]]</code>
          </div>
        )}

        {showCsv && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 space-y-1 bg-gray-800 rounded-lg p-3">
              <p className="font-medium text-gray-400 mb-2">フォーマット（ヘッダー行は自動スキップ）</p>
              <p><code>tournament_name, held_on, grade_coeff, mc_a, mc_b, winner[, round[, series]]</code></p>
              <p className="text-gray-600">winner: a / b / draw（a側・1・引き分けなども可）</p>
              <p className="text-gray-600">held_on: YYYY-MM-DD 形式（空欄可）</p>
              <p className="text-gray-600">series: UMB / 戦極 / KOK など（任意・大会全行共通）</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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

            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 shrink-0">デフォルトシリーズ</label>
              <select
                value={csvDefaultSeries}
                onChange={e => setCsvDefaultSeries(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
              >
                <option value="">指定しない</option>
                {seriesOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-xs text-gray-600 shrink-0">CSV の series 列が空の行に適用</span>
            </div>

            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={
                'tournament_name,held_on,grade_coeff,mc_a,mc_b,winner,round,series\n' +
                'UMB 2024 GRAND CHAMPIONSHIP,2024-12-22,3.0,R-指定,呂布カルマ,a,決勝,UMB\n' +
                'UMB 2024 GRAND CHAMPIONSHIP,2024-12-22,3.0,MOL53,CIMA,b,準決勝,UMB\n' +
                'KOK 2024,2024-11-03,3.0,T-PABLOW,晋平太,a,決勝,KOK'
              }
              rows={7}
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
              読み込む
            </button>
          </div>
        )}
      </div>

      {/* 複数大会インポート プレビュー */}
      {multiGroups && (
        <div className="bg-gray-900 border border-yellow-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
              複数大会インポート — {multiGroups.length}大会 / 合計{multiTotal}バトル
            </h2>
            <button
              type="button"
              onClick={() => { setMultiGroups(null); setMultiResult(null); }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              クリア
            </button>
          </div>

          <div className="space-y-2 mb-6">
            {multiGroups.map((g, i) => (
              <div key={i} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white">{g.tournament_name}</span>
                  <span className="ml-3 text-xs text-gray-500">
                    {g.held_on && <>{g.held_on} · </>}
                    格係数 <span className="text-yellow-400 font-medium">{g.grade_coeff}</span>
                    {g.series && <> · <span className="text-blue-400">{g.series}</span></>}
                    {!g.series && <> · <span className="text-red-400">シリーズ未設定</span></>}
                  </span>
                </div>
                <span className="text-xs text-gray-500 shrink-0 ml-4">{g.battles.length}バトル</span>
              </div>
            ))}
          </div>

          {multiResult && (
            <div className={`mb-4 p-4 rounded-xl border text-sm ${multiResult.success ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-yellow-900/30 border-yellow-700 text-yellow-300'}`}>
              <p className="font-semibold mb-2">合計 {multiResult.totalRegistered}件を登録しました</p>
              <div className="space-y-1">
                {multiResult.results.map((r, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-gray-400">{r.tournamentName}: </span>
                    <span>{r.registered}件登録</span>
                    {r.errors.length > 0 && (
                      <ul className="mt-1 ml-4">
                        {r.errors.map((e, j) => <li key={j} className="text-red-400">・{e}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleMultiSubmit}
            disabled={multiProcessing}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold rounded-xl transition-colors"
          >
            {multiProcessing ? '登録中...' : `${multiTotal}件（${multiGroups.length}大会）を一括登録する`}
          </button>
        </div>
      )}

      {/* ① 大会設定 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">① 大会設定</h2>
        <div className="grid sm:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-xs text-gray-400 mb-1">シリーズ <span className="text-red-400">*</span></label>
            <select
              value={series}
              onChange={e => setSeries(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            >
              <option value="">選択してください</option>
              {seriesOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">開催日</label>
            <input
              type="date"
              value={heldOn}
              onChange={e => setHeldOn(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>

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

      {/* ② 出場MC登録 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">② 出場MC登録</h2>
          <span className="text-xs text-gray-600">登録するとバトル入力がドロップダウンになります</span>
        </div>

        <datalist id="mc-all-list">
          {mcNames.map(name => <option key={name} value={name} />)}
        </datalist>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            list="mc-all-list"
            placeholder="MC名を入力または選択"
            value={mcInput}
            onChange={e => setMcInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(mcInput); } }}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          />
          <button
            type="button"
            onClick={() => addParticipant(mcInput)}
            disabled={!mcInput.trim()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 text-sm rounded-lg transition-colors"
          >
            追加
          </button>
        </div>

        {participantMcs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {participantMcs.map(name => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-200"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeParticipant(name)}
                  className="text-gray-500 hover:text-red-400 leading-none transition-colors"
                  aria-label={`${name}を削除`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">出場MCを登録するとバトル入力欄がドロップダウンになります（未登録時は全MCから選択）</p>
        )}
      </div>

      {/* ③ ラウンド設定 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">③ ラウンド設定</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_ROUNDS.map(round => (
            <button
              key={round}
              type="button"
              onClick={() => toggleRound(round)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                selectedRounds.includes(round)
                  ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {round}
            </button>
          ))}
        </div>
        {selectedRounds.length === 0 && (
          <p className="mt-2 text-xs text-red-400">ラウンドを1つ以上選択してください</p>
        )}
      </div>

      {/* ④ バトル入力 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            ④ バトル入力
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

        <div className="space-y-2">
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_10rem_8rem_2rem] gap-2 px-3 text-xs text-gray-600">
            <span>MC A</span><span>MC B</span><span>勝者</span><span>ラウンド</span><span></span>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_10rem_8rem_2rem] gap-2 items-center bg-gray-900 rounded-lg p-3 border border-gray-800">
              <select
                value={row.mc_a_name}
                onChange={e => updateRow(i, { mc_a_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              >
                <option value="">MC A を選択</option>
                {dropdownMcs.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <select
                value={row.mc_b_name}
                onChange={e => updateRow(i, { mc_b_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              >
                <option value="">MC B を選択</option>
                {dropdownMcs.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <select
                value={row.winner}
                onChange={e => updateRow(i, { winner: e.target.value as BattleRow['winner'] })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              >
                <option value="">勝者</option>
                <option value="a">{row.mc_a_name || 'A'} 勝利</option>
                <option value="b">{row.mc_b_name || 'B'} 勝利</option>
                <option value="draw">引き分け</option>
              </select>

              <select
                value={row.round_name}
                onChange={e => updateRow(i, { round_name: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-yellow-400 w-full"
              >
                <option value="">ラウンド</option>
                {selectedRounds.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <button
                type="button" onClick={() => removeRow(i)}
                className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors"
                aria-label="削除"
              >×</button>
            </div>
          ))}
        </div>

        <button
          type="button" onClick={addRow}
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
