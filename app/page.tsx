import { useEffect,useRef,useState } from 'react';
import { History,Settings2,RotateCcw,Redo2,ArrowLeftRight,CircleHelp,Download,Plus,Check,WifiOff,Sun,RotateCw } from 'lucide-react';
import { createMatch,currentState,currentGame,gamesWon } from '../domain/engine';
import { RULE_21 } from '../domain/rules';
import { useMatch } from '../state/use-match';
import { ScoreCards } from '../ui/score-cards';
import { ScoreSheet } from '../ui/score-sheet';
import { Court } from '../ui/court';
import { Setup,NextGameSetup } from '../ui/setup';
import { MatchHistory,downloadMatches } from '../ui/history';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '../components/ui/dialog';
import { usePwa } from '../pwa/use-pwa';
import { registerScoreTools } from '../pwa/webmcp';
const blank=createMatch({matchType:'doubles',players:{A1:'',A2:'',B1:'',B2:''},rule:RULE_21,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'},'not-started','2026-09-07T00:00:00Z');
type Panel='setup'|'settings'|'history'|'help'|'next'|'ends'|null;
export default function Home(){
 const session=useMatch(),match=session.match??blank,state=currentState(match),game=currentGame(match),wins=gamesWon(match);
 const [panel,setPanel]=useState<Panel>(null),[actionError,setActionError]=useState(''),[clock,setClock]=useState(Date.now());
 const pwa=usePwa(!!session.match&&match.status==='in-progress'),actions=useRef(session);actions.current=session;
 const [endNotice,setEndNotice]=useState(false),priorSide=useRef(state.teamASide);
 useEffect(()=>{if(priorSide.current!==state.teamASide&&session.match){setEndNotice(true);}priorSide.current=state.teamASide;},[state.teamASide,session.match]);
 useEffect(()=>{if(!session.prefs.pause)return;setClock(Date.now());const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[session.prefs.pause]);
 useEffect(()=>registerScoreTools({read:()=>actions.current.read(),score:async team=>{await actions.current.score(team);await new Promise(requestAnimationFrame);return actions.current.read();},undo:async()=>{await actions.current.undo();await new Promise(requestAnimationFrame);return actions.current.read();}}),[]);
 const locked=session.saveStatus==='loading'||session.saveStatus==='saving'||!session.writable;
 const run=(action:()=>Promise<void>)=>{setActionError('');void action().catch(e=>setActionError((e as Error).message));};
 const pause=session.prefs.pause,remaining=pause?Math.max(0,Math.ceil((pause.until-clock)/1000)):0;
 const titles={setup:'新しい試合',settings:'試合と表示の設定',history:'試合履歴',help:'RALLYの使い方',next:`GAME ${game.gameNumber+1} の準備`,ends:'実際のエンドを交替'};
 return <div className="app-shell"><header className="app-header"><a className="brand" href="/" aria-label="RALLY ホーム"><span className="brand-mark">R</span><span>RALLY<span className="brand-sub">UMPIRE SCOREBOARD</span></span></a><div className="header-actions"><span className={`local-status ${session.saveStatus==='error'?'failed':''}`} role="status"><i/>{session.saveStatus==='loading'?'読込中':session.saveStatus==='saving'?'保存中':session.saveStatus==='error'?'未保存':session.match?'端末に保存済み':'新しい試合'}</span><button className="icon-button" aria-label="試合履歴" title="試合履歴" disabled={locked} onClick={()=>setPanel('history')}><History/></button><button className="icon-button" aria-label="設定" title="設定" disabled={locked} onClick={()=>setPanel('settings')}><Settings2/></button></div></header>
 <main className="board">
 {!session.writable&&<div className="notice" role="status">別のタブで操作中です。そのタブを閉じて、こちらを再読み込みしてください。</div>}
 {!session.match&&session.saveStatus!=='loading'&&<div className="start-strip"><span>選手とルールを設定して始めましょう</span><button className="primary-button" disabled={locked} onClick={()=>setPanel('setup')}><Plus/>試合を設定</button></div>}
 {session.error&&<div className="error-message" role="alert">{session.error}<div className="error-actions"><button onClick={()=>run(session.retry)}>保存を再試行</button>{session.match&&<button onClick={()=>downloadMatches([match])}>JSONを書き出す</button>}</div></div>}
 {actionError&&!session.error&&<div className="error-message" role="alert">{actionError}<button onClick={()=>setActionError('')} className="text-button">閉じる</button></div>}
 <div className="match-bar"><div className="game-label">GAME <strong>{game.gameNumber.toString().padStart(2,'0')}</strong><span className="live-pill"><i/>{!session.match?'開始前':match.status==='completed'?'試合終了':state.winner?'ゲーム終了':pause?'休憩中':'試合中'}</span></div><span className="rule-caption">{match.matchType==='doubles'?'ダブルス':'シングルス'} <b>·</b> {match.rule.target}点 / {match.rule.gamesToWin}ゲーム先取</span></div>
 {state.winner&&<div className="result-strip" role="status"><div><strong>{match.winner?`Team ${match.winner} の勝利`:`Team ${state.winner} がゲーム獲得`}</strong><span>{match.winner?`ゲーム ${wins.A}–${wins.B}`:`GAME ${game.gameNumber} · ${state.score.A}–${state.score.B}`}</span></div><button className="primary-button" disabled={locked} onClick={()=>setPanel(match.winner?'setup':'next')}>{match.winner?'新しい試合':'次のゲームへ'}</button></div>}
 {pause&&<div className="notice"><div><strong>{pause.label} <span className="timer">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</span></strong><small>{remaining?'準備ができたら再開できます。':'休憩時間が経過しました。'}</small></div><button disabled={locked} onClick={()=>run(session.resume)}>休憩を終了</button></div>}
 {endNotice&&!pause&&<div className="notice"><span>エンドを交替しました。得点カードも左右が変わります。</span><button onClick={()=>setEndNotice(false)}>確認</button></div>}
 <ScoreCards match={match} state={state} flipped={session.prefs.flipped} disabled={!session.match||locked||!!pause||session.saveStatus==='error'} onScore={team=>run(()=>session.score(team))}/><p className="tap-hint">{state.winner?'訂正するときは「1点戻す」':pause?'休憩を終了して得点入力を再開':'得点したチームのエリアをタップ'}</p>
 <ScoreSheet match={match}/><Court match={match} state={state} flipped={session.prefs.flipped}/>
 <div className="toolbar"><button className="undo-button" disabled={!session.canUndo||locked} onClick={()=>{setEndNotice(false);run(session.undo)}}><RotateCcw/>1点戻す</button><button className="icon-button" aria-label="やり直す" title="やり直す" disabled={!session.canRedo||locked} onClick={()=>run(session.redo)}><Redo2/></button><button className="view-button" disabled={locked} onClick={()=>run(session.flip)}><ArrowLeftRight/>表示反転</button></div>
 <footer className="board-footer"><button onClick={()=>setPanel('help')}><CircleHelp size={15}/>サービス位置は選手から見た左右</button><span className="device-status">{!pwa.online?<WifiOff size={13}/>:pwa.offlineReady?<Check size={13}/>:null}{pwa.wakeLocked&&<Sun size={13}/>}</span></footer>
 </main>
 <Dialog open={panel!==null} onOpenChange={open=>{if(!open)setPanel(null)}}><DialogContent className="modal"><DialogTitle>{panel?titles[panel]:''}</DialogTitle><DialogDescription>{panel==='setup'?'開始後は得点した側をタップするだけ。':panel==='history'?'この端末に保存された試合を確認・再開できます。':panel==='next'?'サーバーとレシーバーを確認してください。':'審判の位置と、実際の試合に合わせて使用してください。'}</DialogDescription>
 {panel==='setup'&&<Setup previous={session.match??undefined} onStart={async setup=>{await session.start(setup);setEndNotice(false);setPanel(null)}}/>}
 {panel==='next'&&<NextGameSetup match={match} onStart={async(s,r)=>{await session.next(s,r);setPanel(null)}}/>}
 {panel==='history'&&<MatchHistory repo={session.repo} current={session.match} onOpen={async m=>{await session.open(m);setEndNotice(false);setPanel(null)}}/>}
 {panel==='settings'&&<div className="settings-list"><p className="form-note">{match.rule.name}：{match.rule.target}点 / {match.rule.winBy}点差 / 上限{match.rule.cap}点<br/>{match.rule.interval.at===null?'ゲーム中の休憩なし':`${match.rule.interval.at}点で${match.rule.interval.seconds}秒の休憩`} · ゲーム間{match.rule.interval.betweenGamesSeconds}秒</p><button className="secondary-button" onClick={()=>setPanel('setup')}><Plus/>新しい試合を設定</button><button className="secondary-button" onClick={()=>{run(session.flip);setPanel(null)}}><ArrowLeftRight/>表示だけを180°反転</button><button className="secondary-button" disabled={!session.match||!!state.winner} onClick={()=>setPanel('ends')}><RotateCw/>実際のエンドを交替</button><button className="secondary-button" disabled={!session.match} onClick={()=>downloadMatches([match])}><Download/>現在の試合を書き出す</button><button className="secondary-button" onClick={()=>setPanel('help')}><CircleHelp/>使い方・ホーム画面に追加</button><p className="form-note">得点ルールは試合開始時に決定します。試合中の変更はできません。</p></div>}
 {panel==='ends'&&<div><p className="form-note">選手が実際にコートの反対側へ移動した場合に使用します。サービス権とペアの右・左の担当は維持し、得点カードとコートを左右交替します。</p><div className="actions"><button className="secondary-button" onClick={()=>setPanel('settings')}>戻る</button><button className="primary-button" onClick={()=>{run(session.ends);setPanel(null)}}>エンド交替を記録</button></div></div>}
 {panel==='help'&&<div className="help-content"><p><strong>1ラリー、1タップ。</strong><br/>得点した側の大きなカードをタップします。サーブする選手を黄緑の「サーブ」、受ける選手を破線の「レシーブ」で表示します。</p><p><strong>コートの見方</strong><br/>ネットは中央の縦線です。右・左は各選手がネットを向いたときの向き。ダブルスの図はサービスコートの担当を示し、ラリー中の立ち位置を指定するものではありません。</p><p><strong>訂正とエンド交替</strong><br/>「1点戻す」で配置も含めて復元できます。次ゲームの開始直後に戻すと、前ゲームの最終得点を取り消します。エンド交替時は得点カードも移動するので、チーム名を確認してください。「表示反転」は試合状態を変更しません。</p><p><strong>ホーム画面に追加</strong><br/>iPhone：Safariの共有 →「ホーム画面に追加」。<br/>Android：Chromeのメニュー →「アプリをインストール」または「ホーム画面に追加」。</p><p><strong>オフラインと画面点灯</strong><br/>{pwa.offlineReady?'オフライン利用の準備ができています。':'初回は通信できる状態で開き、アプリの保存が完了するまでお待ちください。'}{!import.meta.env.PROD?' 開発プレビューではオフライン保存を無効にしています。':''}<br/>{pwa.wakeLocked?'画面の点灯を維持しています。':'対応端末では試合中に画面の点灯を維持します。'}</p><p><strong>試合データ</strong><br/>この端末のブラウザ内に保存します。別の端末への移行やバックアップは「試合履歴」のJSON書き出しをご利用ください。ブラウザのサイトデータを削除すると記録も消えます。</p><p className="form-note">15点制プリセット：15点・2点差・上限21点、8点で休憩。大会の要項に合わせて、開始前にルールを確認してください。</p></div>}
 </DialogContent></Dialog></div>;
}
