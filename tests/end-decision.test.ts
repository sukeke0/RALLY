import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,currentGame,currentState,scorePoint,nextGame,decideEnds,needsEndDecision,undoPoint,changeEnds} from '../domain/engine.ts';
import {RULE_21,RULE_15} from '../domain/rules.ts';
import type {Match,MatchSetup,Rule,Team} from '../domain/model.ts';
import {MatchStore} from '../state/match-store.ts';
import {MatchRepository} from '../persistence/repository.ts';
import {validateMatch,exportMatches,parseExport} from '../persistence/validation.ts';
import {reviseMatch} from '../domain/revise.ts';
const now='2026-09-08T04:00:00.000Z';
const setup:MatchSetup={matchType:'doubles',players:{A1:'John',A2:'James',B1:'Bob',B2:'Ben'},rule:RULE_21,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'};
const points=(m:Match,team:Team,n:number,confirm=true)=>{for(let i=0;i<n;i++)m=scorePoint(m,team,now,confirm);return m;};
function third(rule:Rule=RULE_21){
 let m=points(createMatch({...setup,rule},crypto.randomUUID(),now),'A',rule.target);
 assert.equal(needsEndDecision(m),false);
 m=points(nextGame(m,'A1','B1',now),'B',rule.target);
 assert.equal(needsEndDecision(m),false);
 return nextGame(m,'B2','A2',now);
}
for(const team of ['A','B'] as const)for(const choice of [true,false])test(`third game 11 points, ${team} scores, choice ${choice}`,()=>{
 const ten=points(third(),team,10),side=currentState(ten).teamASide;
 const pending=scorePoint(ten,team,now),state=currentState(pending);
 assert.ok(needsEndDecision(pending));assert.equal(state.teamASide,side);
 assert.throws(()=>scorePoint(pending,team,now));assert.throws(()=>changeEnds(pending,now));
 assert.deepEqual(validateMatch(pending),pending);
 const store=new MatchStore(pending);store.decideEnds(choice,now);
 assert.equal(needsEndDecision(store.match),false);
 assert.equal(currentState(store.match).teamASide,choice?'right':'left');
 assert.deepEqual(currentState(store.match).court,state.court);assert.equal(currentState(store.match).server,state.server);assert.equal(currentState(store.match).receiver,state.receiver);
 assert.throws(()=>store.decideEnds(choice,now));
 const decided=structuredClone(store.match);assert.deepEqual(parseExport(exportMatches([decided])),[decided]);
 store.undo(now);assert.deepEqual(currentState(store.match),currentState(ten));
 store.redo(now);assert.deepEqual(store.match,decided);assert.equal(needsEndDecision(store.match),false);
 const continued=points(store.match,team,3);assert.equal(needsEndDecision(continued),false);assert.deepEqual(validateMatch(continued),continued);
 const revised=reviseMatch(continued,{...setup,players:{...setup.players,A1:'Revised'}},now);
 assert.equal(currentState(revised).teamASide,currentState(continued).teamASide);assert.deepEqual(validateMatch(revised),revised);
 assert.ok(needsEndDecision(scorePoint(undoPoint(decided,now),team,now)));
});
test('No remains answered when the other team reaches 11 and after repository reload',async()=>{
 let m=decideEnds(points(third(),'A',11),false,now);m=points(m,'B',11);
 assert.equal(needsEndDecision(m),false);assert.equal(currentState(m).teamASide,'left');
 const repo=new MatchRepository(crypto.randomUUID());await repo.save(m,{matchId:m.matchId});
 assert.deepEqual((await repo.load())!.match,m);await repo.close();
});
test('15-point rule confirms at its configured threshold and manual end changes coexist',()=>{
 let m=changeEnds(third(RULE_15),now);m=points(m,'B',8);assert.ok(needsEndDecision(m));
 m=changeEnds(decideEnds(m,true,now),now);m=scorePoint(m,'A',now);assert.deepEqual(validateMatch(m),m);
});
test('legacy game past 11 loads without prompting or changing recorded sides',()=>{
 const legacy=points(third(),'B',13,false);assert.equal(currentGame(legacy).decidingEnd,undefined);
 assert.deepEqual(validateMatch(legacy),legacy);assert.equal(currentState(legacy).teamASide,'right');
 const continued=scorePoint(legacy,'A',now);assert.equal(needsEndDecision(continued),false);assert.deepEqual(validateMatch(continued),continued);
});
test('invalid decision boundaries, unresolved later rallies and altered choices are rejected',()=>{
 const pending=points(third(),'A',11),answered=scorePoint(decideEnds(pending,true,now),'B',now);
 for(const afterRally of [0,10,12,99]){const bad=structuredClone(answered);currentGame(bad).decidingEnd!.afterRally=afterRally;assert.throws(()=>validateMatch(bad));}
 for(const change of [false,null]){const bad=structuredClone(answered);currentGame(bad).decidingEnd!.change=change;assert.throws(()=>validateMatch(bad));}
});
