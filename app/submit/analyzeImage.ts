'use server';

import Anthropic from '@anthropic-ai/sdk';

export type ImageAnalysisResult = {
  tournament_name: string;
  held_on: string;
  mc_a_name: string;
  mc_b_name: string;
  winner: 'a' | 'b' | 'draw' | '';
  round_name: string;
};

export async function analyzeImage(base64Image: string, mediaType: string): Promise<ImageAnalysisResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `この画像は日本のMCバトル（ラップバトル）の対戦結果やトーナメント表などです。
以下の情報をJSON形式で抽出してください。情報が読み取れない場合は空文字にしてください。

{
  "tournament_name": "大会名（例: UMB 2023, KOK CLIMAX 2023など）",
  "held_on": "開催日（YYYY-MM-DD形式。年だけわかる場合は省略可、例: 2023-11-03）",
  "mc_a_name": "対戦者Aの名前（MCネーム）",
  "mc_b_name": "対戦者Bの名前（MCネーム）",
  "winner": "勝者（AがMC Aなら\"a\"、BがMC Bなら\"b\"、引き分けは\"draw\"、不明は\"\"）",
  "round_name": "ラウンド名（例: 決勝、準決勝、予選Aブロックなど。不明は\"\"）"
}

JSONのみを返してください。余計な説明は不要です。`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // JSON部分を抽出
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { tournament_name: '', held_on: '', mc_a_name: '', mc_b_name: '', winner: '', round_name: '' };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      tournament_name: String(parsed.tournament_name ?? ''),
      held_on: String(parsed.held_on ?? ''),
      mc_a_name: String(parsed.mc_a_name ?? ''),
      mc_b_name: String(parsed.mc_b_name ?? ''),
      winner: (['a', 'b', 'draw'].includes(parsed.winner) ? parsed.winner : '') as 'a' | 'b' | 'draw' | '',
      round_name: String(parsed.round_name ?? ''),
    };
  } catch {
    return { tournament_name: '', held_on: '', mc_a_name: '', mc_b_name: '', winner: '', round_name: '' };
  }
}
