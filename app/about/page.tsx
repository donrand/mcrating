import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'このサイトについて | MCバトル レーティング',
  description: 'MCバトルレーティングのレーティング算出方法・情報提供の使い方・連絡先',
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-bold mb-2">このサイトについて</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          MCバトルRatingは、国内MCバトルシーンの試合結果をもとに独自のレーティングを算出・公開するファンサイトです。
          公式団体とは一切関係なく、個人が運営しています。
        </p>
      </div>

      {/* 免責事項 */}
      <section>
        <h2 className="text-lg font-bold mb-3 text-yellow-400">免責事項</h2>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4 text-sm text-gray-300 leading-relaxed">
          <p>
            レーティングはラッパーの強さや実力を示すものではありません。
            あくまで試合結果に基づく独自指標です。参考程度にご利用ください。
          </p>
          <p className="mt-2 text-gray-500">
            掲載されている情報の正確性については保証できません。誤情報を発見した場合はXよりご連絡ください。
          </p>
        </div>
      </section>

      {/* レーティング算出方法 */}
      <section>
        <h2 className="text-lg font-bold mb-4">レーティングの算出方法</h2>
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            チェスの世界で使われている <strong className="text-white">Eloレーティング</strong> をベースに、
            MCバトル向けに拡張したアルゴリズムを採用しています。
          </p>

          {/* 基本パラメータ */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-white mb-3">基本パラメータ</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="text-gray-400">初期レート</div><div className="font-mono text-yellow-300">1500</div>
              <div className="text-gray-400">レート下限</div><div className="font-mono text-yellow-300">1000</div>
              <div className="text-gray-400">K値（感度）</div><div className="font-mono text-yellow-300">20</div>
            </div>
          </div>

          {/* 計算式 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-white">計算式</p>
            <div className="font-mono text-xs bg-gray-950 rounded-lg px-4 py-3 text-green-400 leading-relaxed">
              新レート = 旧レート + K × 大会格係数 × (結果 − 期待勝率)
            </div>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li><span className="text-gray-200">期待勝率</span>：相手との実力差から算出（Elo標準式）</li>
              <li><span className="text-gray-200">大会格係数</span>：大会の規模・格に応じて設定（1.0〜3.0程度）</li>
            </ul>
          </div>

          {/* 大会格係数の目安 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="font-semibold text-white mb-3">大会格係数の目安</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              {[
                { label: '草大会・予選', coeff: '1.0' },
                { label: '中規模大会', coeff: '1.5' },
                { label: '主要大会', coeff: '2.0' },
                { label: '全国規模', coeff: '2.5' },
                { label: 'トップ大会', coeff: '3.0' },
              ].map(({ label, coeff }) => (
                <div key={coeff} className="bg-gray-800 rounded-lg px-2 py-2">
                  <div className="text-gray-400">{label}</div>
                  <div className="font-mono text-yellow-300 font-bold mt-1">×{coeff}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            ※ レーティングは試合の時系列順（開催日 → ラウンド順）に計算されます。
            ランキングには5試合以上の出場者のみ表示されます。
          </p>
        </div>
      </section>

      {/* 情報提供の方法 */}
      <section>
        <h2 className="text-lg font-bold mb-4">情報提供の方法</h2>
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            試合結果の情報提供はどなたでも匿名で行えます。管理者が内容を確認した後、レーティングに反映されます。
          </p>

          <div className="space-y-3">
            {/* STEP 1 */}
            <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 text-gray-900 font-bold text-xs flex items-center justify-center">1</div>
              <div>
                <p className="font-semibold text-white mb-1">情報提供フォームを開く</p>
                <p className="text-gray-400 text-xs">
                  ナビゲーションの「情報提供」または下のボタンからアクセスできます。
                  1件ずつ入力する「単一入力」と、複数試合をまとめて入力する「一括入力」の2種類があります。
                </p>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 text-gray-900 font-bold text-xs flex items-center justify-center">2</div>
              <div>
                <p className="font-semibold text-white mb-1">試合情報を入力する</p>
                <p className="text-gray-400 text-xs">
                  大会名・開催日・対戦MC・勝者・ラウンド名を入力してください。
                  YouTubeやXのURLを証拠として添付すると審査がスムーズです（任意）。
                </p>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 text-gray-900 font-bold text-xs flex items-center justify-center">3</div>
              <div>
                <p className="font-semibold text-white mb-1">管理者が審査・反映</p>
                <p className="text-gray-400 text-xs">
                  投稿内容を管理者が確認します。問題がなければ承認され、レーティングに反映されます。
                  内容に誤りがある場合は却下されることがあります。
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/submit"
            className="inline-block mt-2 px-5 py-2 bg-yellow-400 text-gray-900 font-bold rounded-xl text-sm hover:bg-yellow-300 transition-colors"
          >
            情報提供フォームへ
          </Link>
        </div>
      </section>

      {/* 連絡先 */}
      <section>
        <h2 className="text-lg font-bold mb-4">連絡先</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-gray-300 space-y-3">
          <p>
            誤情報の報告・ご意見・ご要望は X（Twitter）のDMまたはリプライにてお気軽にどうぞ。
          </p>
          <a
            href="https://x.com/ratingmcbattle"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @ratingmcbattle
          </a>
        </div>
      </section>
    </div>
  );
}
