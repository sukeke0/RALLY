import { useEffect,useState } from 'react';
export function usePwa(active:boolean){
 const [offlineReady,setOfflineReady]=useState(false),[online,setOnline]=useState(true),[wakeLocked,setWakeLocked]=useState(false);
 useEffect(()=>{
  const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);
  if(import.meta.env.PROD&&'serviceWorker' in navigator){
   navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(()=>setOfflineReady(true)).catch(()=>setOfflineReady(false));
  }
  return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
 },[]);
 useEffect(()=>{
  let disposed=false,lock:WakeLockSentinel|null=null;
  const acquire=async()=>{
   if(!active||disposed||document.visibilityState!=='visible'||!('wakeLock'in navigator)||lock&&!lock.released)return;
   try{const next=await navigator.wakeLock.request('screen');if(disposed){await next.release();return;}lock=next;setWakeLocked(true);lock.addEventListener('release',()=>{if(!disposed)setWakeLocked(false)});}catch{setWakeLocked(false);}
  };
  void acquire();document.addEventListener('visibilitychange',acquire);
  return()=>{disposed=true;document.removeEventListener('visibilitychange',acquire);void lock?.release();setWakeLocked(false);};
 },[active]);
 return {offlineReady,online,wakeLocked};
}
