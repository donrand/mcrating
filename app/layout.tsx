import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { version } from '../package.json';

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
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
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
        <footer className="border-t border-gray-800 mt-16">
          <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-center gap-6">
            <a
              href="https://x.com/ratingmcbattle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @ratingmcbattle
            </a>
            <span className="text-xs text-gray-700">v{version}</span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
