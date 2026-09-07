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
 const repo=new MatchRepository(dbName);const prefs={matchId:m.matchId,flipped:true};await repo.save(m,prefs);await repo.close();
 const reloaded=new MatchRepository(dbName),result=await reloaded.load();assert.deepEqual(result,{match:m,prefs});assert.deepEqual(currentState(result!.match),currentState(m));assert.equal((await reloaded.list()).length,1);await reloaded.close();
});
test('JSON round trip validates service history and rejects tampered score or server',()=>{
 const m=scorePoint(make(),'A',now);assert.deepEqual(parseExport(exportMatches([m])),[m]);
 const corrupt=structuredClone(m);corrupt.games[0].rallyHistory[0].serverBefore='A1';assert.throws(()=>validateMatch(corrupt));
 const badScore=structuredClone(m);badScore.games[0].rallyHistory[0].scoreAfter.A=15;assert.throws(()=>validateMatch(badScore));
 assert.throws(()=>parseExport('{"format":"wrong","version":1,"matches":[]}'));
});
test('invalid bulk import is atomic and duplicate ID never overwrites a match',async()=>{
 const repo=new MatchRepository(crypto.randomUUID()),m=make();await repo.save(m,{matchId:m.matchId,flipped:false});
 await assert.rejects(repo.import([make(),m]));assert.equal((await repo.list()).length,1);await repo.close();
});
test('completed game and next-game choices survive reconstruction',()=>{
 let m=make();for(let i=0;i<21;i++)m=scorePoint(m,'A',now);m=nextGame(m,'A1','B1',now);m=scorePoint(m,'B',now);assert.deepEqual(validateMatch(m),m);
});

test('legacy paused match reloads without pause and retains its scoring history',async()=>{
 const repo=new MatchRepository(crypto.randomUUID());
 let m=make();m.rule.interval={at:11,seconds:60,betweenGamesSeconds:120};
 for(let i=0;i<11;i++)m=scorePoint(m,'A',now);
 const legacyPrefs={matchId:m.matchId,flipped:true,pause:{key:'old',until:Date.now()+60000,label:'インターバル'}};
 await repo.save(m,legacyPrefs);
 const result=await repo.load();assert.deepEqual(result?.prefs,{matchId:m.matchId,flipped:true});assert.deepEqual(result?.match,m);
 assert.equal(currentState(scorePoint(result!.match,'A',now)).score.A,12);
 await repo.close();
});
