'use client';
import type { MatchState, InningsState } from '@/types/cricket';

interface Props {
  match: MatchState;
  innings?: InningsState;
}

export default function LiveScoreHeader({ match, innings }: Props) {
  // Guard: if teams aren't loaded yet, show minimal header
  if (!match.team1?.id || !match.team2?.id) {
    return (
      <div className="card-dark p-4 text-center">
        <p className="text-[#E8510A] font-bold">🏏 {match.title}</p>
        <p className="text-gray-400 text-sm mt-1">Loading teams...</p>
      </div>
    );
  }

  const battingTeam = innings?.battingTeamId === match.team1.id
    ? match.team1
    : match.team2;

  const ballsRemaining = innings
    ? match.totalOvers * 6 - innings.balls
    : 0;

  return (
    <div className="card-dark p-4">
      {/* Match title */}
      <p className="text-xs text-[#F5A623] uppercase tracking-widest text-center mb-2">
        🏏 {match.title}
      </p>

      {/* Teams row */}
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-bold truncate max-w-[42%] ${
          innings?.battingTeamId === match.team1.id ? 'text-white' : 'text-gray-500'
        }`}>
          {match.team1.shortName}
        </span>
        <span className="text-gray-600 text-xs px-2">vs</span>
        <span className={`text-sm font-bold truncate max-w-[42%] text-right ${
          innings?.battingTeamId === match.team2.id ? 'text-white' : 'text-gray-500'
        }`}>
          {match.team2.shortName}
        </span>
      </div>

      {/* Score */}
      {innings ? (
        <>
          <div className="text-center my-1">
            <span className="text-5xl font-black tabular-nums text-[#E8510A]"
              style={{ textShadow: '0 0 20px #FF6B2B' }}>
              {innings.totalRuns}/{innings.wickets}
            </span>
            <span className="text-gray-400 text-lg ml-2">
              ({innings.overs} Ov)
            </span>
          </div>

          {/* Stats row */}
          <div className="flex justify-around mt-3 text-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">CRR</p>
              <p className="text-sm font-bold text-[#F5A623]">
                {innings.currentRunRate.toFixed(2)}
              </p>
            </div>

            {innings.target ? (
              <>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Target</p>
                  <p className="text-sm font-bold text-white">{innings.target}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">RRR</p>
                  <p className="text-sm font-bold text-[#F44336]">
                    {innings.requiredRunRate?.toFixed(2)}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Overs Left</p>
                <p className="text-sm font-bold text-white">
                  {match.totalOvers - Math.floor(innings.balls / 6)}
                </p>
              </div>
            )}
          </div>

          {/* Need X off Y balls (innings 2 only) */}
          {innings.target && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Need{' '}
              <span className="text-white font-bold">
                {Math.max(0, innings.target - innings.totalRuns)}
              </span>
              {' '}runs off{' '}
              <span className="text-white font-bold">{ballsRemaining}</span>
              {' '}balls
            </p>
          )}
        </>
      ) : (
        <p className="text-center text-gray-500 text-sm mt-2">
          {match.status === 'SETUP' ? 'Match not started yet' : 'Waiting for innings...'}
        </p>
      )}
    </div>
  );
}