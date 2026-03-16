'use client';
import { useState } from 'react';
import type { PlayerInfo } from '@/types/cricket';

interface Props {
  players:         PlayerInfo[];
  lastBowlerId?:   string;   // cannot bowl consecutive overs
  onSelect:        (playerId: string) => void;
  onClose:         () => void;
  title?:          string;
}

export default function BowlerSelector({
  players, lastBowlerId, onSelect, onClose, title = 'Select Next Bowler'
}: Props) {
  const [selected, setSelected] = useState('');
  const [error,    setError]    = useState('');

  function handleConfirm() {
    if (!selected)                { setError('Please select a bowler'); return; }
    if (selected === lastBowlerId) { setError('Same bowler cannot bowl consecutive overs!'); return; }
    setError('');
    onSelect(selected);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-3 pb-4">
      <div className="w-full max-w-sm card-dark rounded-2xl p-5 space-y-4">

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-[#F5A623]">⚡ {title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {players.map((p) => {
            const isDisabled = p.id === lastBowlerId;
            return (
              <button
                key={p.id}
                onClick={() => !isDisabled && setSelected(p.id)}
                disabled={isDisabled}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors
                  ${isDisabled
                    ? 'bg-white/3 text-gray-600 cursor-not-allowed'
                    : selected === p.id
                      ? 'bg-[#F5A623] text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                {p.displayName}
                {p.isCaptain && ' (C)'}
                {isDisabled && <span className="text-xs ml-2 text-gray-600">bowled last over</span>}
              </button>
            );
          })}
        </div>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-[#F5A623] text-black font-black hover:bg-yellow-400 active:scale-95"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}