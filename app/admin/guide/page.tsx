import type { Metadata } from 'next';
import AdminNav from '../AdminNav';
import { ROUND_ORDER } from '@/lib/rounds';

export const metadata: Metadata = { title: '使い方ガイド | 管理画面' };

const SAMPLE_SINGLE = `tournament_name,held_on,grade_coeff,mc_a,mc_b,winner,round,series
UMB 2024 GRAND CHAMPIONSHIP,2024-12-28,3.0,R-指定,呂布カルマ,a,決勝,UMB
UMB 2024 GRAND CHAMPIONSHIP,2024-12-28,3.0,MOL53,CIMA,b,準決勝,UMB
UMB 2024 GRAND CHAMPIONSHIP,2024-12-28,3.0,T-PABLOW,晋平太,a,準決勝,UMB
UMB 2024 GRAND CHAMPIONSHIP,2024-12-28,3.0,R-指定,MOL53,a,ベスト8,UMB
UMB 2024 GRAND CHAMPIONSHIP,2024-12-28,3.0,呂布カルマ,CIMA,a,ベスト8,UMB`;

const SAMPLE_MULTI = `tournament_name,held_on,grade_coeff,mc_a,mc_b,winner,round,series
UMB 2024 GRAND CHAMPIONSHIP,2024-12-28,3.0,R-指定,呂布カルマ,a,決勝,UMB
UMB 2024 GRAND CHAMPIONSHIP,2024-12-28,3.0,MOL53,CIMA,b,準決勝,UMB
KOK 2024 GRAND CHAMPIONSHIP FINAL,2025-01-11,3.0,T-PABLOW,晋平太,a,決勝,KOK
KOK 2024 GRAND CHAMPIONSHIP FINAL,2025-01-11,3.0,舐達麻,FORK,b,準決勝,KOK
地方大会 2024,2024-10-15,1.5,MC太郎,MC次郎,a,決勝,`;

type Column = { name: string; required: boolean; description: string; example: string };

const columns: Column[] = [
  { name: 'tournament_name', required: true,  description: '大会名（同名の既存大会があれば自動で紐付け）',         example: 'UMB 2024 GRAND CHAMPIONSHIP' },
  { name: 'held_on',         required: false, description: '開催日（YYYY-MM-DD 形式）。空欄可',                   example: '2024-12-28' },
  { name: 'grade_coeff',     required: true,  description: '大会格係数（正の数値）',                             example: '3.0' },
  { name: 'mc_a',            required: true,  description: 'MC A の名前',                                        example: 'R-指定' },
  { name: 'mc_b',            required: true,  description: 'MC B の名前',                                        example: '呂布カルマ' },
  { name: 'winner',          required: true,  description: '勝者（下表参照）',                                   example: 'a' },
  { name: 'round',           required: false, description: 'ラウンド名（下表参照）。空欄可',                     example: '決勝' },
  { name: 'series',          required: false, description: 'シリーズタグ。同大会名の行で共通値を使用。空欄可',   example: 'UMB' },
];

const winnerValues = [
  { values: 'a / a側 / 1', meaning: 'MC A の勝利' },
  { values: 'b / b側 / 2', meaning: 'MC B の勝利' },
  { values: 'draw / 引き分け / 0', meaning: '引き分け' },
];

const roundValues = [...ROUND_ORDER];

const coeffGuide = [
  { label: '草大会・予選', value: '1.0' },
  { label: '地方大会',     value: '1.5' },
  { label: '中規模大会',   value: '2.0' },
  { label: '全国規模',     value: '2.5' },
  { label: 'UMB・KOK・戦極など主要大会', value: '3.0' },
];

function CopyBlock({ text }: { text: string }) {
  return (
    <pre className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre leading-relaxed">
      {text}
    </pre>
  );
}

