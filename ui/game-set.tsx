import {useState} from 'react';
import type {GameEnding,Match,Team} from '../domain/model';
import {currentState} from '../domain/engine';
import {teamName} from '../domain/participants';
import {useI18n} from '../i18n/context';
import {Choice} from './choice';
export const endingReason=(reason:GameEnding['reason'])=>reason==='retirement'?'棄権':reason==='time-limit'?'時間切れ':'その他';
export function GameSet({match,onFinish}:{match:Match;onFinish:(ending:Omit<GameEnding,'timestamp'>)=>Promise<void>}){
 const {t}=useI18n(),score=currentState(match).score;
 const [scope,setScope]=useState<GameEnding['scope']>('game'),[reason,setReason]=useState<GameEnding['reason']>('time-limit');
 const [winner,setWinner]=useState<Team|'none'|''>(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <form onSubmit={async e=>{e.preventDefault();setError('');if(!winner){setError('勝者または引き分けを選んでください。');return}setBusy(true);try{await onFinish({scope,reason,winner:winner==='none'?null:winner})}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>
  <p className="form-note">{t('現在の得点 {a}–{b} をそのまま記録して終了します。',{a:score.A,b:score.B})}</p>
  <Choice label={t('終了する範囲')} value={scope} options={[{value:'game',label:t('このゲームだけ終了')},{value:'match',label:t('試合全体を終了')}]} onChange={v=>setScope(v as GameEnding['scope'])}/>
  <Choice label={t('終了理由')} value={reason} options={[{value:'time-limit',label:t('時間切れ')},{value:'retirement',label:t('棄権')},{value:'other',label:t('その他')}]} onChange={v=>{setReason(v as GameEnding['reason']);setWinner('')}}/>
  <Choice label={t('結果')} value={winner} options={[{value:'',label:t('結果を選択')},...(['A','B'] as const).map(team=>({value:team,label:t('{team} の勝利',{team:teamName(match,team)})})),...(reason==='retirement'?[]:[{value:'none',label:t('引き分け')}])]} onChange={v=>setWinner(v as typeof winner)}/>
  {reason==='retirement'&&<p className="form-note">{t('棄権した側の相手チームを勝者に選んでください。')}</p>}
  <p className="form-note">{t('「戻る」で途中終了を取り消し、得点入力を再開できます。')}</p>
  {error&&<p className="error-message" role="alert">{t(error)}</p>}
  <button className="primary-button" disabled={busy||!winner}>{busy?t('保存中…'):t('ゲームセットを確定')}</button>
 </form>;
}

