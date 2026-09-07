import type { GameState, Match } from '../domain/model';
import { courtPositions } from '../domain/engine';
import { teamName } from '../domain/participants';
export function Court({match,state,flipped}:{match:Match;state:GameState;flipped:boolean}){
 const positions=courtPositions(match,state,flipped),server=positions.find(p=>p.role==='server')!,receiver=positions.find(p=>p.role==='receiver')!;
 // Stop the arrow outside the player cards so its head stays fully visible.
 const direction=receiver.x>server.x?1:-1;
 const startX=server.x*10+direction*180,endX=receiver.x*10-direction*180;
 const startY=server.y*4.3+(receiver.y-server.y)*4.3*.36;
 const endY=receiver.y*4.3-(receiver.y-server.y)*4.3*.36;
 const announcement=state.winner?'ゲーム終了':`${match.players[state.server]}が${state.serviceCourt==='right'?'右':'左'}サービスコートから${match.players[state.receiver]}にサーブ`;
 return <section className="court-section"><div className="section-heading"><h2><span className="section-number">02</span>サービスコート</h2><span className="view-label">審判から見た配置{flipped?' · 反転中':''}</span></div><div className="court-wrap"><div className="court" role="img" aria-label={announcement}><svg className="court-lines" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true"><rect x="28" y="22" width="944" height="386"/><path d="M28 58H972 M28 372H972 M82 22V408 M918 22V408 M360 22V408 M640 22V408 M28 215H360 M640 215H972"/><path className="net-line" d="M500 0V430"/><defs><marker id="serve-arrow-head" viewBox="0 0 18 18" refX="16" refY="9" markerWidth="24" markerHeight="24" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L17 9L1 17L5 9Z" fill="#e5ff95" stroke="none"/></marker></defs>{!state.winner&&<path className="serve-arrow" d={`M${startX} ${startY} L${endX} ${endY}`} markerEnd="url(#serve-arrow-head)"/>}</svg><span className="net-label">NET</span>{positions.map(p=><div className={`court-player ${p.role}`} key={p.id} style={{left:`${p.x}%`,top:`${p.y}%`}}><span className="court-role" title={teamName(match,p.team)}>{state.winner?'':p.role==='server'?'サーブ':p.role==='receiver'?'レシーブ':teamName(match,p.team)}</span><strong title={match.players[p.id]}>{match.players[p.id]}</strong><span className="position-label">{p.court==='right'?'右':'左'}コート</span></div>)}</div><div className="umpire-marker"><i/>審判</div></div><span className="sr-only" aria-live="polite">{announcement}</span></section>;
}
