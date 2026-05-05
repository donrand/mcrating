import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'このサイトについて | MCバトル レーティング',
  description: 'MCバトルレーティングのレーティング算出方法・連絡先',
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
              新レート = 旧レート + K × 大会係数 × (結果 − 期待勝率)
            </div>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li><span className="text-gray-200">期待勝率</span>：相手との実力差から算出（Elo標準式）</li>
              <li><span className="text-gray-200">大会係数</span>：大会ティア（A/B/C）により自動決定</li>
            </ul>
          </div>

          {/* 大会ティアシステム */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-white">大会係数の算出方法</p>

            <div className="bg-gray-950 rounded-lg px-4 py-3 font-mono text-xs text-green-400 space-y-1">
              <div>grade_coeff = clamp(1.0, 3.0,  B_tier × Q)</div>
              <div className="text-gray-600">Q = clamp(0.92, 1.08,  1 + 0.12 × (T−Y) / σY)</div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 text-xs text-center">
              {[
                { tier: 'A', label: '最上位',   base: '2.6', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
                { tier: 'B', label: '上位',     base: '2.2', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
                { tier: 'C', label: '標準',     base: '1.8', color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30' },
                { tier: 'D', label: '小規模',   base: '1.4', color: 'text-gray-400',   bg: 'bg-gray-800 border-gray-700' },
                { tier: 'E', label: '草大会',   base: '1.1', color: 'text-gray-500',   bg: 'bg-gray-900 border-gray-800' },
              ].map(({ tier, label, base, color, bg }) => (
                <div key={tier} className={`rounded-lg px-1 py-2 border ${bg}`}>
                  <div className={`font-bold text-sm ${color}`}>{tier}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{label}</div>
                  <div className="font-mono text-yellow-300 font-bold mt-1">×{base}</div>
                </div>
              ))}
            </div>

            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li><span className="text-gray-300">B_tier</span>：大会シリーズに固定で設定されるベース係数</li>
              <li><span className="text-gray-300">Q</span>：大会参加者の平均レートに基づく微調整（±8%以内）</li>
              <li>参加者8名未満の大会は Q=1.0 固定</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            ※ レーティングは試合の時系列順（開催日 → ラウンド順）に計算されます。
            ランキングには10試合以上の出場者のみ表示されます。
          </p>
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
