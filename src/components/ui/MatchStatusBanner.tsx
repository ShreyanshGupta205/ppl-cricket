import type { MatchStatus } from '@/types/cricket';

interface Props {
  status: MatchStatus;
  resultText?: string;
}

const STATUS_CONFIG: Record<
  MatchStatus,
  { label: string; bg: string; text: string; dot?: string; show: boolean }
> = {
  SETUP: {
    label: 'Match Setup',
    bg:    'bg-gray-800',
    text:  'text-gray-400',
    show:  false,               // hide on public page during setup
  },
  TOSS: {
    label: '🪙 Toss in Progress',
    bg:    'bg-yellow-900/40',
    text:  'text-yellow-400',
    show:  true,
  },
  LIVE: {
    label: '● LIVE',
    bg:    'bg-[#E8510A]/20',
    text:  'text-[#E8510A]',
    dot:   'animate-pulse',
    show:  true,
  },
  INNINGS_BREAK: {
    label: '☕ Innings Break',
    bg:    'bg-blue-900/30',
    text:  'text-blue-400',
    show:  true,
  },
  RAIN_DELAY: {
    label: '🌧️ Rain Delay',
    bg:    'bg-blue-900/50',
    text:  'text-blue-300',
    show:  true,
  },
  COMPLETE: {
    label: '🏆 Match Complete',
    bg:    'bg-green-900/30',
    text:  'text-green-400',
    show:  true,
  },
  ABANDONED: {
    label: '⛔ Match Abandoned',
    bg:    'bg-red-900/30',
    text:  'text-red-400',
    show:  true,
  },
  TIED: {
    label: '🤝 Match Tied',
    bg:    'bg-purple-900/30',
    text:  'text-purple-400',
    show:  true,
  },
};

export default function MatchStatusBanner({ status, resultText }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.SETUP;

  if (!cfg.show) return null;

  return (
    <div className={`${cfg.bg} rounded-lg px-4 py-2 mt-2 flex items-center justify-between`}>
      {/* Status label */}
      <span className={`text-xs font-bold uppercase tracking-widest ${cfg.text} ${cfg.dot ?? ''}`}>
        {cfg.label}
      </span>

      {/* Result text (shown when match is complete/abandoned) */}
      {resultText && (
        <span className="text-xs text-gray-300 text-right max-w-[55%] truncate">
          {resultText}
        </span>
      )}

      {/* Live pulse dot */}
      {status === 'LIVE' && (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-[#E8510A] animate-ping inline-block" />
          Live
        </span>
      )}
    </div>
  );
}