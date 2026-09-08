import type { CourtState, Game, GameEnding, GameState, Match, MatchSetup, PlayerId, Rule, Side, Team } from './model.ts';
import { gameWinner, validateRule } from './rules.ts';
import { normalizeNames } from './participants.ts';
export const opponent = (team: Team): Team => team === 'A' ? 'B' : 'A';
export const opposite = (side: Side): Side => side === 'left' ? 'right' : 'left';
export const serviceCourt = (score: number): Side => score % 2 === 0 ? 'right' : 'left';
export const teamOf = (player: PlayerId): Team => player[0] as Team;
export const partner = (player: PlayerId): PlayerId => `${player[0]}${player[1] === '1' ? '2' : '1'}` as PlayerId;
const copy = <T>(value: T): T => structuredClone(value);

export function initialCourt(type: Match['matchType'], server: PlayerId, receiver: PlayerId): CourtState {
  const court = {} as CourtState;
  for (const player of [server, receiver]) court[teamOf(player)] = { right: player, left: type === 'doubles' ? partner(player) : player };
  return court;
}
export function makeGame(matchType: Match['matchType'], gameNumber: number, servingTeam: Team, server: PlayerId, receiver: PlayerId, teamASide: Side): Game {
  if (teamOf(server) !== servingTeam || teamOf(receiver) !== opponent(servingTeam)) throw new Error('サーバーとレシーバーのチームが不正です。');
  if (matchType === 'singles' && (server[1] !== '1' || receiver[1] !== '1')) throw new Error('シングルスの選手を確認してください。');
  return { gameNumber, initialServingTeam: servingTeam, initialServer: server, initialReceiver: receiver,
    initialCourtState: initialCourt(matchType, server, receiver), initialTeamASide: teamASide,
    rallyHistory: [], endChanges: [], finalScore: null, winner: null };
}
export function createMatch(setup: MatchSetup, matchId: string, now: string): Match {
  validateRule(setup.rule);
  const players = { ...setup.players };
  for (const id of ['A1','A2','B1','B2'] as const) players[id] = players[id]?.trim().slice(0,40) || id;
  return { schemaVersion: 1, matchId, createdAt: now, updatedAt: now, matchType: setup.matchType,
    players, ...(setup.teamNames ? {teamNames:normalizeNames({teamNames:setup.teamNames,players}).teamNames} : {}), rule: copy(setup.rule), games: [makeGame(setup.matchType,1,setup.servingTeam,setup.server,setup.receiver,setup.teamASide)],
    status: 'in-progress', winner: null };
}
export function initialState(game: Game): GameState {
  return { finished: false, score: {A:0,B:0}, servingTeam: game.initialServingTeam, server: game.initialServer,
    receiver: game.initialReceiver, serviceCourt: 'right', court: copy(game.initialCourtState),
    teamASide: game.initialTeamASide, endChanged: false, intervalReached: false, winner: null };
}
export function advance(state: GameState, winner: Team, rule: Rule, decidingGame: boolean, type: Match['matchType'], automaticEnds = true): GameState {
  if (state.finished) throw new Error('このゲームは終了しています。');
  const next = copy(state);
  next.score[winner]++;
  if (type === 'doubles' && winner === state.servingTeam) {
    [next.court[winner].left, next.court[winner].right] = [next.court[winner].right, next.court[winner].left];
  }
  next.servingTeam = winner;
  next.serviceCourt = serviceCourt(next.score[winner]);
  next.server = next.court[winner][next.serviceCourt];
  next.receiver = next.court[opponent(winner)][next.serviceCourt];
  next.winner = gameWinner(next.score, rule);
  next.finished = next.winner !== null;
  const high = Math.max(next.score.A, next.score.B);
  if (rule.interval.at !== null && high >= rule.interval.at) next.intervalReached = true;
  if (automaticEnds && decidingGame && !next.endChanged && rule.ends.decidingGameAt !== null && high >= rule.ends.decidingGameAt) {
    next.teamASide = opposite(next.teamASide);
    next.endChanged = true;
  }
  return next;
}
export function replayGame(match: Pick<Match,'rule'|'matchType'>, game: Game): GameState {
  let state = initialState(game);
  const applyEnds = (count: number) => { for (const event of game.endChanges) if (event.afterRally === count) state.teamASide = opposite(state.teamASide); };
  applyEnds(0);
  for (const rally of game.rallyHistory) {
    state = advance(state,rally.winner,match.rule,game.gameNumber === match.rule.gamesToWin * 2 - 1,match.matchType,!game.decidingEnd);
    if (game.decidingEnd?.afterRally === rally.rallyNumber && game.decidingEnd.change !== null) {
      if (game.decidingEnd.change) state.teamASide = opposite(state.teamASide);
      state.endChanged = true;
    }
    applyEnds(rally.rallyNumber);
  }
  if (game.ending) { state.finished = true; state.winner = game.ending.winner; }
  return state;
}
export const currentGame = (match: Match): Game => match.games[match.games.length - 1];
export const currentState = (match: Match): GameState => replayGame(match,currentGame(match));
export const hasRecordedResult = (match: Match): boolean => match.status === 'completed' || match.games.some(game => game.ending !== undefined);
export const needsEndDecision = (match: Match): boolean => currentGame(match).decidingEnd?.change === null && !currentState(match).finished;
export function decideEnds(match: Match, change: boolean, now: string): Match {
  if (!needsEndDecision(match) || typeof change !== 'boolean') throw new Error('コートチェンジの確認はありません。');
  const next = copy(match);
  currentGame(next).decidingEnd!.change = change;
  currentGame(next).decidingEnd!.timestamp = now;
  next.updatedAt = now;
  return next;
}
export function gamesWon(match: Match): Record<Team,number> {
  return match.games.reduce((count,game) => { if(game.winner) count[game.winner]++; return count; },{A:0,B:0});
}
function finalize(match: Match, now: string): Match {
  const game = currentGame(match), state = currentState(match);
  game.winner = state.winner;
  game.finalScore = state.finished ? {...state.score} : null;
  const wins = gamesWon(match);
  match.winner = wins.A >= match.rule.gamesToWin ? 'A' : wins.B >= match.rule.gamesToWin ? 'B' : null;
  match.status = match.winner ? 'completed' : 'in-progress';
  if (game.ending?.scope === 'match') {
    match.winner = game.ending.winner;
    match.status = 'completed';
  } else if (state.finished && match.games.length >= match.rule.gamesToWin * 2 - 1) {
    match.winner = wins.A === wins.B ? null : wins.A > wins.B ? 'A' : 'B';
    match.status = 'completed';
  }
  match.updatedAt = now;
  return match;
}
export function scorePoint(match: Match, winner: Team, now: string, confirmEnds = true): Match {
  if (winner !== 'A' && winner !== 'B') throw new Error('得点するチームが不正です。');
  const before = currentState(match);
  if (match.status === 'completed' || before.finished) throw new Error('ゲームは終了しています。');
  if (needsEndDecision(match)) throw new Error('コートチェンジを選択してください。');
  const next = copy(match), game = currentGame(next);
  const after = advance(before,winner,match.rule,game.gameNumber === match.rule.gamesToWin*2-1,match.matchType);
  game.rallyHistory.push({ rallyNumber: game.rallyHistory.length+1, winner, scoreAfter: after.score,
    serverBefore: before.server, receiverBefore: before.receiver, courtStateBefore: copy(before.court),
    teamASideBefore: before.teamASide, timestamp: now });
  const threshold = match.rule.ends.decidingGameAt;
  if (confirmEnds && !game.decidingEnd && !before.endChanged && !after.finished && game.gameNumber === match.rule.gamesToWin*2-1 && threshold !== null && Math.max(after.score.A,after.score.B) >= threshold) {
    game.decidingEnd = {afterRally:game.rallyHistory.length,change:null,timestamp:now};
  }
  return finalize(next,now);
}
export function undoPoint(match: Match, now: string): Match {
  const next = copy(match);
  while (next.games.length > 1 && currentGame(next).rallyHistory.length === 0 && !currentGame(next).ending) next.games.pop();
  const game = currentGame(next);
  if (game.ending) { delete game.ending; return finalize(next,now); }
  if (!game.rallyHistory.length) return match;
  game.rallyHistory.pop();
  if (game.decidingEnd && game.decidingEnd.afterRally > game.rallyHistory.length) delete game.decidingEnd;
  game.endChanges = game.endChanges.filter(event => event.afterRally <= game.rallyHistory.length);
  return finalize(next,now);
}
export function nextGame(match: Match, server: PlayerId, receiver: PlayerId, now: string): Match {
  const before = currentState(match);
  if (!before.finished || match.status === 'completed') throw new Error('次のゲームを開始できません。');
  const next = copy(match);
  next.games.push(makeGame(match.matchType,next.games.length+1,before.winner ?? teamOf(server),server,receiver,
    match.rule.ends.betweenGames ? opposite(before.teamASide) : before.teamASide));
  next.updatedAt = now;
  return next;
}
export function changeEnds(match: Match, now: string): Match {
  if (needsEndDecision(match)) throw new Error('コートチェンジを選択してください。');
  if (currentState(match).finished) throw new Error('次ゲーム開始時にエンドを交替します。');
  const next = copy(match), game = currentGame(next);
  game.endChanges.push({afterRally:game.rallyHistory.length,timestamp:now});
  next.updatedAt = now;
  return next;
}

