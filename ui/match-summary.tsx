import {useI18n} from '../i18n/context';
import {currentState,gamesWon,replayGame} from '../domain/engine';
import {teamName} from '../domain/participants';
import type {Match,Team} from '../domain/model';
import {endingReason} from './game-set';

export function MatchSummary({match}:{match:Match}){
 const {t}=useI18n(),state=currentState(match),wins=gamesWon(match);
 const teams:Team[]=state.teamASide==='left'?['A','B']:['B','A'];
 const [left,right]=teams;
 return <div className="match-summary-detail">
  <div className="match-summary-status">{match.status==='completed'?t('試合終了'):state.finished?t('セット終了'):t('試合中')}</div>
  <div className="match-score-head"><span><b>{left}</b>{teamName(match,left)}</span><span>{t('スコア')}</span><span><b>{right}</b>{teamName(match,right)}</span></div>
  <div className="match-score-grid" role="group" aria-label={t('各ゲームのスコア')}>
   <strong className="match-game-total" data-team={left} aria-label={t('{team}のゲームスコア：{score}',{team:teamName(match,left),score:wins[left]})}>{wins[left]}</strong>
   <div className="match-set-scores">{match.games.map(game=>{
    const s=replayGame(match,game);
    return <div className={`match-set-row ${s.finished?'':'is-current'}`} key={game.gameNumber}>
     <span className="match-set-label">GAME {game.gameNumber}{!s.finished&&<span>{t('進行中')}</span>}</span>
     <div className="match-set-points" aria-label={t('ゲーム{game}：{left} {a} 対 {right} {b}',{game:game.gameNumber,left:teamName(match,left),a:s.score[left],right:teamName(match,right),b:s.score[right]})}><strong data-team={left}>{s.score[left]}</strong><span aria-hidden="true">–</span><strong data-team={right}>{s.score[right]}</strong></div>
     {game.ending&&<span className="match-set-ending">{t(endingReason(game.ending.reason))}</span>}
    </div>;
   })}</div>
   <strong className="match-game-total" data-team={right} aria-label={t('{team}のゲームスコア：{score}',{team:teamName(match,right),score:wins[right]})}>{wins[right]}</strong>
  </div>
 </div>;
}
