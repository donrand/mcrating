'use server';

import Anthropic from '@anthropic-ai/sdk';
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

const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedMime = (typeof SUPPORTED_MIME)[number];

export async function analyzeTournamentImage(formData: FormData): Promise<AnalyzeResult> {
  await requireAdmin();

  const file = formData.get('image') as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: '画像が選択されていません' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: '画像サイズは5MB以下にしてください' };
  }

  const mimeType = file.type as SupportedMime;
  if (!SUPPORTED_MIME.includes(mimeType)) {
    return { success: false, error: 'JPEG / PNG / GIF / WebP のみ対応しています' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  const client = new Anthropic();

  let rawText = '';
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            {
              type: 'text',
              text: `このトーナメント表の画像から全試合の情報を抽出してください。

以下のJSON配列形式のみで返してください（説明文は不要）：
[
  {
    "mc_a": "選手Aの名前",
    "mc_b": "選手Bの名前",
    "winner": "a" または "b" または "draw",
    "round": "ラウンド名"
  }
]

抽出ルール：
- 赤い線・矢印・強調で示された選手が勝者（winnerは"a"か"b"）
- 勝敗が判断できない場合は "draw"
- roundは「決勝」「準決勝」「3位決定戦」「ベスト8」「ベスト16」「2回戦」「1回戦」など
- 選手名は画像の文字を正確に抽出
- 全試合を漏れなく抽出`,
            },
          ],
        },
      ],
    });

    rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (e) {
    return {
      success: false,
      error: `Claude API エラー: ${e instanceof Error ? e.message : '不明なエラー'}`,
    };
  }

  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return { success: false, error: '解析結果をJSON形式で取得できませんでした' };
  }

  try {
    const battles = JSON.parse(jsonMatch[0]) as ExtractedBattle[];
    if (!Array.isArray(battles)) throw new Error('配列形式ではありません');
    return { success: true, battles };
  } catch {
    return { success: false, error: 'JSON解析に失敗しました: ' + rawText.slice(0, 200) };
  }
}
