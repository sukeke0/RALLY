import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, currentState, scorePoint, undoPoint, nextGame, courtPositions, changeEnds, currentGame, decideEnds } from '../domain/engine.ts';
import { RULE_21, RULE_15 } from '../domain/rules.ts';
import type { Match, MatchType, Team, Rule } from '../domain/model.ts';
import { MatchStore } from '../state/match-store.ts';
const now='2026-09-07T12:00:00.000Z';
const start=(type:MatchType='doubles',rule:Rule=RULE_21)=>createMatch({matchType:type,players:{A1:'',A2:'',B1:'',B2:''},rule,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'},'test',now);
const run=(match:Match,teams:Team[])=>teams.reduce((m,t)=>scorePoint(m,t,now),match);
test('0–0: initial players, right courts and umpire geometry',()=>{
 const m=start(),s=currentState(m); assert.equal(s.server,'A1');assert.equal(s.receiver,'B1');assert.equal(s.serviceCourt,'right');
 assert.deepEqual(s.court.A,{right:'A1',left:'A2'}); const p=courtPositions(m,s);assert.equal(p.find(p=>p.id==='A1')!.y,73);assert.equal(p.find(p=>p.id==='B1')!.y,27);
});
test('singles consecutive points and service transfer use server parity for both players',()=>{
 let m=run(start('singles'),['A','A','B']);let s=currentState(m);assert.deepEqual(s.score,{A:2,B:1});assert.equal(s.server,'B1');assert.equal(s.receiver,'A1');assert.equal(s.serviceCourt,'left');
 assert.deepEqual(courtPositions(m,s).map(p=>p.court),['left','left']);
 m=scorePoint(m,'B',now);s=currentState(m);assert.equal(s.server,'B1');assert.equal(s.serviceCourt,'right');
});
test('doubles serving winner swaps only its own pair, same player continues',()=>{
 let m=scorePoint(start(),'A',now),s=currentState(m);assert.equal(s.server,'A1');assert.equal(s.receiver,'B2');assert.equal(s.serviceCourt,'left');assert.deepEqual(s.court.A,{left:'A1',right:'A2'});assert.deepEqual(s.court.B,{left:'B2',right:'B1'});
 s=currentState(scorePoint(m,'A',now));assert.equal(s.server,'A1');assert.equal(s.receiver,'B1');assert.equal(s.serviceCourt,'right');
});
test('doubles repeated service changes preserve court ownership',()=>{
 let m=start();const expected=[['A','A1','B2'],['B','B2','A1'],['A','A2','B1'],['B','B1','A2'],['A','A1','B2']] as const;
 for(const [winner,server,receiver] of expected){const old=currentState(m);m=scorePoint(m,winner,now);const s=currentState(m);assert.equal(s.server,server);assert.equal(s.receiver,receiver);if(winner!==old.servingTeam)assert.deepEqual(s.court,old.court);}
});
test('initial server/receiver may be second players and team B',()=>{
 const m=createMatch({matchType:'doubles',players:{A1:'',A2:'',B1:'',B2:''},rule:RULE_21,servingTeam:'B',server:'B2',receiver:'A2',teamASide:'right'},'x',now);
 const s=currentState(scorePoint(m,'A',now));assert.equal(s.server,'A1');assert.equal(s.receiver,'B1');
});
test('Undo fully restores state and branching clears Redo',()=>{
 const store=new MatchStore(run(start(),['A','B','A']));const before=structuredClone(store.match);store.score('A',now);store.undo(now);assert.deepEqual(store.match,before);assert.deepEqual(currentState(store.match),currentState(before));assert.ok(store.canRedo);store.score('B',now);assert.equal(store.canRedo,false);
});
test('game termination stops scoring; undo reopens game',()=>{
 const m=run(start(),Array(21).fill('A'));assert.equal(currentState(m).winner,'A');assert.deepEqual(currentGame(m).finalScore,{A:21,B:0});assert.throws(()=>scorePoint(m,'B',now));const u=undoPoint(m,now);assert.equal(currentState(u).winner,null);assert.equal(currentState(u).server,'A1');assert.equal(currentState(u).receiver,'B1');
});
test('deuce requires margin; cap wins by one',()=>{
 let m=run(start(),Array.from({length:40},(_,i)=>i%2?'B':'A'));m=scorePoint(m,'A',now);assert.equal(currentState(m).winner,null);assert.equal(currentState(scorePoint(m,'A',now)).winner,'A');
 m=run(start(),Array.from({length:58},(_,i)=>i%2?'B':'A'));const s=currentState(scorePoint(m,'B',now));assert.deepEqual(s.score,{A:29,B:30});assert.equal(s.winner,'B');
});
test('15 point preset and custom rule are not fixed to 21',()=>{
 assert.equal(currentState(run(start('singles',RULE_15),Array(15).fill('B'))).winner,'B');
 const rule={...RULE_21,target:5,cap:7,gamesToWin:1,interval:{...RULE_21.interval,at:3},ends:{...RULE_21.ends,decidingGameAt:3}};
 const pending=run(start('doubles',rule),Array(3).fill('A'));
 assert.equal(run(decideEnds(pending,true,now),['A','A']).status,'completed');
});
test('next game winner serves, reselect players, exchange ends',()=>{
 const m=run(start(),Array(21).fill('A'));const next=nextGame(m,'A2','B2',now),s=currentState(next);assert.equal(s.server,'A2');assert.equal(s.receiver,'B2');assert.deepEqual(s.score,{A:0,B:0});assert.equal(s.teamASide,'right');assert.deepEqual(s.court.A,{right:'A2',left:'A1'});assert.throws(()=>nextGame(m,'B1','A1',now));
 const u=undoPoint(next,now);assert.equal(u.games.length,1);assert.equal(currentState(u).score.A,20);assert.equal(currentState(u).server,'A1');
});
test('legacy deciding game automatic ends remain compatible and Undo reverses it',()=>{
 let m=run(start(),Array(21).fill('A'));m=nextGame(m,'A1','B1',now);m=run(m,Array(21).fill('B'));m=nextGame(m,'B2','A2',now);m=run(m,Array(10).fill('B'));const before=currentState(m);m=scorePoint(m,'B',now,false);const s=currentState(m);assert.notEqual(s.teamASide,before.teamASide);assert.equal(s.server,before.server);assert.equal(s.receiver,'A1');assert.equal(s.endChanged,true);assert.deepEqual(currentState(undoPoint(m,now)),before);assert.equal(currentState(scorePoint(m,'B',now)).teamASide,s.teamASide);
});
test('view flip leaves match untouched, real ends affect geometry only',()=>{
 const m=run(start(),['A','B','B']),before=structuredClone(m),s=currentState(m);const p=courtPositions(m,s),q=courtPositions(m,s,true);assert.deepEqual(m,before);p.forEach((v,i)=>{assert.equal(v.x+q[i].x,100);assert.equal(v.y+q[i].y,100);});const end=currentState(changeEnds(m,now));assert.equal(end.server,s.server);assert.equal(end.receiver,s.receiver);assert.deepEqual(end.court,s.court);assert.notEqual(end.teamASide,s.teamASide);
});
test('serialized reload replays service order, courts and complete history',()=>{
 const m=run(start(),['A','B','B','A','A','B']);const restored=JSON.parse(JSON.stringify(m));assert.deepEqual(currentState(restored),currentState(m));assert.equal(restored.games[0].rallyHistory[2].serverBefore,'B2');
});
test('match ends when required games won, Undo restores in-progress status',()=>{
 let m=run(start(),Array(21).fill('A'));m=nextGame(m,'A2','B1',now);m=run(m,Array(21).fill('A'));assert.equal(m.status,'completed');assert.equal(m.winner,'A');assert.throws(()=>nextGame(m,'A1','B1',now));m=undoPoint(m,now);assert.equal(m.status,'in-progress');assert.equal(m.winner,null);assert.equal(currentState(m).server,'A2');
});
