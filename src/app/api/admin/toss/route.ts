import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tossWonById, tossDecision, battingFirstId } = await req.json();

    if (!tossWonById || !tossDecision || !battingFirstId) {
      return NextResponse.json(
        { error: 'tossWonById, tossDecision and battingFirstId are required' },
        { status: 400 }
      );
    }

    const match = await prisma.match.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!match) return NextResponse.json({ error: 'No match found' }, { status: 404 });

    await prisma.match.update({
      where: { id: match.id },
      data: {
        tossWonById,
        tossDecision,
        battingFirstId,
        status: 'TOSS', // stays TOSS until innings starts
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/admin/toss]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}