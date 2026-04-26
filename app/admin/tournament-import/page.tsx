import AdminNav from '../AdminNav';
import TournamentImportClient from './TournamentImportClient';

export default function TournamentImportPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <AdminNav active="tournament-import" />
        <h1 className="text-xl font-bold mb-2">画像からトーナメント登録</h1>
        <p className="text-sm text-gray-500 mb-8">
          トーナメント表の画像をアップロードすると、Claude が試合結果を自動解析します。内容を確認・修正してから登録してください。
        </p>
        <TournamentImportClient />
      </div>
    </div>
  );
}
