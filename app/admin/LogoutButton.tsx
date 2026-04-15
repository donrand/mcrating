'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function LogoutButton() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-red-400 transition-colors"
    >
      ログアウト
    </button>
  );
}
