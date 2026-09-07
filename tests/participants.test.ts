import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, currentState } from '../domain/engine.ts';
import { renameParticipants, teamName } from '../domain/participants.ts';
import { RULE_21 } from '../domain/rules.ts';
import { MatchStore } from '../state/match-store.ts';
import { exportMatches, parseExport, validateMatch } from '../persistence/validation.ts';
const now='2026-09-08T00:00:00.000Z';
const make=()=>createMatch({matchType:'doubles',players:{A1:'',A2:'',B1:'',B2:''},rule:RULE_21,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'},'names-test',now);
const names={teamNames:{A:'青空クラブ',B:'レッドスター'},players:{A1:'John',A2:'Alice',B1:'Bob',B2:'Sam'}};
test('rename updates metadata without changing rally history or service state',()=>{
 const store=new MatchStore(make());store.score('A',now);store.score('B',now);
 const state=currentState(store.match),games=structuredClone(store.match.games);
 store.rename(names,now);assert.deepEqual(currentState(store.match),state);assert.deepEqual(store.match.games,games);assert.equal(teamName(store.match,'A'),'青空クラブ');
 assert.deepEqual(parseExport(exportMatches([store.match]))[0],store.match);
});
test('names persist across Undo and an already pending Redo',()=>{
 const store=new MatchStore(make());store.score('A',now);store.score('B',now);store.undo(now);
 store.rename(names,now);assert.equal(store.canRedo,true);store.redo(now);
 assert.deepEqual(store.match.players,names.players);assert.deepEqual(store.match.teamNames,names.teamNames);
 store.undo(now);assert.deepEqual(store.match.players,names.players);assert.deepEqual(currentState(store.match).score,{A:1,B:0});
});
test('existing records without team names still load and can be edited',()=>{
 const old=make();assert.equal(old.teamNames,undefined);assert.deepEqual(validateMatch(old),old);assert.equal(teamName(old,'B'),'Team B');
 const edited=renameParticipants(old,names,now);assert.deepEqual(validateMatch(edited),edited);
});
test('blank names use defaults; invalid imported names are rejected',()=>{
 const m=renameParticipants(make(),{teamNames:{A:' ',B:''},players:{A1:'',A2:' ',B1:'',B2:''}},now);
 assert.deepEqual(m.teamNames,{A:'Team A',B:'Team B'});assert.equal(m.players.A2,'A2');
 assert.throws(()=>renameParticipants(m,{...names,teamNames:{A:'X'.repeat(41),B:'B'}},now));
 assert.throws(()=>validateMatch({...m,teamNames:{A:3,B:'B'}}));
});
