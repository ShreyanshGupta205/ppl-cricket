import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { nextBowlerId } = await req.json();
    if (!nextBowlerId) {
      return NextResponse.json({ error: 'nextBowlerId required' }, { status: 400 });
    }

    const match = await prisma.match.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { innings: { include: { overs: { orderBy: { overNo: 'desc' } } } } },
    });
    if (!match) return NextResponse.json({ error: 'No match found' }, { status: 404 });

    const currentInnings = match.innings.find(
      (i) => i.inningsNo === match.currentInnings && !i.isComplete
    );
    if (!currentInnings) {
      return NextResponse.json({ error: 'No active innings' }, { status: 400 });
    }

    // The over that just finished = highest overNo in DB
    const lastOverInDB = currentInnings.overs[0]; // already sorted desc
    const lastOverNo   = lastOverInDB?.overNo ?? 1;
    const nextOverNo   = lastOverNo + 1;

    // Prevent consecutive same bowler
    if (lastOverInDB?.bowlerId === nextBowlerId) {
      return NextResponse.json(
        { error: 'Same bowler cannot bowl consecutive overs' },
        { status: 400 }
      );
    }

    // Mark last over complete
    if (lastOverInDB && !lastOverInDB.isComplete) {
      await prisma.over.update({
        where: { id: lastOverInDB.id },
        data:  { isComplete: true },
      });
    }

    // Check if next over already exists (edge case — don't create duplicate)
    const existingNextOver = await prisma.over.findFirst({
      where: { inningsId: currentInnings.id, overNo: nextOverNo },
    });

    if (existingNextOver) {
      // Just update its bowler instead of creating new
      await prisma.over.update({
        where: { id: existingNextOver.id },
        data:  { bowlerId: nextBowlerId, isComplete: false },
      });
    } else {
      await prisma.over.create({
        data: {
          inningsId:  currentInnings.id,
          overNo:     nextOverNo,
          bowlerId:   nextBowlerId,
          runs:       0,
          wickets:    0,
          maidens:    0,
          balls:      0,
          isComplete: false,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        matchId:  match.id,
        action:   'OVER_END',
        newValue: JSON.stringify({ completedOver: lastOverNo, nextOverNo, nextBowlerId }),
      },
    });

    return NextResponse.json({ success: true, nextOverNo });
  } catch (err) {
    console.error('[POST /api/admin/over/end]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}