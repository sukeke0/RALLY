import {useI18n} from '../i18n/context';
import { useState } from 'react';
import type { Match,MatchSetup,MatchType,PlayerId,Rule,Side,Team } from '../domain/model';
import { RULE_21,RULE_15,validateRule } from '../domain/rules';
import { currentState,opponent } from '../domain/engine';
import { teamName } from '../domain/participants';
import { ParticipantFields } from './participant-editor';
import { Choice } from './choice';
import { Checkbox } from '../components/ui/checkbox';
export function Setup({previous,editing=false,onStart}:{previous?:Match;editing?:boolean;onStart:(setup:MatchSetup)=>Promise<void>}){
 const {t,locale}=useI18n();

 const [type,setType]=useState<MatchType>(previous?.matchType??'doubles');
 const [players,setPlayers]=useState<Record<PlayerId,string>>(previous?.players??{A1:'',A2:'',B1:'',B2:''});
 const [teamNames,setTeamNames]=useState({A:previous?teamName(previous,'A'):'',B:previous?teamName(previous,'B'):''});
 const first=editing?previous?.games[0]:undefined;
 const [serving,setServing]=useState<Team>(first?.initialServingTeam??'A'),[aFirst,setAFirst]=useState<PlayerId>(first?(first.initialServingTeam==='A'?first.initialServer:first.initialReceiver):'A1'),[bFirst,setBFirst]=useState<PlayerId>(first?(first.initialServingTeam==='B'?first.initialServer:first.initialReceiver):'B1');
 const [side,setSide]=useState<Side>(first?.initialTeamASide??'left'),[rule,setRule]=useState<Rule>(structuredClone(editing&&previous?{...previous.rule,interval:{at:null,seconds:0,betweenGamesSeconds:0}}:RULE_15));
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const start=async(setup:MatchSetup)=>{setError('');setBusy(true);try{await onStart(setup)}catch(err){setError((err as Error).message)}finally{setBusy(false)}};
 const personOptions=(team:Team)=>[`${team}1`,...(type==='doubles'?[`${team}2`]:[])].map(id=>({value:id,label:players[id as PlayerId]||id}));
 const numberField=(label:string,value:number,onChange:(value:number)=>void,max=199,min=0)=><label className="field">{label}<input type="number" min={min} max={max} inputMode="numeric" value={value} required onChange={e=>onChange(e.target.value===''?0:Number(e.target.value))}/></label>;
 return <form onSubmit={e=>{e.preventDefault();setError('');try{validateRule(rule);const setup:MatchSetup={matchType:type,players,teamNames,rule,servingTeam:serving,server:serving==='A'?aFirst:bFirst,receiver:serving==='A'?bFirst:aFirst,teamASide:side};void start(setup);}catch(err){setError((err as Error).message);}}}>
 <div className="form-section"><div className="form-grid"><Choice label={t("種目")} value={type} options={[{value:'doubles',label:t("ダブルス")},{value:'singles',label:t("シングルス")}]} onChange={v=>{setType(v as MatchType);setAFirst('A1');setBFirst('B1');}}/><Choice label={t("得点ルール")} value={rule.id} options={[{value:'15',label:t("15点制")},{value:'21',label:t("21点制")},{value:'custom',label:t("カスタム")}]} onChange={v=>setRule(structuredClone(v==='21'?RULE_21:v==='15'?RULE_15:{...rule,id:'custom',name:'カスタム'}))}/></div><p className="form-note">{t('{target}点・{margin}点差・上限{cap}点 / {games}ゲーム先取',{target:rule.target,margin:rule.winBy,cap:rule.cap,games:rule.gamesToWin})}</p></div>
 {rule.id==='custom'&&<div className="form-section"><div className="form-grid">{numberField(t("基本得点"),rule.target,v=>setRule({...rule,target:v}),99,1)}{numberField(t("デュース時の点差"),rule.winBy,v=>setRule({...rule,winBy:v}),99,1)}{numberField(t("最大得点"),rule.cap,v=>setRule({...rule,cap:v}),199,1)}{numberField(t("勝利に必要なゲーム数"),rule.gamesToWin,v=>setRule({...rule,gamesToWin:v}),5,1)}{numberField(t("最終ゲームの交替点（0＝なし）"),rule.ends.decidingGameAt??0,v=>setRule({...rule,ends:{...rule.ends,decidingGameAt:v||null}}),98)}</div><label className="check-field"><Checkbox checked={rule.ends.betweenGames} onCheckedChange={v=>setRule({...rule,ends:{...rule.ends,betweenGames:!!v}})}/>{t("ゲーム間にエンド交替する")}</label></div>}
 <div className="form-section"><h3>{t("チーム名・選手名")}</h3><ParticipantFields names={{teamNames,players}} matchType={type} onChange={names=>{setTeamNames(names.teamNames);setPlayers(names.players)}}/><p className="form-note">{t("空欄でも開始できます。Team A・Team B・A1などを使用します。")}</p></div>
 <div className="form-section"><h3>{editing?t("第1ゲーム開始時のサービスと配置"):t("最初のサービスと配置")}</h3><div className="form-grid"><Choice label={t("最初にサーブするチーム")} value={serving} options={[{value:'A',label:teamNames.A||'Team A'},{value:'B',label:teamNames.B||'Team B'}]} onChange={v=>setServing(v as Team)}/><Choice label={t("審判から見たTeam Aの側")} value={side} options={[{value:'left',label:t("左側")},{value:'right',label:t("右側")}]} onChange={v=>setSide(v as Side)}/><Choice label={t("最初のサーバー")} value={serving==='A'?aFirst:bFirst} options={personOptions(serving)} onChange={v=>serving==='A'?setAFirst(v as PlayerId):setBFirst(v as PlayerId)}/><Choice label={t("最初のレシーバー")} value={serving==='A'?bFirst:aFirst} options={personOptions(opponent(serving))} onChange={v=>serving==='A'?setBFirst(v as PlayerId):setAFirst(v as PlayerId)}/></div><p className="form-note">{t("0–0ではサーバーとレシーバーが各自の右コート、パートナーが左コートから開始します。")}</p></div>
 {error&&<p className="error-message" role="alert">{t(error)}</p>}<button className="primary-button" disabled={busy} type="submit">{busy?t("保存中…"):editing?t("変更を保存"):t("この設定で試合を開始")}</button>{editing&&<p className="form-note" style={{marginTop:10}}>{t("得点履歴を保って配置を再計算します。記録と矛盾する変更は保存できません。")}</p>}</form>;
}
export function NextGameSetup({match,onStart}:{match:Match;onStart:(server:PlayerId,receiver:PlayerId)=>Promise<void>}){
 const {t,locale}=useI18n();

 const winner=currentState(match).winner;
 const [serving,setServing]=useState<Team>(winner??currentState(match).servingTeam),other=opponent(serving);
 const [server,setServer]=useState<PlayerId>(`${serving}1`),[receiver,setReceiver]=useState<PlayerId>(`${other}1`),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const options=(t:Team)=>(match.matchType==='doubles'?[`${t}1`,`${t}2`]:[`${t}1`]).map(id=>({value:id,label:match.players[id as PlayerId]}));
 return <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onStart(server,receiver)}catch(err){setError((err as Error).message)}finally{setBusy(false)}}}><div className="form-section"><p className="form-note">{winner?t('前ゲームの勝者 {team} がサーブします。',{team:teamName(match,winner)}):t('引き分けのため、最初にサーブするチームを選んでください。')}{match.rule.ends.betweenGames?t("エンドは自動で交替します。"):''}</p>{!winner&&<Choice label={t('最初にサーブするチーム')} value={serving} options={(['A','B'] as const).map(team=>({value:team,label:teamName(match,team)}))} onChange={v=>{const team=v as Team;setServing(team);setServer(`${team}1`);setReceiver(`${opponent(team)}1`)}}/>}<Choice label={t("最初のサーバー")} value={server} options={options(serving)} onChange={v=>setServer(v as PlayerId)}/><Choice label={t("最初のレシーバー")} value={receiver} options={options(other)} onChange={v=>setReceiver(v as PlayerId)}/></div>{error&&<p className="error-message">{t(error)}</p>}<button className="primary-button" disabled={busy}>{t('GAME {game} を開始',{game:match.games.length+1})}</button></form>;
}

