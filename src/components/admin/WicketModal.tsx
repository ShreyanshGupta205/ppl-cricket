'use client';
import { useState } from 'react';
import type { MatchState, InningsState, PlayerInfo } from '@/types/cricket';

const WICKET_TYPES = [
  { value: 'BOWLED',           label: '🏏 Bowled',           needsFielder: false },
  { value: 'CAUGHT',           label: '🙌 Caught',           needsFielder: true  },
  { value: 'CAUGHT_AND_BOWLED',label: '↩️ Caught & Bowled',  needsFielder: false },
  { value: 'LBW',              label: '🦵 LBW',              needsFielder: false },
  { value: 'RUN_OUT',          label: '🏃 Run Out',          needsFielder: true  },
  { value: 'STUMPED',          label: '🧤 Stumped',          needsFielder: true  },
  { value: 'HIT_WICKET',       label: '💥 Hit Wicket',       needsFielder: false },
];

interface WicketPayload {
  runs:        number;
  isWicket:    boolean;
  wicketType:  string;
  fielderId?:  string;
  nextBatsmanId: string;
}

interface Props {
  match:    MatchState;
  innings:  InningsState;
  onSubmit: (payload: WicketPayload) => void;
  onClose:  () => void;
}

export default function WicketModal({ match, innings, onSubmit, onClose }: Props) {
  const [wicketType,    setWicketType]    = useState('');
  const [fielderId,     setFielderId]     = useState('');
  const [nextBatsman,   setNextBatsman]   = useState('');
  const [runsBeforeOut, setRunsBeforeOut] = useState(0);
  const [error,         setError]         = useState('');

  // Fielding team players (for caught/run-out/stumped)
  const battingTeamId  = innings.battingTeamId;
  const fieldingTeam   = match.team1.id === battingTeamId ? match.team2 : match.team1;
  const battingTeam    = match.team1.id === battingTeamId ? match.team1 : match.team2;

  // Players not yet out and not currently batting = next available batsmen
  const currentBatsmenIds = innings.currentBatsmen.map((b) => b.playerId);
  const dismissedIds = innings.dismissedPlayerIds ?? [];

  const availableBatsmen: PlayerInfo[] = battingTeam.players.filter(
    (p) => !currentBatsmenIds.includes(p.id) && !dismissedIds.includes(p.id)
  );

  const selectedType = WICKET_TYPES.find((w) => w.value === wicketType);

  function handleSubmit() {
    if (!wicketType) { setError('Please select a wicket type'); return; }
    if (selectedType?.needsFielder && !fielderId) {
      setError('Please select the fielder'); return;
    }
    if (!nextBatsman && innings.wickets < 9) {
      setError('Please select the next batsman'); return;
    }
    setError('');
    onSubmit({
      runs:          runsBeforeOut,
      isWicket:      true,
      wicketType,
      fielderId:     fielderId || undefined,
      nextBatsmanId: nextBatsman,
    });
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-3 pb-4">
      <div className="w-full max-w-sm card-dark rounded-2xl p-5 space-y-4">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-[#F44336]">🔴 Wicket!</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Wicket type */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
            How was the batter dismissed?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {WICKET_TYPES.map((w) => (
              <button
                key={w.value}
                onClick={() => { setWicketType(w.value); setFielderId(''); }}
                className={`py-2 px-3 rounded-lg text-sm font-semibold text-left transition-colors
                  ${wicketType === w.value
                    ? 'bg-[#F44336] text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fielder selector */}
        {selectedType?.needsFielder && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              {wicketType === 'RUN_OUT' ? 'Fielder (Run Out)' :
               wicketType === 'STUMPED' ? 'Wicketkeeper' : 'Caught by'}
            </label>
            <select
              value={fielderId}
              onChange={(e) => setFielderId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                text-white text-sm focus:outline-none focus:border-[#E8510A]"
            >
              <option value="">-- Select fielder --</option>
              {fieldingTeam.players.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Runs before wicket (for run out mid-delivery) */}
        {wicketType === 'RUN_OUT' && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              Runs scored before run out
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  onClick={() => setRunsBeforeOut(r)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors
                    ${runsBeforeOut === r
                      ? 'bg-[#E8510A] text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next batsman */}
        {innings.wickets < 9 && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              Next Batsman
            </label>
            <select
              value={nextBatsman}
              onChange={(e) => setNextBatsman(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                text-white text-sm focus:outline-none focus:border-[#E8510A]"
            >
              <option value="">-- Select next batsman --</option>
              {availableBatsmen.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}{p.isCaptain ? ' (C)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300
              font-semibold hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-[#F44336] text-white
              font-black hover:bg-red-600 transition-colors active:scale-95"
          >
            Confirm Wicket
          </button>
        </div>
      </div>
    </div>
  );
}