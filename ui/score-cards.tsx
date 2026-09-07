import {useI18n} from '../i18n/context';
import type { GameState, Match, Team } from '../domain/model';
import { teamName } from '../domain/participants';
import { gamesWon } from '../domain/engine';
export function ScoreCards({match,state,onScore,disabled=false}:{match:Match;state:GameState;onScore:(team:Team)=>void;disabled?:boolean}) {
 const {t,locale}=useI18n();

 const left=state.teamASide==='left'?'A':'B';
 const teams:Team[]=left==='A'?['A','B']:['B','A'];const wins=gamesWon(match);
 return <section className="score-cards" aria-label={t("得点入力")}>{teams.map(team=><button key={team} className={`score-card team-${team.toLowerCase()}`} onClick={()=>onScore(team)} disabled={disabled||!!state.finished} aria-label={t('{team}に1点追加。現在{score}点',{team:teamName(match,team),score:state.score[team]})}><div className="team-heading"><span className="team-code">{team}</span><span className="team-name" title={teamName(match,team)}>{teamName(match,team)}</span><span className={`serve-tag ${state.servingTeam===team&&!state.finished?'':'invisible'}`}>● {t('サーブ')}</span></div><div className="player-names">{match.players[`${team}1`]}{match.matchType==='doubles'?` / ${match.players[`${team}2`]}`:''}</div><div className="score-number">{state.score[team]}</div><div className="game-wins"><span>{t("獲得ゲーム")}</span><div>{Array.from({length:match.rule.gamesToWin},(_,i)=><i className={i<wins[team]?'won':''} key={i}/>)}</div><b>{wins[team]}</b><span className="score-plus">＋</span></div></button>)}</section>;
}

