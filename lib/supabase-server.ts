import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server Components / Server Actions 用（Cookie経由でセッション管理）
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component では Cookie の書き込みは不可（middleware が処理する）
          }
        },
      },
    },
  );
}
