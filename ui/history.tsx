import {useI18n} from '../i18n/context';
import { useEffect,useState,useRef } from 'react';
import { Download,Upload } from 'lucide-react';
import type { Match } from '../domain/model';
import { teamName } from '../domain/participants';
import { currentState } from '../domain/engine';
import type { MatchRepository } from '../persistence/repository';
import { exportMatches,parseExport } from '../persistence/validation';
export function downloadMatches(matches:Match[]){const blob=new Blob([exportMatches(matches)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`rally-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function MatchHistory({repo,current,onOpen}:{repo:MatchRepository;current:Match|null;onOpen:(match:Match)=>Promise<void>}){
 const {t,locale}=useI18n();

 const [matches,setMatches]=useState<Match[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true);const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{void repo.list().then(setMatches).catch(()=>setError('試合履歴を読み込めませんでした。')).finally(()=>setLoading(false));},[repo]);
 return <div>{loading?<p className="form-note">{t("履歴を読み込んでいます…")}</p>:matches.length===0?<p className="form-note">{t("まだ保存された試合はありません。")}</p>:matches.map(m=>{const s=currentState(m);return <article key={m.matchId} className="history-item"><header><span>{new Date(m.createdAt).toLocaleString(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span><span>{m.status==='completed'?t("試合終了"):t("中断・進行中")}</span></header><h3>{teamName(m,'A')}{' '+t('対')+' '}{teamName(m,'B')}</h3><p>{m.players.A1}{m.matchType==='doubles'?` / ${m.players.A2}`:''}{' '+t('対')+' '}{m.players.B1}{m.matchType==='doubles'?` / ${m.players.B2}`:''}</p><p>{t(m.rule.name)} · GAME {m.games.length} · {s.score.A}–{s.score.B}{m.winner?' · '+t('{team} の勝利',{team:teamName(m,m.winner)}):''}</p><button className="secondary-button" onClick={()=>void onOpen(m).catch(e=>setError((e as Error).message))}>{m.status==='completed'?t("結果を見る"):t("この試合を再開")}</button></article>})}
 <div className="history-actions"><button className="secondary-button" disabled={!current} onClick={()=>current&&downloadMatches([current])}><Download size={16}/>{t("現在の試合を書き出す")}</button><button className="secondary-button" disabled={!matches.length} onClick={()=>downloadMatches(matches)}>{t("全試合を書き出す")}</button><button className="secondary-button" onClick={()=>input.current?.click()}><Upload size={16}/>{t("JSONを読み込む")}</button></div>
 <input hidden ref={input} type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setError('');setMessage('');try{if(file.size>10_000_000)throw new Error(t("ファイルは10MB以下にしてください。"));const imported=parseExport(await file.text()).map(m=>({...m,matchId:crypto.randomUUID()}));await repo.import(imported);setMatches(await repo.list());setMessage(t('{count}件の試合をコピーとして保存しました。',{count:imported.length}));}catch(err){setError((err as Error).message)}finally{e.target.value='';}}}/>
 <p className="form-note" style={{marginTop:12}}>{t("読み込んだ試合は別の試合として追加します。既存の記録は残ります。")}</p>{message&&<p className="form-note" role="status">{message}</p>}{error&&<p className="error-message" role="alert">{t(error)}</p>}</div>;
}



