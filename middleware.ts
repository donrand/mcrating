import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createSupabaseMiddlewareClient(request);

  // セッションを更新（トークンリフレッシュ）
  const { data: { user } } = await supabase.auth.getUser();

  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  const isLoginPath = request.nextUrl.pathname === '/admin/login';

  // 未ログインで /admin/* にアクセス → ログインページへ
  if (isAdminPath && !isLoginPath && !user) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ログイン済みで /admin/login にアクセス → 管理画面トップへ
  if (isLoginPath && user) {
    const adminUrl = new URL('/admin', request.url);
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
