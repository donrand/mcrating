'use client';

import { useState, useRef, useTransition } from 'react';
import { analyzeTournamentImage, ExtractedBattle } from './actions';
import { registerBattles, RegisterResult } from '../register/actions';

type Step = 'upload' | 'review' | 'complete';

type Meta = {
  name: string;
  held_on: string;
  grade_coeff: string;
  series: string;
};

const ROUND_OPTIONS = ['決勝', '準決勝', '3位決定戦', 'ベスト8', 'ベスト16', '2回戦', '1回戦', 'シード戦', ''];

export default function TournamentImportClient() {
  const [step, setStep] = useState<Step>('upload');
  const [meta, setMeta] = useState<Meta>({ name: '', held_on: '', grade_coeff: '1.0', series: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [battles, setBattles] = useState<ExtractedBattle[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null as unknown as HTMLInputElement);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setAnalyzeError(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  }

  function handleAnalyze() {
    if (!imageFile) { setAnalyzeError('画像を選択してください'); return; }
    if (!meta.name.trim()) { setAnalyzeError('大会名を入力してください'); return; }
    const coeff = parseFloat(meta.grade_coeff);
    if (isNaN(coeff) || coeff <= 0) { setAnalyzeError('格係数は正の数で入力してください'); return; }

    setAnalyzeError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('image', imageFile);
      const result = await analyzeTournamentImage(fd);
      if (!result.success) {
        setAnalyzeError(result.error);
        return;
      }
      setBattles(result.battles);
      setStep('review');
    });
  }

  function updateBattle(idx: number, field: keyof ExtractedBattle, value: string) {
    setBattles(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  }

  function removeBattle(idx: number) {
    setBattles(prev => prev.filter((_, i) => i !== idx));
  }

  function addBattle() {
    setBattles(prev => [...prev, { mc_a: '', mc_b: '', winner: 'a', round: '' }]);
  }

  function handleRegister() {
    const coeff = parseFloat(meta.grade_coeff);
    startTransition(async () => {
      const result = await registerBattles(
        { id: null, name: meta.name.trim(), held_on: meta.held_on, grade_coeff: coeff, series: meta.series.trim() || undefined },
        battles.map(b => ({ mc_a_name: b.mc_a, mc_b_name: b.mc_b, winner: b.winner, round_name: b.round })),
      );
      setRegisterResult(result);
      setStep('complete');
    });
  }

  function reset() {
    setStep('upload');
    setMeta({ name: '', held_on: '', grade_coeff: '1.0', series: '' });
    setImageFile(null);
    setImagePreview(null);
    setBattles([]);
    setAnalyzeError(null);
    setRegisterResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div>
      <StepIndicator step={step} />

      {step === 'upload' && (
        <UploadStep
          meta={meta}
          setMeta={setMeta}
          imagePreview={imagePreview}
          fileRef={fileRef}
          onFileChange={handleFileChange}
          onAnalyze={handleAnalyze}
          isPending={isPending}
          error={analyzeError}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          meta={meta}
          imagePreview={imagePreview}
          battles={battles}
          onUpdate={updateBattle}
          onRemove={removeBattle}
          onAdd={addBattle}
          onBack={() => setStep('upload')}
          onRegister={handleRegister}
          isPending={isPending}
        />
      )}

      {step === 'complete' && registerResult && (
        <CompleteStep result={registerResult} onReset={reset} />
      )}
    </div>
  );
}

// ── Step Indicator ──────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: 'upload', label: '① 画像アップロード' },
    { key: 'review', label: '② 確認・修正' },
    { key: 'complete', label: '③ 登録完了' },
  ] as const;

  return (
    <div className="flex gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <span className={`text-sm px-4 py-2 rounded ${step === s.key ? 'bg-yellow-400 text-black font-bold' : 'text-gray-500'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-gray-600 mx-1">›</span>}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Upload ──────────────────────────────────────────────

type UploadStepProps = {
  meta: Meta;
  setMeta: (m: Meta) => void;
  imagePreview: string | null;
  fileRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  isPending: boolean;
  error: string | null;
};

