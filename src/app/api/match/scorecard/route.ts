import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────
interface PlayerRow {
  id:          string;
  name:        string;
  displayName: string;
  isCaptain:   boolean;
}

// ── Dismissal string helper ───────────────────────────────────────────────────
function dismissalString(
  wicketType:  string,
  fielderName: string | null,
  bowlerName:  string | null,
): string {
  switch (wicketType) {
    case 'BOWLED':            return `b ${bowlerName ?? ''}`;
    case 'CAUGHT':            return `c ${fielderName ?? ''} b ${bowlerName ?? ''}`;
    case 'CAUGHT_AND_BOWLED': return `c & b ${bowlerName ?? ''}`;
    case 'LBW':               return `lbw b ${bowlerName ?? ''}`;
    case 'RUN_OUT':           return `run out (${fielderName ?? ''})`;
    case 'STUMPED':           return `st ${fielderName ?? ''} b ${bowlerName ?? ''}`;
    case 'HIT_WICKET':        return `hit wkt b ${bowlerName ?? ''}`;
    default:                  return wicketType?.toLowerCase().replace(/_/g, ' ') ?? 'out';
  }
}

// ── Innings scorecard builder ─────────────────────────────────────────────────
// Accepts allPlayers and team info as explicit params — avoids all closure issues
function buildInningsScorecard(
  innings:    any,
  allPlayers: PlayerRow[],
  team1Id:    string,
  team1Name:  string,
  team2Name:  string,
) {
  if (!innings) return null;

  const events: any[] = innings.ballEvents ?? [];

  // ── Batting card ────────────────────────────────────────────────────────────
  const batsmanMap: Record<string, {
    playerId:      string;
    runs:          number;
    balls:         number;
    fours:         number;
    sixes:         number;
    isOut:         boolean;
    dismissalInfo: string;
  }> = {};

  for (const e of events) {
    if (!e.batsmanId) continue;
    if (!batsmanMap[e.batsmanId]) {
      batsmanMap[e.batsmanId] = {
        playerId:      e.batsmanId,
        runs:          0,
        balls:         0,
        fours:         0,
        sixes:         0,
        isOut:         false,
        dismissalInfo: 'not out',
      };
    }
    const b = batsmanMap[e.batsmanId];
    if (!e.isWide) {
      b.balls += 1;
      if (!e.isBye && !e.isLegBye) b.runs += e.runs;
      if (e.isBoundary) b.fours += 1;
      if (e.isSix)      b.sixes += 1;
    }
    if (e.isWicket && e.wicketType) {
      b.isOut = true;
      const fielder = allPlayers.find((p) => p.id === e.fielderId);
      const bowler  = allPlayers.find((p) => p.id === e.bowlerId);
      b.dismissalInfo = dismissalString(
        e.wicketType,
        fielder?.displayName ?? null,
        bowler?.displayName  ?? null,
      );
    }
  }

  const battingCard = Object.values(batsmanMap).map((b) => {
    const p = allPlayers.find((pl) => pl.id === b.playerId);
    return {
      playerId:      b.playerId,
      displayName:   p?.displayName ?? b.playerId,
      isCaptain:     p?.isCaptain   ?? false,
      runs:          b.runs,
      balls:         b.balls,
      fours:         b.fours,
      sixes:         b.sixes,
      strikeRate:    b.balls
        ? parseFloat(((b.runs / b.balls) * 100).toFixed(1))
        : 0,
      isOut:         b.isOut,
      dismissalInfo: b.dismissalInfo,
    };
  });

  // ── Bowling card ────────────────────────────────────────────────────────────
  const bowlerMap: Record<string, {
    playerId: string;
    balls:    number;
    runs:     number;
    wickets:  number;
    maidens:  number;
  }> = {};

  for (const over of innings.overs ?? []) {
    if (!bowlerMap[over.bowlerId]) {
      bowlerMap[over.bowlerId] = {
        playerId: over.bowlerId,
        balls:    0,
        runs:     0,
        wickets:  0,
        maidens:  0,
      };
    }
    const bw = bowlerMap[over.bowlerId];
    bw.balls   += over.balls;
    bw.runs    += over.runs;
    bw.wickets += over.wickets;
    if (over.maidens > 0) bw.maidens += 1;
  }

  const bowlingCard = Object.values(bowlerMap).map((bw) => {
    const p = allPlayers.find((pl) => pl.id === bw.playerId);
    return {
      playerId:    bw.playerId,
      displayName: p?.displayName ?? bw.playerId,
      overs:       `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`,
      balls:       bw.balls,
      maidens:     bw.maidens,
      runs:        bw.runs,
      wickets:     bw.wickets,
      economy:     bw.balls
        ? parseFloat(((bw.runs / bw.balls) * 6).toFixed(2))
        : 0,
    };
  });

  // ── Fall of wickets ─────────────────────────────────────────────────────────
  const fallOfWickets = events
    .filter((e) => e.isWicket)
    .map((e, i) => {
      const player = allPlayers.find((pl) => pl.id === e.batsmanId);
      const bowler = allPlayers.find((pl) => pl.id === e.bowlerId);
      return {
        wicketNo:   i + 1,
        playerName: player?.displayName ?? 'Unknown',
        bowlerName: bowler?.displayName ?? 'Unknown',
        over:       `${e.overNo}.${e.ballNo}`,
      };
    });

  // ── Over summary ────────────────────────────────────────────────────────────
  const overSummary = (innings.overs ?? []).map((o: any) => ({
    overNo:  o.overNo,
    runs:    o.runs,
    wickets: o.wickets,
    maiden:  o.maidens > 0,
  }));

  // ── Extras ──────────────────────────────────────────────────────────────────
  const extras = {
    wide:   innings.extrasWide,
    noBall: innings.extrasNoBall,
    bye:    innings.extrasBye,
    legBye: innings.extrasLegBye,
    total:
      innings.extrasWide +
      innings.extrasNoBall +
      innings.extrasBye +
      innings.extrasLegBye,
  };

  return {
    inningsNo:       innings.inningsNo,
    battingTeamId:   innings.battingTeamId,
    battingTeamName: innings.battingTeamId === team1Id ? team1Name : team2Name,
    totalRuns:       innings.totalRuns,
    wickets:         innings.wickets,
    overs:           `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`,
    balls:           innings.balls,
    target:          innings.target  ?? null,
    isComplete:      innings.isComplete,
    extras,
    battingCard,
    bowlingCard,
    fallOfWickets,
    overSummary,
  };
}

