import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BallSchema = z.object({
  inningsId:      z.string().min(1),
  batsmanId:      z.string().min(1),
  bowlerId:       z.string().min(1),
  runs:           z.number().min(0).max(6).default(0),
  isWide:         z.boolean().default(false),
  isNoBall:       z.boolean().default(false),
  isBye:          z.boolean().default(false),
  isLegBye:       z.boolean().default(false),
  isBoundary:     z.boolean().default(false),
  isSix:          z.boolean().default(false),
  isFreeHit:      z.boolean().default(false),
  extraRuns:      z.number().default(0),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const parsed = BallSchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;

  // ── Load innings ────────────────────────────────────────────────────────────
  const innings = await prisma.innings.findUnique({
    where:   { id: d.inningsId },
    include: { match: true },
  });

  if (!innings) {
    return NextResponse.json({ error: 'Innings not found' }, { status: 404 });
  }
  if (innings.isComplete) {
    return NextResponse.json({ error: 'Innings already complete' }, { status: 400 });
  }
  if (innings.match.status !== 'LIVE') {
    return NextResponse.json(
      { error: `Match not LIVE (status: ${innings.match.status})` },
      { status: 400 },
    );
  }

  // ── Calculations — all done BEFORE transaction to avoid closure issues ──────
  const isLegal       = !d.isWide && !d.isNoBall;
  const overNo        = Math.floor(innings.balls / 6) + 1;
  const ballNoInOver  = isLegal ? (innings.balls % 6) + 1 : 0;
  const deliveryNo    = (await prisma.ballEvent.count({ where: { inningsId: d.inningsId } })) + 1;

  const extraBase   = d.isWide || d.isNoBall ? 1 : 0;
  const batsmanRuns = d.isBye || d.isLegBye || d.isWide ? 0 : Number(d.runs);
  const totalRuns   = batsmanRuns + extraBase + Number(d.extraRuns);

  const newBalls     = isLegal ? innings.balls + 1 : innings.balls;
  const newTotalRuns = innings.totalRuns + totalRuns;

  const overJustCompleted = isLegal && newBalls % 6 === 0;
  const oversComplete     = isLegal && newBalls >= innings.match.totalOvers * 6;

  // Target chased check
  const inningsTarget  = innings.target ?? null;
  const targetChased   =
    innings.inningsNo === 2 &&
    inningsTarget !== null &&
    newTotalRuns >= inningsTarget;

  const inningsEnds = oversComplete || targetChased;

  // ── Build result text OUTSIDE transaction (uses Prisma — not allowed inside) ─
  let resultText = '';
  if (inningsEnds && innings.inningsNo === 2) {
    if (targetChased) {
      const wicketsRemaining = 10 - innings.wickets;
      const ballsLeft        = innings.match.totalOvers * 6 - newBalls;
      const battingTeam      = await prisma.team.findUnique({
        where:  { id: innings.battingTeamId },
        select: { name: true },
      });
      resultText =
        `${battingTeam?.name ?? 'Team'} won by ` +
        `${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''} ` +
        `(${ballsLeft} ball${ballsLeft !== 1 ? 's' : ''} remaining)`;
    } else {
      // Overs complete — lower score wins for team 1
      const inn1 = await prisma.innings.findFirst({
        where:  { matchId: innings.matchId, inningsNo: 1 },
        select: { totalRuns: true, battingTeamId: true },
      });
      if (inn1 && inn1.totalRuns > newTotalRuns) {
        const winTeam = await prisma.team.findUnique({
          where:  { id: inn1.battingTeamId },
          select: { name: true },
        });
        const margin = inn1.totalRuns - newTotalRuns;
        resultText = `${winTeam?.name ?? 'Team'} won by ${margin} run${margin !== 1 ? 's' : ''}`;
      } else if (inn1 && newTotalRuns === inn1.totalRuns) {
        resultText = 'Match tied!';
      } else {
        resultText = 'Match complete';
      }
    }
  }

  // ── Transaction ─────────────────────────────────────────────────────────────
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Record ball event
      await tx.ballEvent.create({
        data: {
          inningsId:  d.inningsId,
          overNo,
          ballNo:     ballNoInOver,
          deliveryNo,
          batsmanId:  d.batsmanId,
          bowlerId:   d.bowlerId,
          runs:       batsmanRuns,
          isWide:     d.isWide,
          isNoBall:   d.isNoBall,
          isBye:      d.isBye,
          isLegBye:   d.isLegBye,
          isBoundary: d.isBoundary,
          isSix:      d.isSix,
          isFreeHit:  d.isFreeHit,
          extraRuns:  Number(d.extraRuns),
        },
      });

      // 2. Update innings totals
      await tx.innings.update({
        where: { id: d.inningsId },
        data: {
          totalRuns:    { increment: totalRuns },
          balls:        isLegal ? { increment: 1 } : undefined,
          extrasWide:   d.isWide   ? { increment: extraBase + Number(d.extraRuns) } : undefined,
          extrasNoBall: d.isNoBall ? { increment: extraBase + Number(d.extraRuns) } : undefined,
          extrasBye:    d.isBye    ? { increment: Number(d.runs) } : undefined,
          extrasLegBye: d.isLegBye ? { increment: Number(d.runs) } : undefined,
          isComplete:   inningsEnds || undefined,
        },
      });

      // 3. Update current over
      await tx.over.updateMany({
        where: { inningsId: d.inningsId, overNo, isComplete: false },
        data: {
          runs:       { increment: totalRuns },
          balls:      isLegal ? { increment: 1 } : undefined,
          isComplete: overJustCompleted || inningsEnds || undefined,
        },
      });

      // 4. Update active partnership
      await tx.partnership.updateMany({
        where: { inningsId: d.inningsId, isActive: true },
        data: {
          runs:  { increment: totalRuns },
          balls: isLegal ? { increment: 1 } : undefined,
        },
      });

      // 5. Handle innings / match end
      if (inningsEnds) {
        if (innings.inningsNo === 1) {
          await tx.match.update({
            where: { id: innings.matchId },
            data:  { status: 'INNINGS_BREAK', currentInnings: 2 },
          });
        } else {
          await tx.match.update({
            where: { id: innings.matchId },
            data:  {
              status:     'COMPLETE',
              resultText: resultText || 'Match complete',
            },
          });
        }
      }

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          matchId:  innings.matchId,
          action:   'BALL',
          newValue: JSON.stringify({ overNo, ballNoInOver, batsmanRuns, totalRuns, targetChased }),
        },
      });
    });

    return NextResponse.json({ success: true, overJustCompleted, inningsEnds, targetChased });

  } catch (err) {
    console.error('[POST /api/admin/ball]', err);
    return NextResponse.json({ error: 'Failed to record ball' }, { status: 500 });
  }
}