import {useLayoutEffect,useRef,useState} from 'react';
import type { GameState, Match } from '../domain/model';
import { courtPositions } from '../domain/engine';
import {connectRectangles} from './court-geometry';
import {useI18n} from '../i18n/context';
export function Court({match,state}:{match:Match;state:GameState}){
 const {t,language}=useI18n(),court=useRef<HTMLDivElement>(null),[arrow,setArrow]=useState<string|null>(null);
 const positions=courtPositions(match,state);
 useLayoutEffect(()=>{
  const element=court.current;if(!element)return;
  const source=element.querySelector<HTMLElement>('.court-player.server strong'),target=element.querySelector<HTMLElement>('.court-player.receiver strong'),svg=element.querySelector('svg');
  if(!source||!target||!svg)return;
  const measure=()=>{
   const bounds=svg.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
   const {start,end}=connectRectangles(source.getBoundingClientRect(),target.getBoundingClientRect(),2);
   const x=(v:number)=>(v-bounds.left)*1000/bounds.width,y=(v:number)=>(v-bounds.top)*430/bounds.height;
   setArrow(`M${x(start.x)} ${y(start.y)} L${x(end.x)} ${y(end.y)}`);
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(element);observer.observe(source);observer.observe(target);
  return()=>observer.disconnect();
 },[state.server,state.receiver,state.teamASide,state.court,match.players,language]);
 const announcement=state.finished?t('ゲーム終了'):t('{server}が{side}サービスコートから{receiver}にサーブ',{server:match.players[state.server],side:t(state.serviceCourt==='right'?'右':'左'),receiver:match.players[state.receiver]});
 return <section className="court-section"><div className="section-heading"><h2><span className="section-number">02</span>{t('コート')}</h2></div><div className="court-wrap"><div ref={court} className="court" role="img" aria-label={announcement}><svg className="court-lines" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true"><rect x="28" y="22" width="944" height="386"/><path d="M28 58H972 M28 372H972 M82 22V408 M918 22V408 M360 22V408 M640 22V408 M28 215H360 M640 215H972"/><path className="net-line" d="M500 0V430"/><defs><marker id="serve-arrow-head" viewBox="0 0 18 18" refX="16" refY="9" markerWidth="24" markerHeight="24" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L17 9L1 17L5 9Z" fill="#e5ff95" stroke="none"/></marker></defs>{!state.finished&&arrow&&<path className="serve-arrow" d={arrow} markerEnd="url(#serve-arrow-head)"/>}</svg><span className="net-label">NET</span>{positions.map(p=><div className={`court-player ${p.role}`} key={p.id} style={{left:`${p.x}%`,top:`${p.y}%`}}><span className="court-role">{state.finished?'':p.role==='server'?t('サーブ'):p.role==='receiver'?t('レシーブ'):''}</span><strong title={match.players[p.id]}>{match.players[p.id]}</strong><span className="position-label">{t(p.court==='right'?'右コート':'左コート')}</span></div>)}</div><div className="umpire-marker"><i/>{t('審判')}</div></div><span className="sr-only" aria-live="polite">{announcement}</span></section>;
}