function UploadStep({ meta, setMeta, imagePreview, fileRef, onFileChange, onAnalyze, isPending, error }: UploadStepProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm text-gray-400 mb-2">トーナメント画像 *</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFileChange}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
        />
        {imagePreview && (
          <div className="mt-3 border border-gray-700 rounded overflow-hidden">
            <img src={imagePreview} alt="プレビュー" className="max-h-60 w-auto mx-auto block" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">大会名 *</label>
          <input
            type="text"
            value={meta.name}
            onChange={e => setMeta({ ...meta, name: e.target.value })}
            placeholder="例: UMB 2024 FINAL"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">開催日</label>
          <input
            type="date"
            value={meta.held_on}
            onChange={e => setMeta({ ...meta, held_on: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">格係数 *</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={meta.grade_coeff}
            onChange={e => setMeta({ ...meta, grade_coeff: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">シリーズ</label>
          <input
            type="text"
            value={meta.series}
            onChange={e => setMeta({ ...meta, series: e.target.value })}
            placeholder="例: UMB, 戦極, KOK"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={onAnalyze}
        disabled={isPending}
        className="px-6 py-2.5 bg-yellow-400 text-black text-sm font-bold rounded hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? '解析中…' : '画像を解析する'}
      </button>
      {isPending && (
        <p className="text-sm text-gray-400">Claude が画像を解析しています。しばらくお待ちください…</p>
      )}
    </div>
  );
}

// ── Step 2: Review ──────────────────────────────────────────────

type ReviewStepProps = {
  meta: Meta;
  imagePreview: string | null;
  battles: ExtractedBattle[];
  onUpdate: (idx: number, field: keyof ExtractedBattle, value: string) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
  onBack: () => void;
  onRegister: () => void;
  isPending: boolean;
};

function ReviewStep({ meta, imagePreview, battles, onUpdate, onRemove, onAdd, onBack, onRegister, isPending }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {imagePreview && (
          <div className="md:w-72 shrink-0">
            <p className="text-xs text-gray-500 mb-2">アップロード画像</p>
            <img src={imagePreview} alt="トーナメント表" className="border border-gray-700 rounded w-full" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="mb-4 text-sm text-gray-400 space-y-1">
            <p><span className="text-gray-500">大会名:</span> <span className="text-white">{meta.name}</span></p>
            <p><span className="text-gray-500">開催日:</span> <span className="text-white">{meta.held_on || '未設定'}</span></p>
            <p><span className="text-gray-500">格係数:</span> <span className="text-white">{meta.grade_coeff}</span></p>
            {meta.series && <p><span className="text-gray-500">シリーズ:</span> <span className="text-white">{meta.series}</span></p>}
          </div>

          <p className="text-sm text-gray-400 mb-3">
            抽出された試合: <span className="text-yellow-400 font-bold">{battles.length}件</span>
            <span className="ml-2 text-gray-500 text-xs">内容を確認・修正してから登録してください</span>
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-700">
                  <th className="pb-2 pr-2 w-28">ラウンド</th>
                  <th className="pb-2 pr-2">MC A</th>
                  <th className="pb-2 pr-2 w-20">勝者</th>
                  <th className="pb-2 pr-2">MC B</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {battles.map((b, i) => (
                  <BattleRow key={i} battle={b} index={i} onUpdate={onUpdate} onRemove={onRemove} />
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={onAdd}
            className="mt-3 text-sm text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1 hover:border-gray-500"
          >
            + 行を追加
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-800">
        <button
          onClick={onBack}
          disabled={isPending}
          className="px-4 py-2 text-sm border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50"
        >
          ← 戻る
        </button>
        <button
          onClick={onRegister}
          disabled={isPending || battles.length === 0}
          className="px-6 py-2 bg-yellow-400 text-black text-sm font-bold rounded hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? '登録中…' : `${battles.length}件を登録する`}
        </button>
      </div>
    </div>
  );
}

type BattleRowProps = {
  battle: ExtractedBattle;
  index: number;
  onUpdate: (idx: number, field: keyof ExtractedBattle, value: string) => void;
  onRemove: (idx: number) => void;
};

function BattleRow({ battle, index, onUpdate, onRemove }: BattleRowProps) {
  const input = 'bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-yellow-400 w-full';

  return (
    <tr className="border-b border-gray-800">
      <td className="py-1.5 pr-2">
        <input
          list="round-options"
          value={battle.round}
          onChange={e => onUpdate(index, 'round', e.target.value)}
          placeholder="ラウンド"
          className={input}
        />
        <datalist id="round-options">
          {ROUND_OPTIONS.filter(Boolean).map(r => <option key={r} value={r} />)}
        </datalist>
      </td>
      <td className="py-1.5 pr-2">
        <input
          value={battle.mc_a}
          onChange={e => onUpdate(index, 'mc_a', e.target.value)}
          placeholder="MC A"
          className={`${input} ${battle.winner === 'a' ? 'border-yellow-500' : ''}`}
        />
      </td>
      <td className="py-1.5 pr-2">
        <select
          value={battle.winner}
          onChange={e => onUpdate(index, 'winner', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-1 py-1 text-sm text-white focus:outline-none focus:border-yellow-400 w-full"
        >
          <option value="a">A 勝ち</option>
          <option value="b">B 勝ち</option>
          <option value="draw">引き分け</option>
        </select>
      </td>
      <td className="py-1.5 pr-2">
        <input
          value={battle.mc_b}
          onChange={e => onUpdate(index, 'mc_b', e.target.value)}
          placeholder="MC B"
          className={`${input} ${battle.winner === 'b' ? 'border-yellow-500' : ''}`}
        />
      </td>
      <td className="py-1.5">
        <button onClick={() => onRemove(index)} className="text-gray-600 hover:text-red-400 text-lg leading-none px-1">×</button>
      </td>
    </tr>
  );
}

// ── Step 3: Complete ────────────────────────────────────────────

function CompleteStep({ result, onReset }: { result: RegisterResult; onReset: () => void }) {
  return (
    <div className="max-w-lg space-y-4">
      <div className={`rounded-lg p-5 border ${result.success ? 'border-green-700 bg-green-900/20' : 'border-yellow-700 bg-yellow-900/10'}`}>
        <p className="text-lg font-bold text-white mb-1">
          {result.success ? '✓ 登録完了' : '⚠ 一部エラーあり'}
        </p>
        <p className="text-sm text-gray-300">{result.registered}件の試合を登録しました</p>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded border border-red-800 bg-red-900/20 p-4">
          <p className="text-sm text-red-400 font-bold mb-2">エラー ({result.errors.length}件)</p>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-xs text-red-300">{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onReset}
          className="px-5 py-2 bg-yellow-400 text-black text-sm font-bold rounded hover:bg-yellow-300"
        >
          別の画像を登録する
        </button>
        <a
          href="/admin/battles"
          className="px-5 py-2 border border-gray-700 text-gray-300 text-sm rounded hover:text-white hover:border-gray-500"
        >
          バトル管理へ
        </a>
      </div>
    </div>
  );
}
