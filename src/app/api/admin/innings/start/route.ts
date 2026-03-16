import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { inningsNo, battingTeamId, bowlingTeamId, opener1Id, opener2Id, bowlerId } =
      await req.json();

    if (!battingTeamId || !bowlingTeamId || !opener1Id || !opener2Id || !bowlerId) {
      return NextResponse.json({ error: 'All player selections are required' }, { status: 400 });
    }

    const match = await prisma.match.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!match) return NextResponse.json({ error: 'No match found' }, { status: 404 });

    // Create innings record
    const innings = await prisma.innings.create({
      data: {
        matchId:       match.id,
        inningsNo:     inningsNo ?? 1,
        battingTeamId,
        bowlingTeamId,
        totalRuns:     0,
        wickets:       0,
        balls:         0,
        isComplete:    false,
        // Set target for innings 2
        target: inningsNo === 2 ? (await getInnings1Total(match.id)) + 1 : null,
      },
    });

    // Create first over record
    await prisma.over.create({
      data: {
        inningsId:  innings.id,
        overNo:     1,
        bowlerId,
        runs:       0,
        wickets:    0,
        maidens:    0,
        balls:      0,
        isComplete: false,
      },
    });

    // Create opening partnership
    await prisma.partnership.create({
      data: {
        inningsId: innings.id,
        batter1Id: opener1Id,
        batter2Id: opener2Id,
        runs:      0,
        balls:     0,
        isActive:  true,
      },
    });

    // Set match to LIVE and store current innings number
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status:         'LIVE',
        currentInnings: inningsNo ?? 1,
      },
    });

    // Store openers in audit log so we know who is batting
    await prisma.auditLog.create({
      data: {
        matchId:  match.id,
        action:   `INNINGS_${inningsNo ?? 1}_START`,
        newValue: JSON.stringify({ inningsId: innings.id, opener1Id, opener2Id, bowlerId, battingTeamId }),
      },
    });

    return NextResponse.json({ success: true, inningsId: innings.id });
  } catch (err) {
    console.error('[POST /api/admin/innings/start]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper — get innings 1 total to calculate innings 2 target
async function getInnings1Total(matchId: string): Promise<number> {
  const innings1 = await prisma.innings.findFirst({
    where:   { matchId, inningsNo: 1 },
    select:  { totalRuns: true },
  });
  return innings1?.totalRuns ?? 0;
}