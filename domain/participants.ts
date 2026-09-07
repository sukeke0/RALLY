import type { Match, PlayerId, Team } from './model.ts';
export interface ParticipantNames {
  teamNames: Record<Team, string>;
  players: Record<PlayerId, string>;
}
export const teamName = (match: Pick<Match, 'teamNames'>, team: Team): string => match.teamNames?.[team] || `Team ${team}`;
export function normalizeNames(names: ParticipantNames): ParticipantNames {
  const normalize = (value: string, fallback: string) => {
    if (typeof value !== 'string' || value.length > 40) throw new Error('チーム名・選手名は40文字以内で入力してください。');
    return value.trim() || fallback;
  };
  return {
    teamNames: { A: normalize(names.teamNames.A, 'Team A'), B: normalize(names.teamNames.B, 'Team B') },
    players: Object.fromEntries((['A1', 'A2', 'B1', 'B2'] as const).map(id => [id, normalize(names.players[id], id)])) as Record<PlayerId, string>,
  };
}
export function renameParticipants(match: Match, names: ParticipantNames, now: string): Match {
  return { ...match, ...normalizeNames(names), updatedAt: now };
}
