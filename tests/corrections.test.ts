import test from 'node:test';
import assert from 'node:assert/strict';
import type {Match,MatchSetup,GameEnding} from '../domain/model.ts';
import {createMatch,currentGame,currentState,scorePoint,nextGame,endGame,changeEnds,hasRecordedResult,undoPoint} from '../domain/engine.ts';
import {reviseMatch} from '../domain/revise.ts';
import {RULE_21,RULE_15} from '../domain/rules.ts';
import {MatchStore} from '../state/match-store.ts';
import {validateMatch,parseExport,exportMatches} from '../persistence/validation.ts';
const now='2026-09-08T01:00:00.000Z';
const setup:MatchSetup={matchType:'doubles',players:{A1:'John',A2:'James',B1:'Bob',B2:'Ben'},rule:RULE_21,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'};
const make=()=>createMatch(setup,'correction-test',now);
const score=(m:Match,team:'A'|'B',count:number)=>{for(let i=0;i<count;i++)m=scorePoint(m,team,now);return m};
const ending=(overrides:Partial<GameEnding>={}):GameEnding=>({scope:'game',reason:'time-limit',winner:'A',timestamp:now,...overrides});

test('completed matches and forced endings are retained when starting another match',()=>{
 const active=score(make(),'A',4);assert.equal(hasRecordedResult(active),false);
 const firstFinished=score(make(),'A',21);assert.equal(hasRecordedResult(firstFinished),false);
 const completed=score(nextGame(firstFinished,'A1','B1',now),'A',21);assert.equal(hasRecordedResult(completed),true);
 for(const scope of ['game','match'] as const){const forced=endGame(active,ending({scope}));assert.equal(hasRecordedResult(forced),true);assert.equal(hasRecordedResult(undoPoint(forced,now)),false);}
 const forcedGame=endGame(active,ending());assert.equal(hasRecordedResult(nextGame(forcedGame,'A1','B1',now)),true);
});
test('settings correction preserves rally winners and dates while recalculating service and sides',()=>{
 let m=score(make(),'A',2);m=scorePoint(m,'B',now);m=changeEnds(m,now);const original=structuredClone(m);
 const revised=reviseMatch(m,{...setup,rule:RULE_15,server:'A2',receiver:'B2',teamASide:'right'},now);
 assert.deepEqual(m,original);assert.equal(revised.matchId,m.matchId);assert.equal(revised.createdAt,m.createdAt);
 assert.deepEqual(currentState(revised).score,currentState(m).score);assert.equal(revised.games[0].rallyHistory[0].serverBefore,'A2');
 assert.deepEqual(revised.games[0].rallyHistory.map(r=>[r.winner,r.timestamp]),m.games[0].rallyHistory.map(r=>[r.winner,r.timestamp]));
 assert.notEqual(currentState(revised).teamASide,currentState(m).teamASide);assert.deepEqual(validateMatch(revised),revised);
 const singles=reviseMatch(revised,{...setup,matchType:'singles'},now);assert.equal(currentState(singles).court.B.left,'B1');assert.deepEqual(validateMatch(singles),singles);
});
test('incompatible score-rule correction is rejected without changing the match or Redo',()=>{
 const m=score(make(),'A',17),store=new MatchStore(m);store.undo(now);const before=structuredClone(store.match);
 assert.throws(()=>store.revise({...setup,rule:RULE_15},now),/記録済み/);assert.deepEqual(store.match,before);assert.equal(store.canRedo,true);
});
test('multi-game correction preserves choices and rejects a missing game-end transition',()=>{
 let m=nextGame(score(make(),'A',21),'A2','B2',now);m=scorePoint(m,'B',now);
 const revised=reviseMatch(m,{...setup,server:'A2',receiver:'B2',teamASide:'right'},now);
 assert.equal(revised.games[1].initialServer,'A2');assert.deepEqual(validateMatch(revised),revised);
 assert.throws(()=>reviseMatch(m,{...setup,rule:{...RULE_21,target:25}},now),/次のゲーム/);
});
test('retirement ends a match at the actual score, round trips and Undo restores it after reload',()=>{
 let m=score(make(),'A',5);m=score(m,'B',3);const finished=endGame(m,ending({scope:'match',reason:'retirement',winner:'B'}));
 assert.equal(finished.status,'completed');assert.equal(finished.winner,'B');assert.deepEqual(currentGame(finished).finalScore,{A:5,B:3});
 assert.throws(()=>scorePoint(finished,'A',now));assert.throws(()=>nextGame(finished,'B1','A1',now));
 const [restored]=parseExport(exportMatches([finished]));assert.deepEqual(restored,finished);
 const store=new MatchStore(restored);store.undo(now);assert.deepEqual(store.match,m);store.redo(now);assert.deepEqual(store.match,finished);
});
test('drawn game permits explicit next server and a zero-point ending can be undone',()=>{
 const m=endGame(make(),ending({winner:null}));assert.equal(currentState(m).finished,true);assert.equal(m.status,'in-progress');
 const next=nextGame(m,'B2','A2',now);assert.equal(currentState(next).servingTeam,'B');assert.deepEqual(validateMatch(next),next);
 const store=new MatchStore(next);assert.equal(store.canUndo,true);store.undo(now);assert.deepEqual(store.match,make());
});
test('a drawn final game completes the match and rejects further games',()=>{
 let m=endGame(make(),ending());m=nextGame(m,'A1','B1',now);m=endGame(m,ending({winner:'B'}));m=nextGame(m,'B1','A1',now);m=endGame(m,ending({winner:null}));
 assert.equal(m.status,'completed');assert.equal(m.winner,null);assert.deepEqual(validateMatch(m),m);assert.throws(()=>nextGame(m,'A1','B1',now));
});
test('manual endings survive compatible corrections and invalid ending metadata is rejected',()=>{
 const m=endGame(score(make(),'A',3),ending());const revised=reviseMatch(m,{...setup,server:'A2',receiver:'B2'},now);assert.deepEqual(revised.games[0].ending,m.games[0].ending);assert.deepEqual(validateMatch(revised),revised);
 assert.throws(()=>endGame(make(),ending({reason:'retirement',winner:null})));
 const invalid=structuredClone(m);invalid.games[0].ending!.winner=null;assert.throws(()=>validateMatch(invalid));
 const invalidReason=structuredClone(m);(invalidReason.games[0].ending as any).reason='unknown';assert.throws(()=>validateMatch(invalidReason));
});
