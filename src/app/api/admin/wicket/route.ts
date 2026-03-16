import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const {
      inningsId,
      batsmanId,
      bowlerId,
      wicketType,
      fielderId,
      nextBatsmanId,
      runs = 0,
    } = await req.json();

    if (!inningsId || !batsmanId || !bowlerId || !wicketType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Load innings ONCE — use plain variables throughout, no closures ────────
    const innings = await prisma.innings.findUnique({
      where:   { id: inningsId },
      include: { match: true },
    });

    if (!innings || innings.isComplete) {
      return NextResponse.json({ error: 'Innings not active' }, { status: 400 });
    }
    if (innings.match.status !== 'LIVE') {
      return NextResponse.json({ error: 'Match not live' }, { status: 400 });
    }

    // ── All calculations upfront — NO nested async functions ──────────────────
    const currentOverNo  = Math.floor(innings.balls / 6) + 1;
    const ballNoInOver   = (innings.balls % 6) + 1;
    const deliveryNo     = (await prisma.ballEvent.count({ where: { inningsId } })) + 1;

    const newWickets     = innings.wickets + 1;
    const newBalls       = innings.balls + 1;
    const newTotalRuns   = innings.totalRuns + Number(runs);
    const isAllOut       = newWickets >= 10;
    const inningsMatchId = innings.matchId;
    const inningsNo      = innings.inningsNo;
    const battingTeamId  = innings.battingTeamId;
    const totalOvers     = innings.match.totalOvers;
    const inningsTarget  = innings.target ?? null;

    // Target chased = innings 2 score reaches target
    const targetChased =
      inningsNo === 2 &&
      inningsTarget !== null &&
      newTotalRuns >= inningsTarget;

    const inningsEnds = isAllOut || targetChased;

    // ── Build result text — all Prisma calls done HERE, before transaction ─────
    let resultText = 'Match complete';

    if (inningsEnds && inningsNo === 2) {
      if (targetChased && !isAllOut) {
        // Won by wickets
        const wicketsRemaining = 10 - innings.wickets; // wickets before this one
        const ballsLeft        = totalOvers * 6 - newBalls;
        const battingTeam      = await prisma.team.findUnique({
          where:  { id: battingTeamId },
          select: { name: true },
        });
        resultText =
          `${battingTeam?.name ?? 'Team'} won by ` +
          `${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''} ` +
          `(${ballsLeft} ball${ballsLeft !== 1 ? 's' : ''} remaining)`;

      } else if (isAllOut) {
        // All out — team 1 wins by run difference
        const inn1 = await prisma.innings.findFirst({
          where:  { matchId: inningsMatchId, inningsNo: 1 },
          select: { totalRuns: true, battingTeamId: true },
        });
        const margin = (inn1?.totalRuns ?? 0) - newTotalRuns;

        if (margin > 0) {
          const winTeam = await prisma.team.findUnique({
            where:  { id: inn1?.battingTeamId ?? '' },
            select: { name: true },
          });
          resultText = `${winTeam?.name ?? 'Team'} won by ${margin} run${margin !== 1 ? 's' : ''}`;
        } else if (margin === 0) {
          resultText = 'Match tied!';
        } else {
          // Shouldn't happen but handle gracefully
          const chasingTeam = await prisma.team.findUnique({
            where:  { id: battingTeamId },
            select: { name: true },
          });
          resultText = `${chasingTeam?.name ?? 'Team'} won`;
        }
      }
    }

    // ── Transaction — only DB writes, no Prisma reads ─────────────────────────
    await prisma.$transaction(async (tx) => {

      // 1. Record wicket ball event
      await tx.ballEvent.create({
        data: {
          inningsId,
          overNo:     currentOverNo,
          ballNo:     ballNoInOver,
          deliveryNo,
          batsmanId,
          bowlerId,
          runs:       Number(runs),
          isWicket:   true,
          wicketType,
          fielderId:  fielderId || null,
          isBoundary: false,
          isSix:      false,
          isFreeHit:  false,
          extraRuns:  0,
        },
      });

      // 2. Update innings
      await tx.innings.update({
        where: { id: inningsId },
        data: {
          wickets:    { increment: 1 },
          balls:      { increment: 1 },
          totalRuns:  Number(runs) > 0 ? { increment: Number(runs) } : undefined,
          isComplete: inningsEnds || undefined,
        },
      });

      // 3. Update current over
      await tx.over.updateMany({
        where: { inningsId, overNo: currentOverNo, isComplete: false },
        data: {
          balls:   { increment: 1 },
          wickets: { increment: 1 },
          runs:    Number(runs) > 0 ? { increment: Number(runs) } : undefined,
        },
      });

      // 4. Close current partnership
      await tx.partnership.updateMany({
        where: { inningsId, isActive: true },
        data:  { isActive: false },
      });

      // 5. Open new partnership if match continues
      if (!inningsEnds && nextBatsmanId) {
        const closedPartnership = await tx.partnership.findFirst({
          where:   { inningsId, isActive: false },
          orderBy: { id: 'desc' },
        });

        const nonStrikerId =
          closedPartnership?.batter1Id === batsmanId
            ? closedPartnership?.batter2Id
            : closedPartnership?.batter1Id;

        if (nonStrikerId) {
          await tx.partnership.create({
            data: {
              inningsId,
              batter1Id: nextBatsmanId,
              batter2Id: nonStrikerId,
              runs:      0,
              balls:     0,
              isActive:  true,
            },
          });
        }
      }

      // 6. Handle innings / match end
      if (inningsEnds) {
        if (inningsNo === 1) {
          await tx.match.update({
            where: { id: inningsMatchId },
            data:  { status: 'INNINGS_BREAK', currentInnings: 2 },
          });
        } else {
          await tx.match.update({
            where: { id: inningsMatchId },
            data:  { status: 'COMPLETE', resultText },
          });
        }
      }

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          matchId:  inningsMatchId,
          action:   'WICKET',
          newValue: JSON.stringify({
            batsmanId, bowlerId, wicketType,
            fielderId, runs, nextBatsmanId,
            isAllOut, targetChased, inningsEnds,
          }),
        },
      });
    });

    return NextResponse.json({ success: true, inningsEnds, isAllOut, targetChased });

  } catch (err) {
    console.error('[POST /api/admin/wicket]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}