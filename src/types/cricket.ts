export interface MatchState {
  id:             string;
  title:          string;
  status:         MatchStatus;
  totalOvers:     number;
  team1:          TeamInfo;
  team2:          TeamInfo;
  currentInnings: number;
  // These come from Prisma as string | null — allow both null and undefined
  tossWonById?:    string | null;
  battingFirstId?: string | null;
  resultText?:     string | null;
  innings1?:      InningsState;
  innings2?:      InningsState;
}

export type MatchStatus =
  | 'SETUP'
  | 'TOSS'
  | 'LIVE'
  | 'INNINGS_BREAK'
  | 'RAIN_DELAY'
  | 'COMPLETE'
  | 'ABANDONED'
  | 'TIED';

export interface TeamInfo {
  id:        string;
  name:      string;
  shortName: string;
  players:   PlayerInfo[];
}

export interface PlayerInfo {
  id:          string;
  name:        string;
  displayName: string;
  isCaptain:   boolean;
  jerseyNo?:   number;
}

export interface InningsState {
  id:               string;
  inningsNo:        number;
  battingTeamId:    string;
  totalRuns:        number;
  wickets:          number;
  balls:            number;
  overs:            string;
  currentRunRate:   number;
  requiredRunRate?: number;
  target?:          number;
  extras:           ExtrasInfo;
  currentBatsmen:   BatsmanScore[];
  currentBowler?:   BowlerScore;
  recentBalls:      BallIcon[];
  fallOfWickets:    FallOfWicket[];
  isComplete:       boolean;
  dismissedPlayerIds: string[];
}

export interface BatsmanScore {
  playerId:      string;
  displayName:   string;
  runs:          number;
  balls:         number;
  fours:         number;
  sixes:         number;
  strikeRate:    number;
  isOnStrike:    boolean;
  isOut:         boolean;
  dismissalInfo?: string;
}

export interface BowlerScore {
  playerId:    string;
  displayName: string;
  overs:       string;
  maidens:     number;
  runs:        number;
  wickets:     number;
  economy:     number;
}

export interface ExtrasInfo {
  wide:   number;
  noBall: number;
  bye:    number;
  legBye: number;
  total:  number;
}

export interface BallIcon {
  type:   'dot' | 'runs' | 'four' | 'six' | 'wicket' | 'wide' | 'noball';
  value?: number;
}

export interface FallOfWicket {
  wicketNo:   number;
  score:      number;
  playerName: string;
  over:       string;
}