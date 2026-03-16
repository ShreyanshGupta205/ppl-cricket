'use client';

interface Props {
  onScore: (runs: number) => void;
  onWide: () => void;
  onNoBall: () => void;
  onWicket: () => void;
  disabled: boolean;
}

const RUN_BUTTONS = [0, 1, 2, 3, 4, 6];

const RUN_COLORS: Record<number, string> = {
  0: 'bg-gray-700 hover:bg-gray-600',
  1: 'bg-[#1A1A1A] hover:bg-white/10 border border-white/20',
  2: 'bg-[#1A1A1A] hover:bg-white/10 border border-white/20',
  3: 'bg-[#1A1A1A] hover:bg-white/10 border border-white/20',
  4: 'bg-[#F5A623] hover:bg-[#e09820] text-black',
  6: 'bg-[#E8510A] hover:bg-[#d44a09]',
};

export default function ScorePad({ onScore, onWide, onNoBall, onWicket, disabled }: Props) {
  return (
    <div className="space-y-3">
      {/* Run buttons */}
      <div className="grid grid-cols-3 gap-3">
        {RUN_BUTTONS.map(run => (
          <button
            key={run}
            onClick={() => onScore(run)}
            disabled={disabled}
            className={`h-16 rounded-xl text-2xl font-black text-white ${RUN_COLORS[run]} 
              disabled:opacity-40 active:scale-95 transition-transform`}
          >
            {run}
          </button>
        ))}
      </div>

      {/* Extra buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onWide}
          disabled={disabled}
          className="h-14 rounded-xl bg-[#2196F3]/20 border-2 border-[#2196F3] 
            text-[#2196F3] font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          Wide
        </button>
        <button
          onClick={onNoBall}
          disabled={disabled}
          className="h-14 rounded-xl bg-purple-500/20 border-2 border-purple-400 
            text-purple-400 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          No Ball
        </button>
        <button
          onClick={onWicket}
          disabled={disabled}
          className="h-14 rounded-xl bg-[#F44336] hover:bg-red-600 
            text-white font-black text-xl disabled:opacity-40 active:scale-95 transition-transform"
        >
          🔴 W
        </button>
      </div>
    </div>
  );
}