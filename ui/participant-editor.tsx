import {useI18n} from '../i18n/context';
import type { MatchType } from '../domain/model';
import { type ParticipantNames } from '../domain/participants';
export function ParticipantFields({names,matchType,onChange}:{names:ParticipantNames;matchType:MatchType;onChange:(names:ParticipantNames)=>void}){
 const {t,locale}=useI18n();

 return <div className="form-grid">{(['A','B'] as const).map(team=><div key={team} className="player-inputs">
  <label className="field">{t('チーム{team}の名前',{team})}<input maxLength={40} placeholder={`Team ${team}`} value={names.teamNames[team]} onChange={e=>onChange({...names,teamNames:{...names.teamNames,[team]:e.target.value}})}/></label>
  {([`${team}1`,...(matchType==='doubles'?[`${team}2`]:[])] as (keyof ParticipantNames['players'])[]).map(id=><label className="field" key={id}>{t('{id} 選手名',{id})}<input maxLength={40} placeholder={t('{id} 選手名',{id})} value={names.players[id]} onChange={e=>onChange({...names,players:{...names.players,[id]:e.target.value}})}/></label>)}
 </div>)}</div>;
}
