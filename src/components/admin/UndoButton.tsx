'use client';
import { useState, useEffect } from 'react';

const UNDO_WINDOW = 30; // seconds

interface Props {
  onUndo:         () => void;
  lastActionTime: number; // Date.now() timestamp, reset on each new ball
}

export default function UndoButton({ onUndo, lastActionTime }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Recalculate countdown whenever a new ball is recorded
  useEffect(() => {
    if (!lastActionTime) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastActionTime) / 1000);
      const left    = Math.max(0, UNDO_WINDOW - elapsed);
      setSecondsLeft(left);
    };

    tick(); // immediate first tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastActionTime]);

  const active = secondsLeft > 0;

  return (
    <button
      onClick={onUndo}
      disabled={!active}
      className={`w-full h-12 rounded-xl font-bold text-sm transition-all active:scale-95
        ${active
          ? 'bg-red-900/40 border border-red-500/50 text-red-400 hover:bg-red-900/60'
          : 'bg-white/3 border border-white/5 text-gray-600 cursor-not-allowed'
        }`}
    >
      {active
        ? `↩ Undo Last Ball  (${secondsLeft}s)`
        : '↩ Undo Unavailable'}
    </button>
  );
}