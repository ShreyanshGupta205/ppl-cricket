"use client";

import { useEffect, useState, useCallback } from "react";
import LiveScoreHeader from "@/components/scorecard/LiveScoreHeader";
import BatsmenTable from "@/components/scorecard/BatsmenTable";
import BowlerTable from "@/components/scorecard/BowlerTable";
import CurrentOverBalls from "@/components/scorecard/CurrentOverBalls";
import FallOfWickets from "@/components/scorecard/FallOfWickets";
import MatchStatusBanner from "@/components/ui/MatchStatusBanner";
import type { MatchState } from "@/types/cricket";

export default function PublicScorePage() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connected, setConnected] = useState(true);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch("/api/match", { cache: "no-store" });
      if (!res.ok) {
        setConnected(false);
        return;
      }
      const data: MatchState = await res.json();
      setMatch(data);
      setLastUpdate(new Date());
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // Auto-poll: 3s when live, 15s otherwise
  useEffect(() => {
    const ms = match?.status === "LIVE" ? 3000 : 15000;
    const timer = setInterval(fetchMatch, ms);
    return () => clearInterval(timer);
  }, [fetchMatch, match?.status]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-6xl animate-bounce">🏏</div>
        <p className="text-[#E8510A] text-xl font-bold animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  // ── Waiting / Setup ───────────────────────────────────────────────────────
  if (!match || match.status === "SETUP" || match.status === "TOSS") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 gap-4">
        <div className="text-7xl">🏏</div>
        <h1 className="text-3xl font-black text-[#E8510A]">PPL Final 2026</h1>
        <p className="text-gray-400 text-lg">
          {match?.team1?.name ?? "GIR x Pichavaram"}
          <span className="text-gray-600 mx-3">vs</span>
          {match?.team2?.name ?? "Kanha x Nallamala"}
        </p>
        <div className="card-dark px-6 py-4 mt-2 space-y-1">
          <p className="text-gray-400 text-sm">📅 March 16, 2026</p>
          <p className="text-gray-500 text-xs">
            {match?.status === "TOSS"
              ? "🪙 Toss in progress..."
              : "Match hasn't started yet - check back soon!"}
          </p>
        </div>
        <p className="text-gray-700 text-xs mt-2">Auto-refreshing every 15s</p>
      </div>
    );
  }

  // ── Match complete ─────────────────────────────────────────────────────────
  if (match.status === "COMPLETE") {
    return (
      <div className="max-w-lg mx-auto px-3 py-6 space-y-4">
        <div className="card-dark p-6 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-black text-[#F5A623]">
            Match Complete!
          </h1>
          {match.resultText && (
            <p className="text-white font-semibold mt-2">{match.resultText}</p>
          )}
        </div>
        {[match.innings1, match.innings2].map(
          (inn, i) =>
            inn && (
              <div
                key={i}
                className="card-dark p-4 flex justify-between items-center"
              >
                <span className="text-gray-300 text-sm">
                  {inn.battingTeamId === match.team1.id
                    ? match.team1.name
                    : match.team2.name}
                </span>
                <span className="text-white font-black text-xl">
                  {inn.totalRuns}/{inn.wickets}
                  <span className="text-gray-500 text-xs font-normal ml-1">
                    ({inn.overs} Ov)
                  </span>
                </span>
              </div>
            )
        )}
      </div>
    );
  }

  // ── Live scorecard ─────────────────────────────────────────────────────────
  const currentInnings =
    match.currentInnings === 1 ? match.innings1 : match.innings2;

  return (
    <main className="max-w-lg mx-auto px-3 pb-10">
      {/* No auth required — this is public */}
      {!connected && (
        <div
          className="bg-red-900/40 border border-red-500/30 text-red-400
          text-xs text-center py-2 px-4 rounded-lg mt-3"
        >
          ⚠️ Connection lost — retrying...
        </div>
      )}

      <div className="sticky top-0 z-10 bg-[#0D0D0D] pt-3 pb-2 space-y-2">
        <LiveScoreHeader match={match} innings={currentInnings} />
        <MatchStatusBanner
          status={match.status}
          resultText={match.resultText ?? undefined}
        />
      </div>

      {currentInnings && (
        <div className="card-dark p-4 mt-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
            This Over
          </p>
          <CurrentOverBalls balls={currentInnings.recentBalls} />
        </div>
      )}

      {currentInnings && currentInnings.currentBatsmen.length > 0 && (
        <div className="card-dark mt-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest px-4 pt-3 pb-1">
            Batting
          </p>
          <BatsmenTable batsmen={currentInnings.currentBatsmen} />
        </div>
      )}

      {currentInnings?.currentBowler && (
        <div className="card-dark mt-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest px-4 pt-3 pb-1">
            Bowling
          </p>
          <BowlerTable bowler={currentInnings.currentBowler} />
        </div>
      )}

      {currentInnings && currentInnings.fallOfWickets.length > 0 && (
        <div className="card-dark p-4 mt-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
            Fall of Wickets
          </p>
          <FallOfWickets wickets={currentInnings.fallOfWickets} />
        </div>
      )}

      {/* Innings 1 summary bar during innings 2 */}
      {match.currentInnings === 2 && match.innings1 && (
        <div className="card-dark p-4 mt-3 flex justify-between items-center text-sm">
          <span className="text-gray-400">
            {match.innings1.battingTeamId === match.team1.id
              ? match.team1.name
              : match.team2.name}
          </span>
          <span className="text-[#F5A623] font-black">
            {match.innings1.totalRuns}/{match.innings1.wickets}
            <span className="text-gray-500 font-normal ml-1 text-xs">
              ({match.innings1.overs} Ov)
            </span>
          </span>
        </div>
      )}

      {lastUpdate && (
        <p className="text-center text-gray-700 text-xs mt-4">
          Updated {lastUpdate.toLocaleTimeString()} · refreshes every{" "}
          {match.status === "LIVE" ? "3" : "15"}s
          <a
            href="/scorecard"
            className="block text-center py-3 rounded-xl bg-white/5 border border-white/10
    text-gray-300 font-semibold text-sm hover:bg-white/10 transition-colors mt-2"
          >
            📋 Full Scorecard
          </a>
        </p>
      )}
    </main>
  );
}
