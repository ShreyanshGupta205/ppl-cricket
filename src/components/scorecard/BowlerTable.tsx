import type { BowlerScore } from '@/types/cricket';

export default function BowlerTable({ bowler }: { bowler: BowlerScore }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-white/10">
            <th className="text-left py-2 px-4">Bowler</th>
            <th className="py-2 px-2">O</th>
            <th className="py-2 px-2">M</th>
            <th className="py-2 px-2">R</th>
            <th className="py-2 px-2">W</th>
            <th className="py-2 px-2">ECO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-3 px-4 font-semibold text-[#F5A623]">
              ⚡ {bowler.displayName}
            </td>
            <td className="text-center py-3 px-2 text-gray-300">{bowler.overs}</td>
            <td className="text-center py-3 px-2 text-gray-300">{bowler.maidens}</td>
            <td className="text-center py-3 px-2 text-gray-300">{bowler.runs}</td>
            <td className="text-center py-3 px-2 font-bold text-[#E8510A]">{bowler.wickets}</td>
            <td className="text-center py-3 px-2 text-gray-400">{bowler.economy.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}