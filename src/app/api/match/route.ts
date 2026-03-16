import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MatchState, InningsState, BallIcon } from '@/types/cricket';

export const dynamic = 'force-dynamic';
// ─── buildInningsState ───────────────────────────────────────────────────────
function buildInningsState(innings: any, players: any[], totalOvers: number): InningsState {
  const events: any[]       = innings.ballEvents   ?? [];
  const partnerships: any[] = innings.partnerships ?? [];
  const activePartnership   = partnerships.find((p: any) => p.isActive) ?? null;

  // ── Current over balls ────────────────────────────────────────────────────
  const maxOverNo = events.length > 0
    ? Math.max(...events.map((e: any) => e.overNo))
    : 1;
  const currentOverEvents = events.filter((e: any) => e.overNo === maxOverNo);

  const recentBalls: BallIcon[] = currentOverEvents.map((e: any) => {
    if (e.isWicket)   return { type: 'wicket' };
    if (e.isSix)      return { type: 'six',    value: 6 };
    if (e.isBoundary) return { type: 'four',   value: 4 };
    if (e.isWide)     return { type: 'wide' };
    if (e.isNoBall)   return { type: 'noball' };
    if (e.runs === 0) return { type: 'dot' };
    return { type: 'runs', value: e.runs };
  });

  // ── Batsman stats from ball events ────────────────────────────────────────
  const batsmanMap: Record<string, any> = {};

  for (const e of events) {
    if (!e.batsmanId) continue;
    if (!batsmanMap[e.batsmanId]) {
      batsmanMap[e.batsmanId] = {
        playerId:     e.batsmanId,
        runs:         0,
        balls:        0,
        fours:        0,
        sixes:        0,
        isOnStrike:   false,
        isOut:        false,
        dismissalInfo: '',
      };
    }
    const b = batsmanMap[e.batsmanId];
    if (!e.isWide) {
      b.balls += 1;
      if (!e.isBye && !e.isLegBye) b.runs += e.runs;
      if (e.isBoundary) b.fours += 1;
      if (e.isSix)      b.sixes += 1;
    }
    if (e.isWicket) {
      b.isOut         = true;
      b.dismissalInfo = e.wicketType ?? 'out';
    }
  }

  // ── Seed from active partnership (handles new batsman with 0 balls) ────────
  if (activePartnership) {
    for (const pid of [activePartnership.batter1Id, activePartnership.batter2Id]) {
      if (pid && !batsmanMap[pid]) {
        batsmanMap[pid] = {
          playerId:      pid,
          runs:          0,
          balls:         0,
          fours:         0,
          sixes:         0,
          isOnStrike:    false,
          isOut:         false,
          dismissalInfo: '',
        };
      }
    }
  }

  // ── Striker calculation ───────────────────────────────────────────────────
  const strikerIdFinal = (() => {
    if (!activePartnership?.batter1Id) {
      // No partnership — fall back to last batsman who faced a ball and isn't out
      const lastBatsman = events
        .slice()
        .reverse()
        .find((e: any) => e.batsmanId && !batsmanMap[e.batsmanId]?.isOut);
      return lastBatsman?.batsmanId ?? '';
    }

    const b1 = activePartnership.batter1Id as string;
    const b2 = activePartnership.batter2Id as string;

    // Only count balls since this partnership started (after last wicket)
    let lastWicketIdx = -1;
    for (let i = 0; i < events.length; i++) {
      if (events[i].isWicket) lastWicketIdx = i;
    }
    const partnershipBalls = events.slice(lastWicketIdx + 1);

    let onStrike  = b1;
    let offStrike = b2;

    for (const e of partnershipBalls) {
      if (e.isWide || e.isNoBall) continue; // only legal balls affect strike
      if ((e.runs ?? 0) % 2 === 1) {
        [onStrike, offStrike] = [offStrike, onStrike]; // odd runs → swap
      }
      if (e.ballNo === 6) {
        [onStrike, offStrike] = [offStrike, onStrike]; // end of over → swap
      }
    }
    return onStrike;
  })();

  // Apply strike flag
  for (const b of Object.values(batsmanMap) as any[]) {
    b.isOnStrike = b.playerId === strikerIdFinal;
  }

  // ── Current batsmen from active partnership ────────────────────────────────
  const activePairIds: string[] = activePartnership
    ? [activePartnership.batter1Id, activePartnership.batter2Id].filter(Boolean) as string[]
    : Object.keys(batsmanMap).filter((id) => !batsmanMap[id].isOut).slice(0, 2);

  const currentBatsmen = activePairIds
    .map((pid: string) => {
      const b = batsmanMap[pid];
      if (!b) return null;
      const p = players.find((pl: any) => pl.id === pid);
      return {
        ...b,
        displayName: p?.displayName ?? pid,
        strikeRate:  b.balls
          ? parseFloat(((b.runs / b.balls) * 100).toFixed(1))
          : 0,
      };
    })
    .filter(Boolean);

  // ── Current bowler ────────────────────────────────────────────────────────
  const sortedOvers = (innings.overs ?? [])
    .slice()
    .sort((a: any, b: any) => b.overNo - a.overNo);
  const lastOver = sortedOvers[0];

  const currentBowler = lastOver
    ? (() => {
        const p = players.find((pl: any) => pl.id === lastOver.bowlerId);
        const bowlerOvers = (innings.overs ?? []).filter(
          (o: any) => o.bowlerId === lastOver.bowlerId
        );
        const totalRuns    = bowlerOvers.reduce((s: number, o: any) => s + o.runs,    0);
        const totalWickets = bowlerOvers.reduce((s: number, o: any) => s + o.wickets, 0);
        const totalBalls   = bowlerOvers.reduce((s: number, o: any) => s + o.balls,   0);
        return {
          playerId:    lastOver.bowlerId,
          displayName: p?.displayName ?? lastOver.bowlerId,
          overs:       `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`,
          maidens:     bowlerOvers.filter((o: any) => o.maidens > 0).length,
          runs:        totalRuns,
          wickets:     totalWickets,
          economy:     totalBalls
            ? parseFloat(((totalRuns / totalBalls) * 6).toFixed(2))
            : 0,
        };
      })()
    : undefined;

  // ── Fall of wickets ───────────────────────────────────────────────────────
  let currentScore = 0;
  const fallOfWickets: any[] = [];
  let wicketCount = 0;

  for (const e of events) {
    const extraBase = e.isWide || e.isNoBall ? 1 : 0;
    currentScore += (e.runs ?? 0) + extraBase + (e.extraRuns ?? 0);

    if (e.isWicket) {
      wicketCount++;
      const p = players.find((pl: any) => pl.id === e.batsmanId);
      fallOfWickets.push({
        wicketNo:   wicketCount,
        score:      currentScore,
        playerName: p?.displayName ?? 'Unknown',
        over:       `${e.overNo - 1}.${e.ballNo}`,
      });
    }
  }

  // ── Dismissed player IDs (batted + got out — hide from Next Batsman list) ──
  const dismissedPlayerIds: string[] = Object.values(batsmanMap)
    .filter((b: any) => b.isOut === true)
    .map((b: any) => b.playerId as string);

  // ── Run rate calculations ─────────────────────────────────────────────────
  const ballsRemaining = totalOvers * 6 - innings.balls;

  const currentRunRate: number = innings.balls
    ? parseFloat(((innings.totalRuns / innings.balls) * 6).toFixed(2))
    : 0;

  const requiredRunRate: number | undefined = innings.target
    ? ballsRemaining > 0
      ? parseFloat((((innings.target - innings.totalRuns) / ballsRemaining) * 6).toFixed(2))
      : 999
    : undefined;

  // ── Return ────────────────────────────────────────────────────────────────
  const result: InningsState = {
    id:                innings.id,
    inningsNo:         innings.inningsNo,
    battingTeamId:     innings.battingTeamId,
    totalRuns:         innings.totalRuns,
    wickets:           innings.wickets,
    balls:             innings.balls,
    overs:             `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`,
    currentRunRate,
    requiredRunRate,
    target:            innings.target   ?? undefined,
    extras: {
      wide:   innings.extrasWide,
      noBall: innings.extrasNoBall,
      bye:    innings.extrasBye,
      legBye: innings.extrasLegBye,
      total:  innings.extrasWide + innings.extrasNoBall + innings.extrasBye + innings.extrasLegBye,
    },
    currentBatsmen,
    currentBowler,
    recentBalls,
    fallOfWickets,
    dismissedPlayerIds,
    isComplete:        innings.isComplete,
  };

  return result;
}

