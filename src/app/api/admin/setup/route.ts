import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { totalOvers, battingFirstId, venue } = await req.json();

    if (!totalOvers || !battingFirstId) {
      return NextResponse.json({ error: 'totalOvers and battingFirstId are required' }, { status: 400 });
    }

    // Get latest match
    const match = await prisma.match.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!match) return NextResponse.json({ error: 'No match found' }, { status: 404 });

    // Update match config
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        totalOvers:     parseInt(totalOvers),
        battingFirstId: battingFirstId,
        venue:          venue || null,
        status:         'TOSS',
      },
    });

    return NextResponse.json({ success: true, matchId: updated.id });
  } catch (err) {
    console.error('[POST /api/admin/setup]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}