export function endGame(match: Match, ending: GameEnding): Match {
  if (!['retirement','time-limit','other'].includes(ending.reason) || !['game','match'].includes(ending.scope) || ![null,'A','B'].includes(ending.winner) || !Number.isFinite(Date.parse(ending.timestamp))) throw new Error('終了内容を確認してください。');
  if (ending.reason === 'retirement' && ending.winner === null) throw new Error('棄権の場合は勝者を選んでください。');
  if (match.status === 'completed' || currentGame(match).ending || currentState(match).finished) throw new Error('ゲームは終了しています。');
  const next = copy(match);
  currentGame(next).ending = copy(ending);
  return finalize(next,ending.timestamp);
}

// Logical right is near the umpire for the team on screen-left, far for screen-right.
// A view flip rotates the entire representation; it never modifies the match.
export function courtPositions(match: Match, state: GameState, flipped = false) {
  const positions: {id:PlayerId;team:Team;x:number;y:number;court:Side;role:'server'|'receiver'|'partner'}[] = [];
  for (const team of ['A','B'] as const) {
    const end = team === 'A' ? state.teamASide : opposite(state.teamASide);
    const sides: Side[] = match.matchType === 'singles' ? [state.serviceCourt] : ['left','right'];
    for(const side of sides) {
      const id = state.court[team][side];
      let x = end === 'left' ? 25 : 75;
      let y = (end === 'left') === (side === 'right') ? 73 : 27;
      if(flipped) { x=100-x; y=100-y; }
      positions.push({id,team,x,y,court:side,role:id===state.server?'server':id===state.receiver?'receiver':'partner'});
    }
  }
  return positions;
}
