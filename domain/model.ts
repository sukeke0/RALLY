export type Team = 'A' | 'B';
export type PlayerId = 'A1' | 'A2' | 'B1' | 'B2';
export type Side = 'left' | 'right';
export type MatchType = 'singles' | 'doubles';
export type Score = Record<Team, number>;
export type CourtState = Record<Team, Record<Side, PlayerId>>;
export interface Rule {
  id: string;
  name: string;
  target: number;
  winBy: number;
  cap: number;
  gamesToWin: number;
  // Legacy export compatibility; new matches disable intervals.
  interval: { at: number | null; seconds: number; betweenGamesSeconds: number };
  ends: { betweenGames: boolean; decidingGameAt: number | null };
}
export interface GameState {
  score: Score;
  servingTeam: Team;
  server: PlayerId;
  receiver: PlayerId;
  serviceCourt: Side;
  court: CourtState;
  teamASide: Side;
  endChanged: boolean;
  intervalReached: boolean;
  winner: Team | null;
}
export interface Rally {
  rallyNumber: number;
  winner: Team;
  scoreAfter: Score;
  serverBefore: PlayerId;
  receiverBefore: PlayerId;
  courtStateBefore: CourtState;
  teamASideBefore: Side;
  timestamp: string;
}
export interface Game {
  gameNumber: number;
  initialServingTeam: Team;
  initialServer: PlayerId;
  initialReceiver: PlayerId;
  initialCourtState: CourtState;
  initialTeamASide: Side;
  rallyHistory: Rally[];
  endChanges: { afterRally: number; timestamp: string }[];
  finalScore: Score | null;
  winner: Team | null;
}
export interface Match {
  schemaVersion: 1;
  matchId: string;
  createdAt: string;
  updatedAt: string;
  matchType: MatchType;
  players: Record<PlayerId, string>;
  teamNames?: Record<Team, string>;
  rule: Rule;
  games: Game[];
  status: 'in-progress' | 'completed';
  winner: Team | null;
}
export interface MatchSetup {
  matchType: MatchType;
  players: Record<PlayerId, string>;
  teamNames?: Record<Team, string>;
  rule: Rule;
  servingTeam: Team;
  server: PlayerId;
  receiver: PlayerId;
  teamASide: Side;
}
