import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MCバトル レーティング',
  description: '国内MCバトルシーンの拡張Eloレーティングランキングサイト',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <header className="border-b border-gray-800 bg-gray-900">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight text-white hover:text-yellow-400 transition-colors">
              MCバトルRating
            </Link>
            <nav className="flex gap-4 text-sm text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">ランキング</Link>
              <Link href="/battles" className="hover:text-white transition-colors">試合結果</Link>
              <Link href="/tournaments" className="hover:text-white transition-colors">大会一覧</Link>
              <Link href="/submit" className="hover:text-white transition-colors">情報提供</Link>
            </nav>
            <div className="ml-auto">
              <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                管理者
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
