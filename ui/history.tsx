import { useEffect,useState,useRef } from 'react';
import { Download,Upload } from 'lucide-react';
import type { Match } from '../domain/model';
import { teamName } from '../domain/participants';
import { currentState } from '../domain/engine';
import type { MatchRepository } from '../persistence/repository';
import { exportMatches,parseExport } from '../persistence/validation';
export function downloadMatches(matches:Match[]){const blob=new Blob([exportMatches(matches)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`rally-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function MatchHistory({repo,current,onOpen}:{repo:MatchRepository;current:Match|null;onOpen:(match:Match)=>Promise<void>}){
 const [matches,setMatches]=useState<Match[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true);const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{void repo.list().then(setMatches).catch(()=>setError('試合履歴を読み込めませんでした。')).finally(()=>setLoading(false));},[repo]);
 return <div>{loading?<p className="form-note">履歴を読み込んでいます…</p>:matches.length===0?<p className="form-note">まだ保存された試合はありません。</p>:matches.map(m=>{const s=currentState(m);return <article key={m.matchId} className="history-item"><header><span>{new Date(m.createdAt).toLocaleString('ja-JP',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span><span>{m.status==='completed'?'試合終了':'中断・進行中'}</span></header><h3>{teamName(m,'A')} 対 {teamName(m,'B')}</h3><p>{m.players.A1}{m.matchType==='doubles'?` / ${m.players.A2}`:''} 対 {m.players.B1}{m.matchType==='doubles'?` / ${m.players.B2}`:''}</p><p>{m.rule.name} · GAME {m.games.length} · {s.score.A}–{s.score.B}{m.winner?` · ${teamName(m,m.winner)} 勝利`:''}</p><button className="secondary-button" onClick={()=>void onOpen(m).catch(e=>setError((e as Error).message))}>{m.status==='completed'?'結果を見る':'この試合を再開'}</button></article>})}
 <div className="history-actions"><button className="secondary-button" disabled={!current} onClick={()=>current&&downloadMatches([current])}><Download size={16}/>現在の試合を書き出す</button><button className="secondary-button" disabled={!matches.length} onClick={()=>downloadMatches(matches)}>全試合を書き出す</button><button className="secondary-button" onClick={()=>input.current?.click()}><Upload size={16}/>JSONを読み込む</button></div>
 <input hidden ref={input} type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setError('');setMessage('');try{if(file.size>10_000_000)throw new Error('ファイルは10MB以下にしてください。');const imported=parseExport(await file.text()).map(m=>({...m,matchId:crypto.randomUUID()}));await repo.import(imported);setMatches(await repo.list());setMessage(`${imported.length}件の試合をコピーとして保存しました。`);}catch(err){setError((err as Error).message)}finally{e.target.value='';}}}/>
 <p className="form-note" style={{marginTop:12}}>読み込んだ試合は別の試合として追加します。既存の記録は残ります。</p>{message&&<p className="form-note" role="status">{message}</p>}{error&&<p className="error-message" role="alert">{error}</p>}</div>;
}



