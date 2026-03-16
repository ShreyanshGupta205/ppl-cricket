import type { BallIcon } from '@/types/cricket';

const BALL_STYLES: Record<BallIcon['type'], string> = {
  dot:    'bg-gray-700 text-gray-300',
  runs:   'bg-white/10 text-white',
  four:   'bg-[#F5A623] text-black',
  six:    'bg-[#E8510A] text-white',
  wicket: 'bg-[#F44336] text-white',
  wide:   'border-2 border-[#2196F3] text-[#2196F3] bg-transparent',
  noball: 'border-2 border-purple-400 text-purple-400 bg-transparent',
};

const BALL_LABELS: Record<BallIcon['type'], string> = {
  dot: '•', four: '4', six: '6', wicket: 'W', wide: 'Wd', noball: 'Nb', runs: '',
};

export default function CurrentOverBalls({ balls }: { balls: BallIcon[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {balls.map((ball, i) => (
        <div
          key={i}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${BALL_STYLES[ball.type]}`}
        >
          {ball.type === 'runs' ? ball.value : BALL_LABELS[ball.type]}
        </div>
      ))}
      {balls.length === 0 && (
        <span className="text-gray-600 text-sm">Over starting...</span>
      )}
    </div>
  );
}