import { useState } from 'react';
import type { Match, MatchType } from '../domain/model';
import { teamName, type ParticipantNames } from '../domain/participants';
export function ParticipantFields({names,matchType,onChange}:{names:ParticipantNames;matchType:MatchType;onChange:(names:ParticipantNames)=>void}){
 return <div className="form-grid">{(['A','B'] as const).map(team=><div key={team} className="player-inputs">
  <label className="field">チーム{team}の名前<input maxLength={40} placeholder={`Team ${team}`} value={names.teamNames[team]} onChange={e=>onChange({...names,teamNames:{...names.teamNames,[team]:e.target.value}})}/></label>
  {([`${team}1`,...(matchType==='doubles'?[`${team}2`]:[])] as (keyof ParticipantNames['players'])[]).map(id=><label className="field" key={id}>{id}<input maxLength={40} placeholder={id} value={names.players[id]} onChange={e=>onChange({...names,players:{...names.players,[id]:e.target.value}})}/></label>)}
 </div>)}</div>;
}
export function ParticipantEditor({match,onSave}:{match:Match;onSave:(names:ParticipantNames)=>Promise<void>}){
 const [names,setNames]=useState<ParticipantNames>({teamNames:{A:teamName(match,'A'),B:teamName(match,'B')},players:{...match.players}});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await onSave(names)}catch(error){setError((error as Error).message)}finally{setBusy(false)}}}>
  <div className="form-section"><ParticipantFields names={names} matchType={match.matchType} onChange={setNames}/><p className="form-note">空欄の名前にはTeam A・Team B・A1などを使用します。</p></div>
  {error&&<p className="error-message" role="alert">{error}</p>}
  <button className="primary-button" disabled={busy} type="submit">{busy?'保存中…':'名前を保存'}</button>
 </form>;
}