export default function GuidePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理画面</h1>
      </div>
      <AdminNav active="guide" />

      <div className="max-w-3xl space-y-12">
        <section>
          <h2 className="text-lg font-semibold mb-4">CSV インポート — 使い方ガイド</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            「一括登録」ページの CSV インポート機能を使うと、大会の試合結果をまとめて登録できます。
            1大会でも複数大会でも同じフォーマットで扱えます。
          </p>
        </section>

        {/* フォーマット */}
        <section>
          <h3 className="text-base font-semibold mb-3 text-yellow-400">CSVフォーマット</h3>
          <CopyBlock text="tournament_name,held_on,grade_coeff,mc_a,mc_b,winner[,round[,series]]" />
          <p className="text-xs text-gray-500 mt-2">
            1行目はヘッダー行として自動スキップされます（<code className="bg-gray-800 px-1 rounded">tournament_name</code> や <code className="bg-gray-800 px-1 rounded">mc_a</code> などが含まれる場合）。
            ヘッダーなしでも動作します。
            <code className="bg-gray-800 px-1 rounded ml-1">#</code> で始まる行はコメントとして無視されます。
          </p>

          <div className="mt-4 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-900 text-gray-400">
                  <th className="px-4 py-2 text-left font-medium">列名</th>
                  <th className="px-3 py-2 text-left font-medium">必須</th>
                  <th className="px-4 py-2 text-left font-medium">説明</th>
                  <th className="px-4 py-2 text-left font-medium">例</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, i) => (
                  <tr key={col.name} className={i % 2 === 0 ? 'bg-gray-900/50' : ''}>
                    <td className="px-4 py-2 font-mono text-yellow-300">{col.name}</td>
                    <td className="px-3 py-2 text-center">
                      {col.required
                        ? <span className="text-red-400 font-bold">必須</span>
                        : <span className="text-gray-600">任意</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-300">{col.description}</td>
                    <td className="px-4 py-2 font-mono text-gray-400">{col.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* winner */}
        <section>
          <h3 className="text-base font-semibold mb-3 text-yellow-400">winner の入力値</h3>
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-900 text-gray-400">
                  <th className="px-4 py-2 text-left font-medium">入力値</th>
                  <th className="px-4 py-2 text-left font-medium">意味</th>
                </tr>
              </thead>
              <tbody>
                {winnerValues.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/50' : ''}>
                    <td className="px-4 py-2 font-mono text-green-400">{row.values}</td>
                    <td className="px-4 py-2 text-gray-300">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-2">大文字・小文字・前後のスペースは無視されます。</p>
        </section>

        {/* ラウンド名 */}
        <section>
          <h3 className="text-base font-semibold mb-3 text-yellow-400">ラウンド名（推奨）</h3>
          <p className="text-xs text-gray-400 mb-3">
            レーティングは開催日 → ラウンド順に計算されます。以下の名称を使うと正しく並び替えられます。
          </p>
          <div className="flex flex-wrap gap-2">
            {roundValues.map((r, i) => (
              <div key={r} className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-500">{i + 1}.</span>
                <span className="text-sm font-mono text-gray-200">{r}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            上記以外の名称でも登録できますが、ラウンド順ソートの対象外になります（末尾扱い）。<br />
            シード選手が出場する試合は「シード戦」ではなく <span className="font-mono text-gray-400">2回戦</span> で登録してください。
          </p>
        </section>

        {/* 大会格係数 */}
        <section>
          <h3 className="text-base font-semibold mb-3 text-yellow-400">grade_coeff（大会格係数）の目安</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {coeffGuide.map(({ label, value }) => (
              <div key={value} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <div className="font-mono text-yellow-300 font-bold text-lg">{value}</div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            0.1 単位で任意の値を設定できます。格係数管理ページから後から変更することも可能です（変更後は全再計算が必要）。
          </p>
        </section>

        {/* サンプル */}
        <section>
          <h3 className="text-base font-semibold mb-4 text-yellow-400">サンプルCSV</h3>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">単一大会（1大会のみ）</p>
              <CopyBlock text={SAMPLE_SINGLE} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">複数大会（同じファイルに混在）</p>
              <CopyBlock text={SAMPLE_MULTI} />
              <p className="text-xs text-gray-600 mt-2">
                大会名が同じ行は自動でグループ化されます。既存の大会名と一致する場合は既存大会に紐付けられます（大文字・小文字を区別しません）。
                series 列は大会ごとに最初の非空値が使用されます。空欄の場合は登録画面のシリーズ選択と合わせてください。
              </p>
            </div>
          </div>
        </section>

        {/* 操作手順 */}
        <section>
          <h3 className="text-base font-semibold mb-4 text-yellow-400">インポート手順</h3>
          <ol className="space-y-3">
            {[
              { step: 1, title: 'CSVを用意する', body: '上記フォーマットに従ってCSVを作成します。Excelやスプレッドシートで作成してCSV形式で保存するか、テキストエディタで直接作成してください。' },
              { step: 2, title: '一括登録ページを開く', body: '「一括登録」タブを開き、「CSV インポート」セクションの「開く」をクリックします。' },
              { step: 3, title: 'CSVを貼り付けまたはファイル選択', body: 'テキストエリアに直接貼り付けるか、「ファイルを選択」からCSVファイルをアップロードします。' },
              { step: 4, title: '「読み込む」をクリック', body: 'パースエラーがある場合は赤字で表示されます。エラーがなければ大会プレビューが表示されます。' },
              { step: 5, title: 'プレビューを確認して登録', body: '大会名・開催日・格係数・バトル件数を確認し、「○件を一括登録する」ボタンで登録します。' },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 text-gray-900 font-bold text-xs flex items-center justify-center">
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm mb-1">{title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 注意事項 */}
        <section>
          <h3 className="text-base font-semibold mb-3 text-yellow-400">注意事項</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-2"><span className="text-yellow-400 shrink-0">•</span><span>MC名は既存のMCと<strong className="text-white">完全一致</strong>（大文字小文字不問）する場合に自動で紐付けられます。一致しない場合は新規MCとして登録されます。</span></li>
            <li className="flex gap-2"><span className="text-yellow-400 shrink-0">•</span><span>同一人物の別名義がある場合は、登録後に「全再計算」が必要です。名義統合は <code className="bg-gray-800 px-1 rounded text-xs">scripts/merge_mcs.mjs</code> を使用してください。</span></li>
            <li className="flex gap-2"><span className="text-yellow-400 shrink-0">•</span><span>同一大会内で同じ MC ペアがすでに登録されている場合、そのバトルは<strong className="text-white">自動でスキップ</strong>されます（重複防止）。スキップ件数は登録結果に表示されます。</span></li>
            <li className="flex gap-2"><span className="text-yellow-400 shrink-0">•</span><span>登録済みの大会にバトルを追加した場合、レーティングの整合性のために「全再計算」（バトル管理ページ）を実行することを推奨します。</span></li>
            <li className="flex gap-2"><span className="text-yellow-400 shrink-0">•</span><span>格係数を後から変更した場合は必ず全再計算を実行してください。</span></li>
            <li className="flex gap-2"><span className="text-yellow-400 shrink-0">•</span><span>CSV の文字コードは UTF-8 で保存してください。Shift-JIS では文字化けする場合があります。</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
