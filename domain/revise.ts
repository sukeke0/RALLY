import type {Match,MatchSetup,PlayerId,Team} from './model.ts';
import {createMatch,currentState,scorePoint,nextGame,changeEnds,endGame} from './engine.ts';

// Replay rally winners rather than copying derived service order from the old rules.
export function reviseMatch(match:Match,setup:MatchSetup,now:string):Match {
 let revised=createMatch(setup,match.matchId,match.createdAt);
 for(let i=0;i<match.games.length;i++){
  const game=match.games[i];
  if(i>0){
   if(!currentState(revised).finished || revised.status==='completed')throw new Error('変更後のルールでは、次のゲームへ進んだ履歴と矛盾します。');
   const serving=currentState(revised).winner??game.initialServingTeam;
   const select=(team:Team):PlayerId=>setup.matchType==='singles'?`${team}1`:([game.initialServer,game.initialReceiver].find(id=>id[0]===team)??`${team}1`) as PlayerId;
   revised=nextGame(revised,select(serving),select(serving==='A'?'B':'A'),now);
  }
  const ends=(n:number)=>{for(const event of game.endChanges)if(event.afterRally===n){if(currentState(revised).finished)throw new Error('変更後のルールでは、コートチェンジの前にゲームが終了します。');revised=changeEnds(revised,event.timestamp)}};
  ends(0);
  for(const rally of game.rallyHistory){
   if(currentState(revised).finished || revised.status==='completed')throw new Error('変更後のルールでは、記録済みの得点より前にゲームが終了します。');
   revised=scorePoint(revised,rally.winner,rally.timestamp);ends(rally.rallyNumber);
  }
  if(game.ending){
   if(revised.status==='completed'||(currentState(revised).finished&&game.ending.scope==='game'))throw new Error('変更後のルールと途中終了の記録が矛盾します。先に「戻る」で途中終了を取り消してください。');
   revised=endGame(revised,game.ending);
  }
 }
 return {...revised,updatedAt:now};
}
