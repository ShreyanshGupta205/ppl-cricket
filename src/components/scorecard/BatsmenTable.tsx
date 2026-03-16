import type { BatsmanScore } from '@/types/cricket';

export default function BatsmenTable({ batsmen }: { batsmen: BatsmanScore[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-white/10">
            <th className="text-left py-2 px-4">Batsman</th>
            <th className="py-2 px-2">R</th>
            <th className="py-2 px-2">B</th>
            <th className="py-2 px-2">4s</th>
            <th className="py-2 px-2">6s</th>
            <th className="py-2 px-2">SR</th>
          </tr>
        </thead>
        <tbody>
          {batsmen.filter(b => !b.isOut || b.runs > 0).map((b) => (
            <tr key={b.playerId} className="border-b border-white/5">
              <td className="py-3 px-4">
                <span className={`font-semibold ${b.isOnStrike ? 'text-[#F5A623]' : 'text-white'}`}>
                  {b.isOnStrike ? '★ ' : ''}
                  {b.displayName}
                </span>
                {b.isOut && (
                  <p className="text-xs text-gray-500">{b.dismissalInfo}</p>
                )}
              </td>
              <td className="text-center py-3 px-2 font-bold text-[#E8510A]">{b.runs}</td>
              <td className="text-center py-3 px-2 text-gray-300">{b.balls}</td>
              <td className="text-center py-3 px-2 text-gray-300">{b.fours}</td>
              <td className="text-center py-3 px-2 text-gray-300">{b.sixes}</td>
              <td className="text-center py-3 px-2 text-gray-400">{b.strikeRate.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}