'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { MatchState, PlayerInfo } from '@/types/cricket';

type Step = 'config' | 'toss' | 'openers';

export default function SetupPage() {
  const router = useRouter();
  const [match,   setMatch]   = useState<MatchState | null>(null);
  const [step,    setStep]    = useState<Step>('config');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Step 1
  const [overs, setOvers] = useState(20);
  const [venue, setVenue] = useState('');

  // Step 2
  const [tossWonBy,    setTossWonBy]    = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  // Step 3
  const [opener1,    setOpener1]    = useState('');
  const [opener2,    setOpener2]    = useState('');
  const [openBowler, setOpenBowler] = useState('');

  useEffect(() => {
    fetch('/api/match')
      .then((r) => r.json())
      .then((d: MatchState) => {
        // ── Only redirect away if match is actively scoring or complete ──────
        // SETUP / TOSS / INNINGS_BREAK → stay on setup page
        // LIVE / COMPLETE / ABANDONED  → go to admin panel
        if (!d || (d as any).error) {
          // No match yet — stay here so admin can create one
          return;
        }
        setMatch(d);
        if (
          d.status === 'LIVE'      ||
          d.status === 'COMPLETE'  ||
          d.status === 'ABANDONED' ||
          d.status === 'TIED'
        ) {
          router.push('/admin');
        }
        // SETUP, TOSS, INNINGS_BREAK, RAIN_DELAY → stay on setup
      })
      .catch(() => {
        // API error — stay on setup, let admin retry
      });
  }, [router]);

  const team1 = match?.team1;
  const team2 = match?.team2;

  const battingTeamId =
    tossDecision === 'bat'
      ? tossWonBy
      : tossWonBy === team1?.id
        ? team2?.id
        : team1?.id;

  const battingTeam = battingTeamId === team1?.id ? team1 : team2;
  const bowlingTeam = battingTeamId === team1?.id ? team2 : team1;

  async function post(url: string, body: object): Promise<boolean> {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(String(data?.error ?? 'Something went wrong'));
        return false;
      }
      return true;
    } catch {
      setError('Network error — check console');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleConfig() {
    const ok = await post('/api/admin/setup', {
      totalOvers:     overs,
      venue,
      battingFirstId: team1?.id,
    });
    if (ok) setStep('toss');
  }

  async function handleToss() {
    if (!tossWonBy)     { setError('Select who won the toss');          return; }
    if (!battingTeamId) { setError('Could not determine batting team'); return; }
    const ok = await post('/api/admin/toss', {
      tossWonById:    tossWonBy,
      tossDecision,
      battingFirstId: battingTeamId,
    });
    if (ok) setStep('openers');
  }

  async function handleStart() {
    if (!opener1 || !opener2)           { setError('Select both opening batsmen');         return; }
    if (opener1 === opener2)            { setError('Both openers cannot be the same');      return; }
    if (!openBowler)                    { setError('Select the opening bowler');            return; }
    if (!battingTeamId || !bowlingTeam?.id) { setError('Team setup error');                return; }

    const ok = await post('/api/admin/innings/start', {
      inningsNo:     1,
      battingTeamId,
      bowlingTeamId: bowlingTeam.id,
      opener1Id:     opener1,
      opener2Id:     opener2,
      bowlerId:      openBowler,
    });
    if (ok) router.push('/admin');
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D]">
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  const STEPS: Step[] = ['config', 'toss', 'openers'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-[#E8510A]">⚙️ Match Setup</h1>
          <p className="text-gray-400 text-sm mt-1">{match.title}</p>
          {/* Show current status so admin knows where they are */}
          <p className="text-xs text-gray-600 mt-1">
            Status:{' '}
            <span className="text-[#F5A623]">{match.status}</span>
          </p>
        </div>

        {/* Step progress */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < stepIdx  ? 'bg-[#F5A623]'  :
                i === stepIdx ? 'bg-[#E8510A]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: Config ── */}
        {step === 'config' && (
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5 space-y-5">
            <h2 className="font-bold text-white text-lg">Step 1 — Match Config</h2>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Total Overs</p>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20].map((o) => (
                  <button
                    key={o}
                    onClick={() => setOvers(o)}
                    className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors ${
                      overs === o
                        ? 'bg-[#E8510A] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {o}
                  </button>
                ))}
                <input
                  type="number" min={1} max={50} value={overs}
                  onChange={(e) => setOvers(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2
                    text-white text-sm focus:outline-none focus:border-[#E8510A]"
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                Venue (optional)
              </p>
              <input
                type="text"
                placeholder="e.g. PPL Ground, Jharkhand"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
                  text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#E8510A]"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleConfig}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#E8510A] text-white font-black
                hover:bg-[#d44a09] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Next → Toss'}
            </button>
          </div>
        )}

        {/* ── STEP 2: Toss ── */}
        {step === 'toss' && (
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5 space-y-5">
            <h2 className="font-bold text-white text-lg">Step 2 — Toss Result</h2>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Toss Won By</p>
              <div className="grid grid-cols-2 gap-3">
                {[team1, team2].map((t) => t && (
                  <button
                    key={t.id}
                    onClick={() => setTossWonBy(t.id)}
                    className={`py-3 px-4 rounded-xl font-semibold text-sm transition-colors text-left ${
                      tossWonBy === t.id
                        ? 'bg-[#F5A623] text-black'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    🪙 {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Elected To</p>
              <div className="grid grid-cols-2 gap-3">
                {(['bat', 'bowl'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setTossDecision(d)}
                    className={`py-3 rounded-xl font-bold capitalize transition-colors ${
                      tossDecision === d
                        ? 'bg-[#F5A623] text-black'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {d === 'bat' ? '🏏 Bat' : '⚡ Bowl'}
                  </button>
                ))}
              </div>
            </div>

            {tossWonBy && battingTeam && (
              <div className="bg-white/5 rounded-lg p-3 text-sm">
                <span className="text-gray-400">Result: </span>
                <span className="text-white font-semibold">
                  {match.team1.id === tossWonBy ? team1?.name : team2?.name}
                </span>
                <span className="text-gray-400"> won toss, elected to {tossDecision}. </span>
                <span className="text-[#F5A623] font-semibold">{battingTeam.name}</span>
                <span className="text-gray-400"> will bat first.</span>
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('config'); setError(''); }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300
                  font-semibold hover:bg-white/10"
              >
                ← Back
              </button>
              <button
                onClick={handleToss}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#E8510A] text-white font-black
                  hover:bg-[#d44a09] disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Next → Openers'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Openers ── */}
        {step === 'openers' && battingTeam && bowlingTeam && (
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5 space-y-5">
            <h2 className="font-bold text-white text-lg">Step 3 — Opening Players</h2>

            <div className="bg-[#E8510A]/10 border border-[#E8510A]/20 rounded-lg p-3 text-sm">
              <span className="text-[#F5A623] font-semibold">{battingTeam.name}</span>
              <span className="text-gray-400"> batting first · </span>
              <span className="text-gray-400">{battingTeam.players.length} players loaded</span>
            </div>

            <PlayerSelect
              label={`Opener 1 — ${battingTeam.name}`}
              players={battingTeam.players}
              value={opener1}
              exclude={[opener2]}
              onChange={setOpener1}
            />
            <PlayerSelect
              label={`Opener 2 — ${battingTeam.name}`}
              players={battingTeam.players}
              value={opener2}
              exclude={[opener1]}
              onChange={setOpener2}
            />
            <PlayerSelect
              label={`Opening Bowler — ${bowlingTeam.name}`}
              players={bowlingTeam.players}
              value={openBowler}
              exclude={[]}
              onChange={setOpenBowler}
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('toss'); setError(''); }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300
                  font-semibold hover:bg-white/10"
              >
                ← Back
              </button>
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-black
                  hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Starting...' : '🏏 Start Match!'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Player select dropdown ────────────────────────────────────────────────────
function PlayerSelect({
  label, players, value, exclude, onChange,
}: {
  label:    string;
  players:  PlayerInfo[];
  value:    string;
  exclude:  string[];
  onChange: (id: string) => void;
}) {
  const available = players.filter((p) => !exclude.includes(p.id));

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {available.length === 0 ? (
        <p className="text-red-400 text-sm">⚠️ No players loaded — check seed</p>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ backgroundColor: '#1A1A1A', color: 'white' }}
          className="w-full border border-white/20 rounded-lg px-3 py-3
            text-sm focus:outline-none focus:border-[#E8510A] cursor-pointer"
        >
          <option value="" style={{ backgroundColor: '#1A1A1A', color: '#9E9E9E' }}>
            -- Select player --
          </option>
          {available.map((p) => (
            <option
              key={p.id}
              value={p.id}
              style={{ backgroundColor: '#1A1A1A', color: 'white' }}
            >
              #{p.jerseyNo} {p.displayName}{p.isCaptain ? ' ©' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}