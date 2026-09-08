import type { GameEnding, Match, MatchSetup, PlayerId, Team } from '../domain/model.ts';
import { changeEnds, decideEnds, endGame, nextGame, scorePoint, undoPoint } from '../domain/engine.ts';
import { reviseMatch } from '../domain/revise.ts';
import { renameParticipants, type ParticipantNames } from '../domain/participants.ts';
export class MatchStore {
  match: Match;
  private redoStack: Match[] = [];
  constructor(match: Match) { this.match = structuredClone(match); }
  get canUndo() { return this.match.games.some(game=>game.rallyHistory.length>0 || game.ending); }
  get canRedo() { return this.redoStack.length>0; }
  rename(names: ParticipantNames, now: string) {
    const renamed = renameParticipants(this.match, names, now);
    // Names identify the same participants across every score snapshot.
    this.redoStack = this.redoStack.map(match => renameParticipants(match, names, match.updatedAt));
    this.match = renamed;
    return this.match;
  }
  score(team: Team, now: string) { this.match=scorePoint(this.match,team,now); this.redoStack=[]; return this.match; }
  undo(now: string) { if(this.canUndo) { this.redoStack.push(this.match); this.match=undoPoint(this.match,now); } return this.match; }
  redo(now: string) { const match=this.redoStack.pop(); if(match) this.match={...match,updatedAt:now}; return this.match; }
  next(server: PlayerId, receiver: PlayerId, now: string) { this.match=nextGame(this.match,server,receiver,now); this.redoStack=[]; return this.match; }
  ends(now: string) { this.match=changeEnds(this.match,now); this.redoStack=[]; return this.match; }
  decideEnds(change:boolean,now:string) { this.match=decideEnds(this.match,change,now); this.redoStack=[]; return this.match; }
  revise(setup:MatchSetup,now:string) { this.match=reviseMatch(this.match,setup,now);this.redoStack=[];return this.match; }
  finish(ending:GameEnding) { this.match=endGame(this.match,ending);this.redoStack=[];return this.match; }
}
