新しいページをこのプロジェクトに追加する。

## 手順

1. `app/<ページ名>/page.tsx` を作成（Server Component）
   - revalidate 値を設定する（ランキング系: 60、試合系: 300、大会系: 3600、管理画面: 設定なし）
2. 必要なら `app/<ページ名>/<Name>Client.tsx` を作成（Client Component）
3. `app/layout.tsx` のナビゲーションに追加する
4. 管理画面ページの場合は `app/admin/AdminNav.tsx` の Tab 型と tabs 配列に追加する

## Server Action を追加する場合

```typescript
'use server';
import { createAdminClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function myAction(param: string) {
  const admin = createAdminClient();
  // ... DB操作
  revalidatePath('/関連ページ');
}
```

## Supabase テーブルを追加する場合

1. `supabase/migrations/` に SQL ファイルを追加
2. `lib/supabase.ts` に型定義を追加
3. Supabase ダッシュボードで SQL を実行
