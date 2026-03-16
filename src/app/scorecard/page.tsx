'use client';

import { useEffect, useState } from 'react';

interface BattingRow {
  playerId:      string;
  displayName:   string;
  isCaptain:     boolean;
  runs:          number;
  balls:         number;
  fours:         number;
  sixes:         number;
  strikeRate:    number;
  isOut:         boolean;
  dismissalInfo: string;
}

interface BowlingRow {
  playerId:    string;
  displayName: string;
  overs:       string;
  maidens:     number;
  runs:        number;
  wickets:     number;
  economy:     number;
}

interface FowEntry {
  wicketNo:   number;
  playerName: string;
  over:       string;
}

interface InningsCard {
  inningsNo:       number;
  battingTeamName: string;
  totalRuns:       number;
  wickets:         number;
  overs:           string;
  target:          number | null;
  isComplete:      boolean;
  extras: {
    wide:   number;
    noBall: number;
    bye:    number;
    legBye: number;
    total:  number;
  };
  battingCard:   BattingRow[];
  bowlingCard:   BowlingRow[];
  fallOfWickets: FowEntry[];
}

interface ScorecardData {
  title:      string;
  status:     string;
  resultText: string | null;
  team1:      { name: string; shortName: string };
  team2:      { name: string; shortName: string };
  innings1:   InningsCard | null;
  innings2:   InningsCard | null;
}

export default function ScorecardPage() {
  const [data,    setData]    = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch('/api/match/scorecard')
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setError(d.error); }
        else          { setData(d); }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load scorecard');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D]">
        <p className="text-[#E8510A] animate-pulse text-xl font-bold">
          Loading scorecard...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D] gap-4">
        <p className="text-gray-400 text-lg">{error || 'No scorecard available yet.'}</p>
        <a href="/" className="text-[#E8510A] font-bold underline text-sm">
          ← Back to Live Score
        </a>
      </div>
    );
  }

  const innings = [data.innings1, data.innings2].filter(
    (i): i is InningsCard => i !== null
  );

  return (
    <main className="max-w-lg mx-auto px-3 py-6 space-y-6 bg-[#0D0D0D] min-h-screen">

      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-[#E8510A]">🏏 {data.title}</h1>
        <p className="text-gray-400 text-sm mt-1">
          {data.team1.name} vs {data.team2.name}
        </p>
        {data.resultText && (
          <div className="mt-3 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-xl px-4 py-3">
            <p className="text-[#F5A623] font-black text-base">🏆 {data.resultText}</p>
          </div>
        )}
      </div>

      {/* Innings */}
      {innings.map((inn) => (
        <div key={inn.inningsNo} className="space-y-3">

          {/* Innings header */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4
            flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Innings {inn.inningsNo}
              </p>
              <p className="text-white font-bold text-base mt-0.5">
                {inn.battingTeamName}
              </p>
              {inn.target && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Target: {inn.target}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[#E8510A] font-black text-3xl tabular-nums">
                {inn.totalRuns}/{inn.wickets}
              </p>
              <p className="text-gray-400 text-xs">({inn.overs} Ov)</p>
            </div>
          </div>

          {/* Batting */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest px-4 pt-3 pb-2">
              Batting
            </p>
            {/* Header */}
            <div className="grid grid-cols-12 px-4 pb-2 text-[10px] text-gray-600 uppercase">
              <span className="col-span-5">Batter</span>
              <span className="col-span-1 text-right">R</span>
              <span className="col-span-1 text-right">B</span>
              <span className="col-span-1 text-right">4s</span>
              <span className="col-span-1 text-right">6s</span>
              <span className="col-span-3 text-right">SR</span>
            </div>
            {/* Rows */}
            {inn.battingCard.map((b) => (
              <div
                key={b.playerId}
                className="grid grid-cols-12 px-4 py-2 border-t border-white/5 items-start"
              >
                <div className="col-span-5">
                  <p className="text-white text-sm font-semibold leading-tight">
                    {b.displayName}{b.isCaptain ? ' ©' : ''}
                  </p>
                  <p className="text-gray-500 text-[10px] mt-0.5 leading-tight">
                    {b.dismissalInfo}
                  </p>
                </div>
                <span className="col-span-1 text-right text-[#F5A623] font-black text-sm">
                  {b.runs}
                </span>
                <span className="col-span-1 text-right text-gray-400 text-sm">
                  {b.balls}
                </span>
                <span className="col-span-1 text-right text-gray-400 text-sm">
                  {b.fours}
                </span>
                <span className="col-span-1 text-right text-gray-400 text-sm">
                  {b.sixes}
                </span>
                <span className="col-span-3 text-right text-gray-400 text-sm">
                  {b.strikeRate.toFixed(0)}
                </span>
              </div>
            ))}
            {/* Extras */}
            <div className="px-4 py-2 border-t border-white/5">
              <p className="text-gray-500 text-xs">
                Extras:{' '}
                <span className="text-gray-400">{inn.extras.total}</span>
                <span className="text-gray-600 ml-2">
                  (w {inn.extras.wide}, nb {inn.extras.noBall},
                  b {inn.extras.bye}, lb {inn.extras.legBye})
                </span>
              </p>
            </div>
            {/* Total */}
            <div className="px-4 py-2 border-t border-white/10 flex justify-between">
              <span className="text-gray-400 text-sm font-semibold">Total</span>
              <span className="text-white font-black text-sm">
                {inn.totalRuns}/{inn.wickets} ({inn.overs} Ov)
              </span>
            </div>
          </div>

          {/* Bowling */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest px-4 pt-3 pb-2">
              Bowling
            </p>
            <div className="grid grid-cols-12 px-4 pb-2 text-[10px] text-gray-600 uppercase">
              <span className="col-span-5">Bowler</span>
              <span className="col-span-1 text-right">O</span>
              <span className="col-span-1 text-right">M</span>
              <span className="col-span-2 text-right">R</span>
              <span className="col-span-1 text-right">W</span>
              <span className="col-span-2 text-right">ECO</span>
            </div>
            {inn.bowlingCard.map((bw) => (
              <div
                key={bw.playerId}
                className="grid grid-cols-12 px-4 py-2 border-t border-white/5 items-center"
              >
                <span className="col-span-5 text-white text-sm font-semibold truncate">
                  {bw.displayName}
                </span>
                <span className="col-span-1 text-right text-gray-400 text-sm">
                  {bw.overs}
                </span>
                <span className="col-span-1 text-right text-gray-400 text-sm">
                  {bw.maidens}
                </span>
                <span className="col-span-2 text-right text-gray-400 text-sm">
                  {bw.runs}
                </span>
                <span className="col-span-1 text-right text-[#F5A623] font-black text-sm">
                  {bw.wickets}
                </span>
                <span className="col-span-2 text-right text-gray-400 text-sm">
                  {bw.economy.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Fall of wickets */}
          {inn.fallOfWickets.length > 0 && (
            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                Fall of Wickets
              </p>
              <div className="flex flex-wrap gap-2">
                {inn.fallOfWickets.map((w) => (
                  <span
                    key={w.wicketNo}
                    className="text-xs text-gray-300 bg-white/5 px-2 py-1 rounded-md"
                  >
                    {w.wicketNo}-{w.playerName} ({w.over})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Back */}
      <a
        href="/"
        className="block text-center py-3 rounded-xl bg-[#E8510A]
          text-white font-black hover:bg-[#d44a09] transition-colors"
      >
        ← Back to Live Score
      </a>

    </main>
  );
}