'use client';

export default function TournamentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <p className="text-gray-400">ページの読み込みに失敗しました</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        再読み込み
      </button>
    </div>
  );
}
