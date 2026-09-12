import {useEffect,useState} from 'react';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '../components/ui/accordion';
import {useI18n} from '../i18n/context';
import type {OssLicense} from '../scripts/oss-licenses';

export function OssLicenses(){
 const {t}=useI18n();
 const [entries,setEntries]=useState<OssLicense[]|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setFailed(false);
  void fetch('/oss-licenses.json',{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('Cannot load licenses');
   const data:unknown=await response.json();
   if(!Array.isArray(data)||data.length===0||!data.every(item=>item&&['name','version','identifier','text'].every(key=>typeof item[key]==='string'&&item[key].trim())))throw new Error('Invalid licenses');
   setEntries(data);
  }).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
  return()=>controller.abort();
 },[attempt]);
 if(failed)return <div className="error-message" role="alert">{t('ライセンスを読み込めませんでした。')}<button className="text-button" onClick={()=>setAttempt(attempt+1)}>{t('再試行')}</button></div>;
 if(!entries)return <p role="status">{t('読込中')}</p>;
 return <Accordion className="oss-licenses" multiple>{entries.map(item=><AccordionItem key={`${item.name}@${item.version}`} value={`${item.name}@${item.version}`}><AccordionTrigger><span>{item.name}<small>{item.version} · {item.identifier}</small></span></AccordionTrigger><AccordionContent><pre>{item.text}</pre></AccordionContent></AccordionItem>)}</Accordion>;
}
