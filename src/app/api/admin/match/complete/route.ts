import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { resultText, manOfMatchId } = await req.json();

    const match = await prisma.match.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { innings: true },
    });
    if (!match) return NextResponse.json({ error: 'No match found' }, { status: 404 });

    // Mark current innings complete
    await prisma.innings.updateMany({
      where:  { matchId: match.id, isComplete: false },
      data:   { isComplete: true },
    });

    // Update match
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status:       'COMPLETE',
        resultText:   resultText ?? 'Match complete',
        manOfMatchId: manOfMatchId ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        matchId: match.id,
        action:  'MATCH_COMPLETE',
        newValue: { resultText, manOfMatchId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/admin/match/complete]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}