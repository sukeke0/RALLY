import type { Match, PlayerId, Team } from '../domain/model.ts';
import { createMatch, currentState, nextGame, scorePoint, changeEnds } from '../domain/engine.ts';
import { validateRule } from '../domain/rules.ts';
const ids=['A1','A2','B1','B2'];
const fail=():never=>{throw new Error('試合データの形式または得点履歴が正しくありません。');};
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// Imports are reconstructed through the engine. Derived fields are never trusted.
export function validateMatch(value: unknown): Match {
 try {
  const m=value as Match;
  if(!m||m.schemaVersion!==1||!['singles','doubles'].includes(m.matchType)||typeof m.matchId!=='string'||!m.matchId||m.matchId.length>120||!date(m.createdAt)||!date(m.updatedAt))fail();
  if(!m.players||ids.some(id=>typeof m.players[id as PlayerId]!=='string'||m.players[id as PlayerId].length>40))fail();
  if(m.teamNames!==undefined&&(!m.teamNames||['A','B'].some(team=>typeof m.teamNames?.[team as Team]!=='string'||m.teamNames[team as Team].length>40)))fail();
  validateRule(m.rule);
  if(!Array.isArray(m.games)||m.games.length<1||m.games.length>m.rule.gamesToWin*2-1)fail();
  const first=m.games[0];
  let built=createMatch({matchType:m.matchType,players:m.players,teamNames:m.teamNames,rule:m.rule,servingTeam:first.initialServingTeam,server:first.initialServer,receiver:first.initialReceiver,teamASide:first.initialTeamASide},m.matchId,m.createdAt);
  for(let i=0;i<m.games.length;i++){
   const g=m.games[i];
   if(!ids.includes(g.initialServer)||!ids.includes(g.initialReceiver)||!['left','right'].includes(g.initialTeamASide)||!['A','B'].includes(g.initialServingTeam)||g.gameNumber!==i+1||!Array.isArray(g.rallyHistory)||g.rallyHistory.length>m.rule.cap*2-1||!Array.isArray(g.endChanges)||g.endChanges.length>1000)fail();
   if(i>0)built=nextGame(built,g.initialServer,g.initialReceiver,m.updatedAt);
   const original=built.games[i];
   if(original.initialTeamASide!==g.initialTeamASide||original.initialServingTeam!==g.initialServingTeam||!same(original.initialCourtState,g.initialCourtState))fail();
   let lastEnd=-1;
   for(const event of g.endChanges){if(!Number.isInteger(event.afterRally)||event.afterRally<lastEnd||event.afterRally<0||event.afterRally>g.rallyHistory.length||!date(event.timestamp))fail();lastEnd=event.afterRally;}
   const ends=(n:number)=>{for(const e of g.endChanges)if(e.afterRally===n)built=changeEnds(built,e.timestamp);};
   ends(0);
   for(let j=0;j<g.rallyHistory.length;j++){
    const r=g.rallyHistory[j],s=currentState(built);
    if(r.rallyNumber!==j+1||!['A','B'].includes(r.winner)||!date(r.timestamp)||r.serverBefore!==s.server||r.receiverBefore!==s.receiver||r.teamASideBefore!==s.teamASide||!same(r.courtStateBefore,s.court))fail();
    built=scorePoint(built,r.winner as Team,r.timestamp);
    if(!same(r.scoreAfter,currentState(built).score))fail();
    ends(j+1);
   }
   if(!same(built.games[i].finalScore,g.finalScore)||built.games[i].winner!==g.winner)fail();
  }
  if(built.status!==m.status||built.winner!==m.winner)fail();
  return {...built,updatedAt:m.updatedAt};
 }catch{ return fail(); }
}
export function parseExport(text:string):Match[]{
 if(text.length>10_000_000)throw new Error('ファイルは10MB以下にしてください。');
 const data=JSON.parse(text);
 if(data.format!=='rally-scoreboard'||data.version!==1||!Array.isArray(data.matches)||data.matches.length<1||data.matches.length>500)fail();
 return data.matches.map(validateMatch);
}
export function exportMatches(matches:Match[]):string {
 return JSON.stringify({format:'rally-scoreboard',version:1,exportedAt:new Date().toISOString(),matches},null,2);
}