// ── GET /api/match/scorecard ──────────────────────────────────────────────────
export async function GET() {
  try {
    const match = await prisma.match.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        teams: { include: { players: true } },
        innings: {
          include: {
            ballEvents:   { orderBy: { createdAt: 'asc' } },
            overs:        { orderBy: { overNo: 'asc'   } },
            partnerships: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'No match found' }, { status: 404 });
    }

    const team1 = match.teams.find((t) => t.id === match.team1Id);
    const team2 = match.teams.find((t) => t.id === match.team2Id);

    if (!team1 || !team2) {
      return NextResponse.json({ error: 'Teams not found' }, { status: 404 });
    }

    // Pass everything as explicit args — no closures, no scope bugs
    const allPlayers: PlayerRow[] = [
      ...team1.players.map((p) => ({
        id:          p.id,
        name:        p.name,
        displayName: p.displayName,
        isCaptain:   p.isCaptain,
      })),
      ...team2.players.map((p) => ({
        id:          p.id,
        name:        p.name,
        displayName: p.displayName,
        isCaptain:   p.isCaptain,
      })),
    ];

    const innings1 = match.innings.find((i) => i.inningsNo === 1);
    const innings2 = match.innings.find((i) => i.inningsNo === 2);

    return NextResponse.json({
      matchId:    match.id,
      title:      match.title,
      status:     match.status,
      resultText: match.resultText ?? null,
      totalOvers: match.totalOvers,
      team1: {
        id:        team1.id,
        name:      team1.name,
        shortName: team1.shortName,
      },
      team2: {
        id:        team2.id,
        name:      team2.name,
        shortName: team2.shortName,
      },
      innings1: buildInningsScorecard(
        innings1, allPlayers, team1.id, team1.name, team2.name,
      ),
      innings2: buildInningsScorecard(
        innings2, allPlayers, team1.id, team1.name, team2.name,
      ),
    });

  } catch (err) {
    console.error('[GET /api/match/scorecard]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}