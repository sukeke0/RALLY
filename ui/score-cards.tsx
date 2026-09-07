import type { GameState, Match, Team } from '../domain/model';
import { gamesWon, opposite } from '../domain/engine';
export function ScoreCards({match,state,flipped,onScore,disabled=false}:{match:Match;state:GameState;flipped:boolean;onScore:(team:Team)=>void;disabled?:boolean}) {
 const left=(flipped?opposite(state.teamASide):state.teamASide)==='left'?'A':'B';
 const teams:Team[]=left==='A'?['A','B']:['B','A'];const wins=gamesWon(match);
 return <section className="score-cards" aria-label="得点入力">{teams.map(team=><button key={team} className={`score-card team-${team.toLowerCase()}`} onClick={()=>onScore(team)} disabled={disabled||!!state.winner} aria-label={`Team ${team}に1点追加。現在${state.score[team]}点`}><div className="team-heading"><span className="team-code">{team}</span><span>TEAM {team}</span><span className={`serve-tag ${state.servingTeam===team&&!state.winner?'':'invisible'}`}>● サーブ</span></div><div className="player-names">{match.players[`${team}1`]}{match.matchType==='doubles'?` / ${match.players[`${team}2`]}`:''}</div><div className="score-number">{state.score[team]}</div><div className="game-wins"><span>獲得ゲーム</span><div>{Array.from({length:match.rule.gamesToWin},(_,i)=><i className={i<wins[team]?'won':''} key={i}/>)}</div><b>{wins[team]}</b><span className="score-plus">＋</span></div></button>)}</section>;
}
