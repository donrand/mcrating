'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';

async function requireAdmin() {
  const { data: { user } } = await createSupabaseServerClient().auth.getUser();
  if (!user) throw new Error('認証が必要です');
}

export type ExtractedBattle = {
  mc_a: string;
  mc_b: string;
  winner: 'a' | 'b' | 'draw';
  round: string;
};

export type AnalyzeResult =
  | { success: true; battles: ExtractedBattle[] }
  | { success: false; error: string };

const API_URL = (process.env.TOURNAMENT_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export async function analyzeTournamentImage(formData: FormData): Promise<AnalyzeResult> {
  await requireAdmin();

  const file = formData.get('image') as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: '画像が選択されていません' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '画像サイズは10MB以下にしてください' };
  }

  // Python API サーバーに画像を送信
  const apiForm = new FormData();
  apiForm.append('image', file);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      body: apiForm,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return {
      success: false,
      error:
        `解析サーバーに接続できません (${API_URL})。\n` +
        `tournament-analyzer/ で「python3 api.py」を起動してください。`,
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { success: false, error: `サーバーエラー (${res.status}): ${text}` };
  }

  type ApiResponse = { success: boolean; battles: ExtractedBattle[]; error?: string };
  const json = (await res.json()) as ApiResponse;

  if (!json.success) {
    return { success: false, error: json.error ?? '解析に失敗しました' };
  }

  return { success: true, battles: json.battles };
}
