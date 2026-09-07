import {useI18n} from '../i18n/context';
import { useEffect,useRef,useState } from 'react';
import type { Match } from '../domain/model';
import { Table,TableBody,TableRow,TableCell } from '../components/ui/table';
export function ScoreSheet({match}:{match:Match}) {
 const {t,locale}=useI18n();

 const [selected,setSelected]=useState(match.games.length-1);const ref=useRef<HTMLDivElement>(null);
 const active=match.games.length-1,game=match.games[Math.min(selected,active)],count=game.rallyHistory.length;
 const activeCount=match.games[active].rallyHistory.length;
 useEffect(()=>setSelected(active),[active,activeCount,match.matchId]);
 useEffect(()=>{
  const scroller=ref.current?.querySelector('[data-slot="table-container"]');
  const latest=ref.current?.querySelector<HTMLTableElement>('table')?.rows[0]?.cells[count];
  if(scroller&&latest)scroller.scrollLeft=Math.max(0,latest.offsetLeft+latest.offsetWidth-scroller.clientWidth);
 },[count,selected]);
 const cells=Math.max(12,count);
 return <section className="sheet-section"><div className="section-heading"><h2><span className="section-number">01</span>{t("得点経過")}</h2><div className="sheet-meta">{match.games.length>1&&<div className="game-switch">{match.games.map((g,i)=><button key={i} aria-pressed={selected===i} onClick={()=>setSelected(i)}>G{g.gameNumber}</button>)}</div>}<span>{t('{count} ラリー',{count})}</span><span className="desktop-only">{t("横にスクロール →")}</span></div></div><div className="score-sheet" ref={ref}><Table aria-label={t('ゲーム{game}の得点経過',{game:game.gameNumber})}><TableBody>{(['A','B'] as const).map(team=><TableRow key={team}><TableCell className={`row-label team-${team.toLowerCase()}`} role="rowheader">{team}</TableCell>{Array.from({length:cells},(_,i)=>{const rally=game.rallyHistory[i];return <TableCell key={i} className={`${rally?.winner===team?'scored':''} ${i===count-1?'latest':''}`} title={rally?t('ラリー{rally}：{a}–{b}',{rally:i+1,a:rally.scoreAfter.A,b:rally.scoreAfter.B}):undefined}>{rally?.winner===team?rally.scoreAfter[team]:''}</TableCell>;})}</TableRow>)}</TableBody></Table></div></section>;
}
