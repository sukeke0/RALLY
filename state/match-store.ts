import type { Match, PlayerId, Team } from '../domain/model.ts';
import { changeEnds, nextGame, scorePoint, undoPoint } from '../domain/engine.ts';
export class MatchStore {
  match: Match;
  private redoStack: Match[] = [];
  constructor(match: Match) { this.match = structuredClone(match); }
  get canUndo() { return this.match.games.some(game=>game.rallyHistory.length>0); }
  get canRedo() { return this.redoStack.length>0; }
  score(team: Team, now: string) { this.match=scorePoint(this.match,team,now); this.redoStack=[]; return this.match; }
  undo(now: string) { if(this.canUndo) { this.redoStack.push(this.match); this.match=undoPoint(this.match,now); } return this.match; }
  redo(now: string) { const match=this.redoStack.pop(); if(match) this.match={...match,updatedAt:now}; return this.match; }
  next(server: PlayerId, receiver: PlayerId, now: string) { this.match=nextGame(this.match,server,receiver,now); this.redoStack=[]; return this.match; }
  ends(now: string) { this.match=changeEnds(this.match,now); this.redoStack=[]; return this.match; }
}
