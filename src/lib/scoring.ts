// Core scoring calculation helpers

export function calcOversDisplay(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return rem === 0 ? `${overs}.0` : `${overs}.${rem}`;
}

export function calcRunRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return parseFloat(((runs / balls) * 6).toFixed(2));
}

export function calcRequiredRunRate(
  target: number,
  currentRuns: number,
  ballsRemaining: number
): number {
  const needed = target - currentRuns;
  if (ballsRemaining <= 0) return 999;
  return parseFloat(((needed / ballsRemaining) * 6).toFixed(2));
}

export function calcMaxOversPerBowler(totalOvers: number): number {
  return Math.ceil(totalOvers / 5);
}

export function isInningsOver(
  wickets: number,
  balls: number,
  totalOvers: number
): boolean {
  return wickets >= 10 || balls >= totalOvers * 6;
}