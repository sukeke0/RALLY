import type { Match } from '../domain/model.ts';
import { validateMatch } from './validation.ts';
export interface Preferences { matchId:string }
const request=<T>(req:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const done=(tx:IDBTransaction)=>new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('保存が中断されました。'));});
export class MatchRepository {
 private dbPromise:Promise<IDBDatabase>|null=null;
 private dbName:string;
 constructor(dbName='rally-scoreboard-v1'){this.dbName=dbName;}
 private open():Promise<IDBDatabase>{
  if(!this.dbPromise)this.dbPromise=new Promise((resolve,reject)=>{
   if(typeof indexedDB==='undefined'){reject(new Error('このブラウザでは端末に保存できません。'));return;}
   const req=indexedDB.open(this.dbName,1);
   req.onupgradeneeded=()=>{req.result.createObjectStore('matches',{keyPath:'matchId'});req.result.createObjectStore('meta');};
   req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
   req.onerror=()=>{this.dbPromise=null;reject(req.error);};
   req.onblocked=()=>{this.dbPromise=null;reject(new Error('別のタブを閉じてから再試行してください。'));};
  });
  return this.dbPromise;
 }
 async save(match:Match,prefs:Preferences):Promise<void>{
  const db=await this.open(),tx=db.transaction(['matches','meta'],'readwrite'),finished=done(tx);
  tx.objectStore('matches').put(structuredClone(match));tx.objectStore('meta').put(structuredClone(prefs),'active');await finished;
 }
 async load():Promise<{match:Match;prefs:Preferences}|null>{
  const db=await this.open();const prefs=await request(db.transaction('meta').objectStore('meta').get('active')) as Preferences|undefined;
  if(!prefs)return null;
  const raw=await request(db.transaction('matches').objectStore('matches').get(prefs.matchId));
  if(!raw)throw new Error('保存した試合が見つかりません。試合履歴を確認してください。');
  return {match:validateMatch(raw),prefs:{matchId:prefs.matchId}};
 }
 async list():Promise<Match[]>{
  const db=await this.open();const matches=await request(db.transaction('matches').objectStore('matches').getAll());
  return matches.map(validateMatch).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }
 async import(matches:Match[]):Promise<void>{
  const validated=matches.map(validateMatch),db=await this.open(),tx=db.transaction('matches','readwrite'),finished=done(tx);
  for(const match of validated)tx.objectStore('matches').add(match);
  await finished;
 }
 async close(){const db=await this.dbPromise;db?.close();this.dbPromise=null;}
}
