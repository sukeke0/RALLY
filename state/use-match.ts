import { useEffect,useRef,useState } from 'react';
import type { GameEnding,Match,MatchSetup,PlayerId,Team } from '../domain/model';
import { createMatch,currentState } from '../domain/engine';
import { MatchRepository,type Preferences } from '../persistence/repository';
import { MatchStore } from './match-store';
import type { ParticipantNames } from '../domain/participants';
export function useMatch(){
 const [repo]=useState(()=>new MatchRepository());
 const store=useRef<MatchStore|null>(null),prefsRef=useRef<Preferences>({matchId:''}),busy=useRef(false);
 const [match,setMatch]=useState<Match|null>(null),[prefs,setPrefs]=useState(prefsRef.current),[saveStatus,setSaveStatus]=useState<'loading'|'saved'|'saving'|'error'>('loading'),[error,setError]=useState('');
 const [writable,setWritable]=useState(!('locks' in navigator));
 useEffect(()=>{
  let disposed=false;
  void repo.load().then(result=>{if(disposed)return;if(result){store.current=new MatchStore(result.match);prefsRef.current=result.prefs;setMatch(result.match);setPrefs(result.prefs);}setSaveStatus('saved');}).catch(()=>{if(!disposed){setSaveStatus('error');setError('端末の保存データを読み込めませんでした。ブラウザの保存設定を確認し、再読み込みしてください。');}});
  return()=>{disposed=true;};
 },[repo]);
 useEffect(()=>{
  if(!('locks'in navigator))return;
  let disposed=false,release:()=>void=()=>{};
  void navigator.locks.request('rally-scoreboard-writer',{ifAvailable:true},async lock=>{if(disposed)return;if(!lock){setWritable(false);return;}setWritable(true);await new Promise<void>(resolve=>release=resolve);}).catch(()=>{if(!disposed)setWritable(true)});
  return()=>{disposed=true;release();};
 },[]);
 async function persist(next:Match,nextPrefs:Preferences){
  prefsRef.current=nextPrefs;setPrefs(nextPrefs);setMatch(next);setSaveStatus('saving');setError('');
  try{await repo.save(next,nextPrefs);setSaveStatus('saved');}
  catch{setSaveStatus('error');setError('端末に保存できませんでした。現在の得点は画面に残っています。再試行するか、JSONを書き出してください。');throw new Error('端末に保存できませんでした。');}
 }
 async function guarded(action:()=>Promise<void>){if(!writable)throw new Error('別のタブで試合を開いています。');if(busy.current)throw new Error('保存中です。');busy.current=true;try{await action();}finally{busy.current=false;}}
 async function start(setup:MatchSetup){await guarded(async()=>{if(store.current&&saveStatus==='error')throw new Error('現在の試合の保存を再試行してください。');const m=createMatch(setup,crypto.randomUUID(),new Date().toISOString());store.current=new MatchStore(m);await persist(m,{matchId:m.matchId});void navigator.storage?.persist?.().catch(()=>{});});}
 async function score(team:Team){await guarded(async()=>{
  if(!store.current||saveStatus==='error')throw new Error('試合を開始してください。');
  const next=store.current.score(team,new Date().toISOString());
  await persist(next,prefsRef.current);
  navigator.vibrate?.(15);
 });}
 async function undo(){await guarded(async()=>{if(!store.current?.canUndo)throw new Error('戻せる得点がありません。');await persist(store.current.undo(new Date().toISOString()),{...prefsRef.current});});}
 async function redo(){await guarded(async()=>{if(!store.current?.canRedo)return;await persist(store.current.redo(new Date().toISOString()),{...prefsRef.current});});}
 async function next(server:PlayerId,receiver:PlayerId){await guarded(async()=>{if(!store.current)return;await persist(store.current.next(server,receiver,new Date().toISOString()),{...prefsRef.current});});}
 async function ends(){await guarded(async()=>{if(!store.current)return;await persist(store.current.ends(new Date().toISOString()),prefsRef.current);});}
 async function open(saved:Match){await guarded(async()=>{if(store.current&&saveStatus==='error')throw new Error('現在の試合の保存を再試行してください。');store.current=new MatchStore(saved);await persist(saved,{matchId:saved.matchId});});}
 async function retry(){await guarded(async()=>{if(store.current)await persist(store.current.match,prefsRef.current);else{const result=await repo.load();if(result){store.current=new MatchStore(result.match);setMatch(result.match);prefsRef.current=result.prefs;setPrefs(result.prefs);}setSaveStatus('saved');setError('');}});}
 async function rename(names:ParticipantNames){await guarded(async()=>{if(!store.current)throw new Error('試合を開始してください。');await persist(store.current.rename(names,new Date().toISOString()),prefsRef.current);});}
 async function revise(setup:MatchSetup){await guarded(async()=>{if(!store.current)throw new Error('試合を開始してください。');if(saveStatus==='error')throw new Error('現在の試合の保存を再試行してください。');await persist(store.current.revise(setup,new Date().toISOString()),prefsRef.current);});}
 async function finish(ending:Omit<GameEnding,'timestamp'>){await guarded(async()=>{if(!store.current)throw new Error('試合を開始してください。');if(saveStatus==='error')throw new Error('現在の試合の保存を再試行してください。');await persist(store.current.finish({...ending,timestamp:new Date().toISOString()}),prefsRef.current);});}
 return {match,prefs,saveStatus,error,writable,repo,start,score,undo,redo,next,ends,open,retry,rename,revise,finish,
  canUndo:store.current?.canUndo??false,canRedo:store.current?.canRedo??false,
  read:()=>store.current?{matchId:store.current.match.matchId,game:store.current.match.games.length,...currentState(store.current.match),status:store.current.match.status}:null};
}
