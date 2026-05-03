import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const ROUND_ORDER = ['1回戦', 'シード戦', '2回戦', 'ベスト16', 'ベスト8', '準決勝', '3位決定戦', '決勝'];

type McInfo = { name: string };
type BattleRow = {
  winner: string;
  round_name: string | null;
  mc_a: McInfo | null;
  mc_b: McInfo | null;
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const admin = createAdminClient();

  const [{ data: tournament }, { data: raw }] = await Promise.all([
    admin.from('tournaments').select('name').eq('id', params.id).single(),
    admin
      .from('battles')
      .select('winner, round_name, mc_a:mcs!battles_mc_a_id_fkey(name), mc_b:mcs!battles_mc_b_id_fkey(name)')
      .eq('tournament_id', params.id)
      .eq('status', 'approved'),
  ]);

  if (!tournament) {
    return new NextResponse('Not found', { status: 404 });
  }

  const battles = (raw ?? []) as unknown as BattleRow[];

  // ラウンド順にソート
  const sorted = [...battles].sort((a, b) => {
    const ra = ROUND_ORDER.indexOf(a.round_name ?? '');
    const rb = ROUND_ORDER.indexOf(b.round_name ?? '');
    return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  });

  const lines = [
    '# 新しいバトルを末尾に追記してインポートすると追加登録されます',
    '# winner: a（左勝）/ b（右勝）/ draw（引き分け）',
    'mc_a,mc_b,winner,round_name',
    ...sorted.map(b => {
      const mcA = b.mc_a?.name ?? '';
      const mcB = b.mc_b?.name ?? '';
      const winner = b.winner;
      const round = b.round_name ?? '';
      // CSVエスケープ（カンマ・ダブルクォートを含む場合）
      const esc = (s: string) => s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      return `${esc(mcA)},${esc(mcB)},${winner},${esc(round)}`;
    }),
  ];

  const csv = '﻿' + lines.join('\r\n'); // BOM付きUTF-8（Excelで開く場合の文字化け対策）
  const filename = encodeURIComponent(tournament.name) + '.csv';

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
