import type { FallOfWicket } from '@/types/cricket';

interface Props {
  wickets: FallOfWicket[];
}

export default function FallOfWickets({ wickets }: Props) {
  if (wickets.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      {/* Mobile: stacked list */}
      <div className="flex flex-col gap-1 sm:hidden">
        {wickets.map((w) => (
          <div
            key={w.wicketNo}
            className="flex justify-between items-center text-xs py-1 border-b border-white/5 last:border-0"
          >
            <span className="text-gray-400">
              <span className="text-[#F44336] font-bold mr-1">{w.wicketNo}-{w.score}</span>
              {w.playerName}
            </span>
            <span className="text-gray-500 ml-2 shrink-0">Ov {w.over}</span>
          </div>
        ))}
      </div>

      {/* Tablet+: horizontal scrollable chips */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {wickets.map((w) => (
          <div
            key={w.wicketNo}
            className="flex items-center gap-1 bg-white/5 rounded-full px-3 py-1 text-xs whitespace-nowrap"
          >
            <span className="text-[#F44336] font-bold">{w.wicketNo}-{w.score}</span>
            <span className="text-gray-300">{w.playerName}</span>
            <span className="text-gray-500">({w.over})</span>
          </div>
        ))}
      </div>
    </div>
  );
}