// ─── GET /api/match ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const raw = await prisma.match.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        teams: { include: { players: true } },
        innings: {
          include: {
            ballEvents:   { orderBy: { createdAt: 'asc' } },
            overs:        { orderBy: { overNo:    'asc' } },
            partnerships: true,
          },
        },
      },
    });

    if (!raw) {
      return NextResponse.json({ error: 'No match found' }, { status: 404 });
    }

    const team1 = raw.teams.find((t) => t.id === raw.team1Id);
    const team2 = raw.teams.find((t) => t.id === raw.team2Id);

    if (!team1 || !team2) {
      return NextResponse.json({ error: 'Teams not found' }, { status: 404 });
    }

    const allPlayers = [...team1.players, ...team2.players];

    const innings1Raw = raw.innings.find((i) => i.inningsNo === 1);
    const innings2Raw = raw.innings.find((i) => i.inningsNo === 2);

    const matchState: MatchState = {
      id:             raw.id,
      title:          raw.title,
      status:         raw.status as any,
      totalOvers:     raw.totalOvers,
      currentInnings: raw.currentInnings,
      tossWonById:    raw.tossWonById    ?? undefined,
      battingFirstId: raw.battingFirstId ?? undefined,
      resultText:     raw.resultText     ?? undefined,
      team1: {
        id:        team1.id,
        name:      team1.name,
        shortName: team1.shortName,
        players:   team1.players.map((p) => ({
          id:          p.id,
          name:        p.name,
          displayName: p.displayName,
          isCaptain:   p.isCaptain,
          jerseyNo:    p.jerseyNo ?? undefined,
        })),
      },
      team2: {
        id:        team2.id,
        name:      team2.name,
        shortName: team2.shortName,
        players:   team2.players.map((p) => ({
          id:          p.id,
          name:        p.name,
          displayName: p.displayName,
          isCaptain:   p.isCaptain,
          jerseyNo:    p.jerseyNo ?? undefined,
        })),
      },
      innings1: innings1Raw
        ? buildInningsState(innings1Raw, allPlayers, raw.totalOvers)
        : undefined,
      innings2: innings2Raw
        ? buildInningsState(innings2Raw, allPlayers, raw.totalOvers)
        : undefined,
    };

    return NextResponse.json(matchState);
  } catch (err) {
    console.error('[GET /api/match]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}