'use client';

import { useState, useEffect } from 'react';
import ScorePad       from '@/components/admin/ScorePad';
import WicketModal    from '@/components/admin/WicketModal';
import UndoButton     from '@/components/admin/UndoButton';
import BowlerSelector from '@/components/admin/BowlerSelector';
import type { MatchState, InningsState } from '@/types/cricket';

export default function AdminPanel() {
  const [match,           setMatch]           = useState<MatchState | null>(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [lastAction,      setLastAction]      = useState(0);

  // Innings 2 setup state
  const [inn2Opener1, setInn2Opener1] = useState('');
  const [inn2Opener2, setInn2Opener2] = useState('');
  const [inn2Bowler,  setInn2Bowler]  = useState('');
  const [inn2Loading, setInn2Loading] = useState(false);

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentInnings: InningsState | undefined =
    match == null             ? undefined
    : match.currentInnings === 1 ? match.innings1
    : match.innings2;

  // Fallback: if no one is marked on-strike, use first batsman
  const striker =
    currentInnings?.currentBatsmen.find((b) => b.isOnStrike)
    ?? currentInnings?.currentBatsmen[0];

  const nonStriker = currentInnings?.currentBatsmen.find(
    (b) => !b.isOnStrike && b.playerId !== striker?.playerId
  );

  const fieldingTeam =
    match && currentInnings
      ? match.team1.id === currentInnings.battingTeamId
        ? match.team2
        : match.team1
      : null;

  // Innings 2 teams (derived from innings 1 batting team)
  const inn2BattingTeam = match?.innings1
    ? match.innings1.battingTeamId === match.team1.id
      ? match.team2
      : match.team1
    : null;

  const inn2BowlingTeam = match?.innings1
    ? match.innings1.battingTeamId === match.team1.id
      ? match.team1
      : match.team2
    : null;

  // ── Fetch match state ──────────────────────────────────────────────────────
  async function fetchMatch() {
    try {
      const res = await fetch('/api/match');
      if (!res.ok) { setMatch(null); return; }
      const data = await res.json();
      if (data?.team1 && data?.team2) setMatch(data);
      else setMatch(null);
    } catch {
      setMatch(null);
    }
  }

  useEffect(() => { fetchMatch(); }, []);

  // ── Submit a regular ball ──────────────────────────────────────────────────
  async function submitBall(payload: Record<string, unknown>) {
    if (loading) return;

    if (!striker?.playerId) {
      alert('No striker found. Please refresh or re-run setup.');
      return;
    }
    if (!currentInnings?.currentBowler?.playerId) {
      alert('No bowler found. Please refresh or re-run setup.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/ball', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          inningsId:      currentInnings.id,
          batsmanId:      striker.playerId,
          bowlerId:       currentInnings.currentBowler.playerId,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty body */ }

      if (!res.ok) {
        alert(`Error: ${String(data?.error ?? 'Something went wrong')}`);
      } else {
        setLastAction(Date.now());
        if (data?.overJustCompleted) setShowBowlerModal(true);
        await fetchMatch();
      }
    } catch {
      alert('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  }

  // ── Submit a wicket ────────────────────────────────────────────────────────
  async function submitWicket(payload: {
    runs:          number;
    isWicket:      boolean;
    wicketType:    string;
    fielderId?:    string;
    nextBatsmanId: string;
  }) {
    if (loading) return;

    if (!striker?.playerId) {
      alert('No striker found. Please refresh or re-run setup.');
      return;
    }
    if (!currentInnings?.currentBowler?.playerId) {
      alert('No bowler found. Please refresh or re-run setup.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/wicket', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inningsId:     currentInnings.id,
          batsmanId:     striker.playerId,
          bowlerId:      currentInnings.currentBowler.playerId,
          wicketType:    payload.wicketType,
          fielderId:     payload.fielderId ?? null,
          nextBatsmanId: payload.nextBatsmanId,
          runs:          payload.runs,
        }),
      });

      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty body */ }

      if (!res.ok) {
        alert(`Wicket error: ${String(data?.error ?? 'Something went wrong')}`);
      } else {
        setLastAction(Date.now());
        await fetchMatch();
      }
    } catch {
      alert('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  }

  // ── Start Innings 2 ────────────────────────────────────────────────────────
  async function startInnings2() {
    if (!inn2Opener1 || !inn2Opener2 || !inn2Bowler) return;
    if (!inn2BattingTeam || !inn2BowlingTeam) return;
    if (inn2Opener1 === inn2Opener2) {
      alert('Both openers cannot be the same player');
      return;
    }

    setInn2Loading(true);
    try {
      const res = await fetch('/api/admin/innings/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inningsNo:     2,
          battingTeamId: inn2BattingTeam.id,
          bowlingTeamId: inn2BowlingTeam.id,
          opener1Id:     inn2Opener1,
          opener2Id:     inn2Opener2,
          bowlerId:      inn2Bowler,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Error: ${data?.error ?? 'Failed to start innings 2'}`);
      } else {
        // Reset innings 2 state
        setInn2Opener1('');
        setInn2Opener2('');
        setInn2Bowler('');
        await fetchMatch();
      }
    } catch {
      alert('Network error');
    } finally {
      setInn2Loading(false);
    }
  }

  // ── Undo ───────────────────────────────────────────────────────────────────
  async function handleUndo() {
    await fetch('/api/admin/ball/undo', { method: 'POST' });
    await fetchMatch();
  }

  // ── Reset Match ─────────────────────────────────────────────────────────────
  async function handleReset() {
    // if (!confirm('Start a new match? This will PERMANENTLY delete all current match data.')) return;
    if (loading) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/match/reset', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/admin/setup';
      } else {
        alert('Failed to reset match');
      }
    } catch {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  }

  // ── No match found ─────────────────────────────────────────────────────────
  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="text-5xl animate-bounce">🏏</div>
        <p className="text-gray-400 animate-pulse">Loading match...</p>
        <a
          href="/admin/setup"
          className="mt-4 px-6 py-2 bg-[#E8510A] text-white rounded-lg font-bold text-sm"
        >
          ⚙️ Go to Setup
        </a>
      </div>
    );
  }

  const isLive = match.status === 'LIVE';

  return (
    <div className="max-w-lg mx-auto px-3 pb-8 pt-4 space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="card-dark p-4 text-center">
        <p className="text-xs text-[#F5A623] uppercase tracking-widest mb-1">
          🏏 Admin Panel — {match.title}
        </p>
        <p className="text-sm text-gray-500">
          {match.team1?.shortName ?? '—'} vs {match.team2?.shortName ?? '—'}
        </p>

        {currentInnings ? (
          <>
            <p
              className="text-5xl font-black text-[#E8510A] mt-2 tabular-nums"
              style={{ textShadow: '0 0 20px #FF6B2B' }}
            >
              {currentInnings.totalRuns}/{currentInnings.wickets}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              ({currentInnings.overs} Ov)&nbsp;·&nbsp;CRR{' '}
              {currentInnings.currentRunRate.toFixed(2)}
            </p>
            {currentInnings.target && (
              <p className="text-xs text-gray-400 mt-1">
                Target {currentInnings.target}&nbsp;·&nbsp;Need{' '}
                <span className="text-white font-bold">
                  {Math.max(0, currentInnings.target - currentInnings.totalRuns)}
                </span>
                {' '}off{' '}
                <span className="text-white font-bold">
                  {match.totalOvers * 6 - currentInnings.balls}
                </span>
                {' '}balls
              </p>
            )}
          </>
        ) : (
          match.status !== 'INNINGS_BREAK' && (
            <div className="mt-3">
              <p className="text-gray-400 mb-2">Match not started</p>
              <a
                href="/admin/setup"
                className="inline-block bg-[#E8510A] text-white px-6 py-2 rounded-lg font-bold text-sm"
              >
                ⚙️ Go to Setup
              </a>
            </div>
          )
        )}
      </div>
 
      {/* ── New Match Button (when complete) ────────────────────────────────── */}
      {(match.status === 'COMPLETE' || match.status === 'ABANDONED' || match.status === 'TIED') && (
        <div className="card-dark p-6 text-center space-y-3 border border-[#E8510A]/30">
          <p className="text-gray-400 text-sm">This match has ended.</p>
          {match.resultText && (
            <p className="text-[#F5A623] font-black text-lg">{match.resultText}</p>
          )}
          <button
            onClick={handleReset}
            disabled={loading}
            className="inline-block bg-[#E8510A] text-white px-8 py-3 rounded-xl font-black text-base shadow-lg shadow-[#E8510A]/20 disabled:opacity-50"
          >
            {loading ? '⏳ Reseting...' : '🔄 Start New Match'}
          </button>
        </div>
      )}

      {/* ── INNINGS BREAK PANEL ────────────────────────────────────────────── */}
      {match.status === 'INNINGS_BREAK' && match.innings1 && inn2BattingTeam && inn2BowlingTeam && (
        <div className="card-dark p-5 space-y-4 border border-[#F5A623]/30">

          {/* Innings 1 summary */}
          <div className="text-center">
            <p className="text-[#F5A623] font-black text-lg">🏏 Innings Break</p>
            <p className="text-gray-400 text-sm mt-1">
              {match.innings1.battingTeamId === match.team1.id
                ? match.team1.name
                : match.team2.name}
              {' '}scored{' '}
              <span className="text-white font-black text-xl">
                {match.innings1.totalRuns}/{match.innings1.wickets}
              </span>
              <span className="text-gray-500 text-sm ml-1">
                ({match.innings1.overs} Ov)
              </span>
            </p>
            <p className="text-[#E8510A] font-bold mt-2 text-base">
              Target for {inn2BattingTeam.name}:{' '}
              <span className="text-white text-2xl font-black">
                {match.innings1.totalRuns + 1}
              </span>
            </p>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest text-center">
              Select Innings 2 Opening Players
            </p>

            {/* Opener 1 */}
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Opener 1 — {inn2BattingTeam.name}
              </p>
              <select
                value={inn2Opener1}
                onChange={(e) => setInn2Opener1(e.target.value)}
                style={{ backgroundColor: '#1A1A1A', color: 'white' }}
                className="w-full border border-white/20 rounded-lg px-3 py-2
                  text-sm focus:outline-none focus:border-[#E8510A] cursor-pointer"
              >
                <option value="" style={{ backgroundColor: '#1A1A1A', color: '#9E9E9E' }}>
                  -- Select opener 1 --
                </option>
                {inn2BattingTeam.players
                  .filter((p) => p.id !== inn2Opener2)
                  .map((p) => (
                    <option key={p.id} value={p.id}
                      style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
                      #{p.jerseyNo} {p.displayName}{p.isCaptain ? ' ©' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Opener 2 */}
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Opener 2 — {inn2BattingTeam.name}
              </p>
              <select
                value={inn2Opener2}
                onChange={(e) => setInn2Opener2(e.target.value)}
                style={{ backgroundColor: '#1A1A1A', color: 'white' }}
                className="w-full border border-white/20 rounded-lg px-3 py-2
                  text-sm focus:outline-none focus:border-[#E8510A] cursor-pointer"
              >
                <option value="" style={{ backgroundColor: '#1A1A1A', color: '#9E9E9E' }}>
                  -- Select opener 2 --
                </option>
                {inn2BattingTeam.players
                  .filter((p) => p.id !== inn2Opener1)
                  .map((p) => (
                    <option key={p.id} value={p.id}
                      style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
                      #{p.jerseyNo} {p.displayName}{p.isCaptain ? ' ©' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Opening bowler */}
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Opening Bowler — {inn2BowlingTeam.name}
              </p>
              <select
                value={inn2Bowler}
                onChange={(e) => setInn2Bowler(e.target.value)}
                style={{ backgroundColor: '#1A1A1A', color: 'white' }}
                className="w-full border border-white/20 rounded-lg px-3 py-2
                  text-sm focus:outline-none focus:border-[#E8510A] cursor-pointer"
              >
                <option value="" style={{ backgroundColor: '#1A1A1A', color: '#9E9E9E' }}>
                  -- Select opening bowler --
                </option>
                {inn2BowlingTeam.players.map((p) => (
                  <option key={p.id} value={p.id}
                    style={{ backgroundColor: '#1A1A1A', color: 'white' }}>
                    #{p.jerseyNo} {p.displayName}{p.isCaptain ? ' ©' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Innings 2 button */}
            <button
              onClick={startInnings2}
              disabled={!inn2Opener1 || !inn2Opener2 || !inn2Bowler || inn2Loading}
              className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700
                text-white font-black text-base disabled:opacity-40
                transition-colors active:scale-95"
            >
              {inn2Loading ? '⏳ Starting...' : '🏏 Start Innings 2'}
            </button>
          </div>
        </div>
      )}

      {/* ── Batsmen panel ──────────────────────────────────────────────────── */}
      {(striker || nonStriker) ? (
        <div className="card-dark p-3 grid grid-cols-2 gap-3 text-sm">
          {striker && (
            <div className="bg-[#E8510A]/10 border border-[#E8510A]/30 rounded-lg p-3">
              <p className="text-[#F5A623] font-bold text-xs mb-1">★ ON STRIKE</p>
              <p className="text-white font-bold truncate text-base">
                {striker.displayName}
              </p>
              <p className="text-gray-300 text-xl font-black mt-1">
                {striker.runs}
                <span className="text-gray-500 text-xs font-normal ml-1">
                  ({striker.balls}b)
                </span>
              </p>
              <p className="text-gray-500 text-xs">
                {striker.fours}×4 · {striker.sixes}×6 · SR {striker.strikeRate.toFixed(0)}
              </p>
            </div>
          )}
          {nonStriker && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-gray-500 font-bold text-xs mb-1">NON-STRIKE</p>
              <p className="text-white font-bold truncate text-base">
                {nonStriker.displayName}
              </p>
              <p className="text-gray-300 text-xl font-black mt-1">
                {nonStriker.runs}
                <span className="text-gray-500 text-xs font-normal ml-1">
                  ({nonStriker.balls}b)
                </span>
              </p>
              <p className="text-gray-500 text-xs">
                {nonStriker.fours}×4 · {nonStriker.sixes}×6 · SR{' '}
                {nonStriker.strikeRate.toFixed(0)}
              </p>
            </div>
          )}
        </div>
      ) : (
        isLive && (
          <div className="card-dark p-3 text-center text-yellow-500 text-sm">
            ⚠️ No batsmen loaded — try refreshing or re-run setup
          </div>
        )
      )}

      {/* ── Current bowler ─────────────────────────────────────────────────── */}
      {currentInnings?.currentBowler && (
        <div className="card-dark p-3 flex justify-between items-center text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Bowling</p>
            <p className="text-[#F5A623] font-bold">
              ⚡ {currentInnings.currentBowler.displayName}
            </p>
          </div>
          <p className="text-gray-300 font-mono text-sm">
            {currentInnings.currentBowler.overs}-
            {currentInnings.currentBowler.maidens}-
            {currentInnings.currentBowler.runs}-
            {currentInnings.currentBowler.wickets}
          </p>
        </div>
      )}

      {/* ── Score pad ──────────────────────────────────────────────────────── */}
      <ScorePad
        onScore={(runs) => submitBall({ runs, isBoundary: runs === 4, isSix: runs === 6 })}
        onWide={() => submitBall({ runs: 0, isWide: true })}
        onNoBall={() => submitBall({ runs: 0, isNoBall: true })}
        onWicket={() => setShowWicketModal(true)}
        disabled={loading || !isLive}
      />

      {!isLive && (
        <p className="text-center text-xs text-gray-500">
          Scoring disabled — match status:{' '}
          <span className="text-[#F5A623]">{match.status}</span>
        </p>
      )}

      {/* ── Undo ───────────────────────────────────────────────────────────── */}
      <UndoButton onUndo={handleUndo} lastActionTime={lastAction} />

      {/* ── Change bowler manually ─────────────────────────────────────────── */}
      {isLive && fieldingTeam && (
        <button
          onClick={() => setShowBowlerModal(true)}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10
            text-gray-300 font-semibold text-sm hover:bg-white/10 transition-colors"
        >
          ⚡ Change Bowler
        </button>
      )}

      {/* ── Wicket modal ───────────────────────────────────────────────────── */}
      {showWicketModal && currentInnings && (
        <WicketModal
          match={match}
          innings={currentInnings}
          onSubmit={(wicketData) => {
            submitWicket(wicketData);
            setShowWicketModal(false);
          }}
          onClose={() => setShowWicketModal(false)}
        />
      )}

      {/* ── Bowler selector modal ──────────────────────────────────────────── */}
      {showBowlerModal && fieldingTeam && (
        <BowlerSelector
          players={fieldingTeam.players}
          lastBowlerId={currentInnings?.currentBowler?.playerId}
          onSelect={async (id) => {
            setShowBowlerModal(false);
            const res = await fetch('/api/admin/over/end', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ nextBowlerId: id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              alert(`Bowler change failed: ${data?.error ?? 'Unknown error'}`);
            }
            await fetchMatch();
          }}
          onClose={() => setShowBowlerModal(false)}
        />
      )}

    </div>
  );
}