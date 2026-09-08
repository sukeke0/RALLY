import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchRepository } from '../persistence/repository.ts';
import { createMatch,scorePoint,currentState,changeEnds,nextGame } from '../domain/engine.ts';
import { RULE_21 } from '../domain/rules.ts';
import { exportMatches,parseExport,validateMatch } from '../persistence/validation.ts';
const now='2026-09-07T12:00:00.000Z';
const make=()=>createMatch({matchType:'doubles',players:{A1:'田中',A2:'鈴木',B1:'佐藤',B2:'伊藤'},rule:RULE_21,servingTeam:'A',server:'A2',receiver:'B2',teamASide:'left'},crypto.randomUUID(),now);
test('IndexedDB commit and a fresh repository restore complete match and preferences',async()=>{
 const dbName=crypto.randomUUID();let m=make();for(const t of ['A','B','B','A','B'] as const)m=scorePoint(m,t,now);m=changeEnds(m,now);
 const repo=new MatchRepository(dbName);const prefs={matchId:m.matchId};await repo.save(m,prefs);await repo.close();
 const reloaded=new MatchRepository(dbName),result=await reloaded.load();assert.deepEqual(result,{match:m,prefs});assert.deepEqual(currentState(result!.match),currentState(m));assert.equal((await reloaded.list()).length,1);await reloaded.close();
});
test('JSON round trip validates service history and rejects tampered score or server',()=>{
 const m=scorePoint(make(),'A',now);assert.deepEqual(parseExport(exportMatches([m])),[m]);
 const corrupt=structuredClone(m);corrupt.games[0].rallyHistory[0].serverBefore='A1';assert.throws(()=>validateMatch(corrupt));
 const badScore=structuredClone(m);badScore.games[0].rallyHistory[0].scoreAfter.A=15;assert.throws(()=>validateMatch(badScore));
 assert.throws(()=>parseExport('{"format":"wrong","version":1,"matches":[]}'));
});
test('invalid bulk import is atomic and duplicate ID never overwrites a match',async()=>{
 const repo=new MatchRepository(crypto.randomUUID()),m=make();await repo.save(m,{matchId:m.matchId});
 await assert.rejects(repo.import([make(),m]));assert.equal((await repo.list()).length,1);await repo.close();
});
test('completed game and next-game choices survive reconstruction',()=>{
 let m=make();for(let i=0;i<21;i++)m=scorePoint(m,'A',now);m=nextGame(m,'A1','B1',now);m=scorePoint(m,'B',now);assert.deepEqual(validateMatch(m),m);
});

test('legacy paused and flipped match reloads without display preferences and retains its scoring history',async()=>{
 const repo=new MatchRepository(crypto.randomUUID());
 let m=make();m.rule.interval={at:11,seconds:60,betweenGamesSeconds:120};
 for(let i=0;i<11;i++)m=scorePoint(m,'A',now);
 const legacyPrefs={matchId:m.matchId,flipped:true,pause:{key:'old',until:Date.now()+60000,label:'インターバル'}};
 await repo.save(m,legacyPrefs);
 const result=await repo.load();assert.deepEqual(result?.prefs,{matchId:m.matchId});assert.deepEqual(result?.match,m);
 assert.equal(currentState(scorePoint(result!.match,'A',now)).score.A,12);
 await repo.close();
});

test('deleting a history item preserves the active match and all other results',async()=>{
 const repo=new MatchRepository(crypto.randomUUID()),old=make(),active=scorePoint(make(),'A',now),other=make();
 await repo.save(active,{matchId:active.matchId});await repo.import([old,other]);await repo.remove(old.matchId);
 assert.deepEqual((await repo.load())?.match,active);assert.deepEqual(new Set((await repo.list()).map(m=>m.matchId)),new Set([active.matchId,other.matchId]));await repo.close();
});
test('deleting the active match clears its pointer atomically and remains deleted after reopening',async()=>{
 const dbName=crypto.randomUUID(),repo=new MatchRepository(dbName),active=make(),other=make();
 await repo.save(active,{matchId:active.matchId});await repo.import([other]);await repo.remove(active.matchId);await repo.close();
 const reopened=new MatchRepository(dbName);assert.equal(await reopened.load(),null);assert.deepEqual(await reopened.list(),[other]);await reopened.remove(active.matchId);assert.deepEqual(await reopened.list(),[other]);await reopened.close();
});

test('starting a replacement deletes only the current match and persists the new active match',async()=>{
 const repo=new MatchRepository(crypto.randomUUID()),active=scorePoint(make(),'A',now),other=make(),next=make();
 await repo.save(active,{matchId:active.matchId});await repo.import([other]);
 await repo.save(next,{matchId:next.matchId},active.matchId);
 assert.deepEqual((await repo.load())?.match,next);
 assert.deepEqual(new Set((await repo.list()).map(m=>m.matchId)),new Set([next.matchId,other.matchId]));await repo.close();
});

test('replacement failure rolls back deletion, new match and active pointer together',async()=>{
 const repo=new MatchRepository(crypto.randomUUID()),active=scorePoint(make(),'B',now),next=make();
 await repo.save(active,{matchId:active.matchId});
 const original=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value:unknown,key?:IDBValidKey){const req=original.call(this,value,key);if(this.name==='matches')req.addEventListener('success',()=>this.transaction.abort(),{once:true});return req;};
 try{await assert.rejects(repo.save(next,{matchId:next.matchId},active.matchId));}finally{IDBObjectStore.prototype.put=original;}
 assert.deepEqual((await repo.load())?.match,active);assert.deepEqual(await repo.list(),[active]);
 await repo.save(next,{matchId:next.matchId},active.matchId);assert.deepEqual(await repo.list(),[next]);await repo.close();
});
