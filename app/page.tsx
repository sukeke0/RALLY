import {useI18n} from '../i18n/context';
import { useEffect,useRef,useState } from 'react';
import { X,Flag,History,Settings2,ArrowLeft,ArrowRight,CircleHelp,Download,Plus,Check,WifiOff,Sun,RotateCw } from 'lucide-react';
import { createMatch,currentState,currentGame,needsEndDecision } from '../domain/engine';
import {GameSet} from '../ui/game-set';
import {Choice} from '../ui/choice';
import type {Language} from '../i18n/messages';
import { RULE_15 } from '../domain/rules';
import { useMatch } from '../state/use-match';
import { ScoreCards } from '../ui/score-cards';
import { ScoreSheet } from '../ui/score-sheet';
import { Court } from '../ui/court';
import { Setup,NextGameSetup } from '../ui/setup';
import { MatchHistory,downloadMatches } from '../ui/history';
import { Dialog,DialogClose,DialogContent,DialogTitle,DialogDescription } from '../components/ui/dialog';
import { usePwa } from '../pwa/use-pwa';
import { registerScoreTools } from '../pwa/webmcp';
const blank=createMatch({matchType:'doubles',players:{A1:'',A2:'',B1:'',B2:''},rule:RULE_15,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'},'not-started','2026-09-07T00:00:00Z');
type Panel='edit'|'finish'|'setup'|'settings'|'history'|'help'|'next'|'ends'|null;
export default function Home(){
 const {t,language,setLanguage,languageError}=useI18n();

 const session=useMatch(),match=session.match??blank,state=currentState(match),game=currentGame(match);
 const [panel,setPanel]=useState<Panel>(null),[actionError,setActionError]=useState('');
 const pwa=usePwa(!!session.match&&match.status==='in-progress'),actions=useRef(session);actions.current=session;
 useEffect(()=>registerScoreTools({read:()=>actions.current.read(),score:async team=>{await actions.current.score(team);await new Promise(requestAnimationFrame);return actions.current.read();},undo:async()=>{await actions.current.undo();await new Promise(requestAnimationFrame);return actions.current.read();}}),[]);
 const locked=session.saveStatus==='loading'||session.saveStatus==='saving'||!session.writable;
 const pendingEnds=!!session.match&&needsEndDecision(match);
 const run=(action:()=>Promise<void>)=>{setActionError('');void action().catch(e=>setActionError((e as Error).message));};
 const titles={edit:t("試合設定を変更"),finish:t("ゲームセット"),setup:t("新しい試合"),settings:t("試合と表示の設定"),history:t("試合履歴"),help:t("RALLYの使い方"),next:t('GAME {game} の準備',{game:game.gameNumber+1}),ends:t("コートチェンジ")};
 return <div className="app-shell"><header className="app-header"><a className="brand" href="/" aria-label={t("RALLY ホーム")}><span className="brand-mark">R</span><span>RALLY<span className="brand-sub">BADMINTON SCOREBOARD</span></span></a><div className="header-actions"><span className={`local-status ${session.saveStatus==='error'?'failed':''}`} role="status"><i/>{session.saveStatus==='loading'?t("読込中"):session.saveStatus==='saving'?t("保存中"):session.saveStatus==='error'?t("未保存"):session.match?t("端末に保存済み"):t("新しい試合")}</span><button className="icon-button" aria-label={t("試合履歴")} title={t("試合履歴")} disabled={locked} onClick={()=>setPanel('history')}><History/></button><button className="icon-button" aria-label={t("設定")} title={t("設定")} disabled={locked} onClick={()=>setPanel('settings')}><Settings2/></button></div></header>
 <main className="board">
 {!session.writable&&<div className="notice" role="status">{t("別のタブで操作中です。そのタブを閉じて、こちらを再読み込みしてください。")}</div>}
 {!session.match&&session.saveStatus!=='loading'&&<div className="start-strip"><span>{t("選手とルールを設定して始めましょう")}</span><button className="primary-button" disabled={locked} onClick={()=>setPanel('setup')}><Plus/>{t("試合を設定")}</button></div>}
 {session.error&&<div className="error-message" role="alert">{t(session.error)}<div className="error-actions"><button onClick={()=>run(session.retry)}>{t("保存を再試行")}</button>{session.match&&<button onClick={()=>downloadMatches([match])}>{t("JSONを書き出す")}</button>}</div></div>}
 {actionError&&!session.error&&<div className="error-message" role="alert">{t(actionError)}<button onClick={()=>setActionError('')} className="text-button">{t("閉じる")}</button></div>}
 <div className="match-bar"><div className="game-label">GAME <strong>{game.gameNumber.toString().padStart(2,'0')}</strong><span className="live-pill"><i/>{!session.match?t("開始前"):match.status==='completed'?t("試合終了"):state.finished?t("セット終了"):t("試合中")}</span></div><span className="rule-caption">{match.matchType==='doubles'?t("ダブルス"):t("シングルス")} <b>·</b> {t('{target}点 / {games}ゲーム先取',{target:match.rule.target,games:match.rule.gamesToWin})}</span></div>
 {state.finished&&<div className={`result-strip ${match.status==='completed'?'':'next-set'}`} role="status">{match.status==='completed'&&<div><strong>{t('試合終了')}</strong></div>}<button className="primary-button" disabled={locked} onClick={()=>setPanel(match.status==='completed'?'setup':'next')}>{match.status==='completed'?t("新しい試合"):t("次のセットへ")}</button></div>}
 <ScoreCards match={match} state={state} disabled={!session.match||locked||pendingEnds||session.saveStatus==='error'} onScore={team=>run(()=>session.score(team))}/>
 <ScoreSheet match={match}/><Court match={match} state={state}/>
 <div className="toolbar"><button className="undo-button" title={t("直前の得点を取り消す")} disabled={!session.canUndo||locked} onClick={()=>{run(session.undo)}}><ArrowLeft/>{t("戻る")}</button><button className="undo-button" title={t("取り消した得点をやり直す")} disabled={!session.canRedo||locked} onClick={()=>run(session.redo)}>{t("進む")}<ArrowRight/></button></div>
 <footer className="board-footer"><button onClick={()=>setPanel('help')}><CircleHelp size={15}/>{t("サービス位置は選手から見た左右")}</button><span className="device-status">{!pwa.online?<WifiOff size={13}/>:pwa.offlineReady?<Check size={13}/>:null}{pwa.wakeLocked&&<Sun size={13}/>}</span></footer>
 </main>
 <Dialog open={pendingEnds} onOpenChange={()=>{}}><DialogContent className="modal" showCloseButton={false}><DialogTitle>{t('コートチェンジしますか？')}</DialogTitle><DialogDescription>{t('GAME {game}：{points}点',{game:game.gameNumber,points:match.rule.ends.decidingGameAt??11})}</DialogDescription>{session.error&&<div className="error-message" role="alert">{t(session.error)}<button onClick={()=>run(session.retry)}>{t('保存を再試行')}</button></div>}<div className="actions"><button className="primary-button" disabled={locked||session.saveStatus==='error'} onClick={()=>run(()=>session.decideEnds(true))}>Yes</button><button className="secondary-button" disabled={locked||session.saveStatus==='error'} onClick={()=>run(()=>session.decideEnds(false))}>No</button></div></DialogContent></Dialog>
 <Dialog open={panel!==null&&!pendingEnds} onOpenChange={open=>{if(!open)setPanel(null)}}><DialogContent className="modal" showCloseButton={false}><DialogClose render={<button className="modal-close icon-button" aria-label={t("閉じる")}/> }><X/></DialogClose><DialogTitle>{panel?titles[panel]:''}</DialogTitle>{!['settings','help','ends'].includes(panel??'')&&<DialogDescription>{panel==='edit'?t('現在の試合の設定を修正します。'):panel==='finish'?t('棄権や時間切れなどによる途中終了を記録します。'):panel==='setup'?t("開始後は得点した側をタップするだけ。"):panel==='history'?t("この端末に保存された試合を確認・再開できます。"):panel==='next'?t("サーバーとレシーバーを確認してください。"):null}</DialogDescription>}
 {panel==='setup'&&<Setup previous={session.match??undefined} onStart={async setup=>{await session.start(setup);setPanel(null)}}/>}
 {panel==='edit'&&<Setup key="edit" previous={match} editing onStart={async setup=>{await session.revise(setup);setPanel(null)}}/>}
 {panel==='finish'&&<GameSet match={match} onFinish={async ending=>{await session.finish(ending);setPanel(null)}}/>}
 {panel==='next'&&<NextGameSetup match={match} onStart={async(s,r)=>{await session.next(s,r);setPanel(null)}}/>}
 {panel==='history'&&<MatchHistory repo={session.repo} current={session.match} onDelete={async id=>{await session.remove(id)}} onOpen={async m=>{await session.open(m);setPanel(null)}}/>}
 {panel==='settings'&&<div className="settings-list"><Choice label={t("言語")} value={language} options={[{value:"ja",label:"日本語"},{value:"en",label:"English"}]} onChange={value=>setLanguage(value as Language)}/>{languageError&&<p className="error-message" role="alert">{t("言語設定を保存できませんでした。")}</p>}<p className="form-note">{t('{name}：{target}点 / {margin}点差 / 上限{cap}点',{name:t(match.rule.name),target:match.rule.target,margin:match.rule.winBy,cap:match.rule.cap})}</p><button className="secondary-button" disabled={!session.match} onClick={()=>setPanel('edit')}><Settings2/>{t("試合設定を変更")}</button><button className="secondary-button" onClick={()=>setPanel('setup')}><Plus/>{t("新しい試合を設定")}</button><button className="secondary-button" disabled={!session.match||state.finished} onClick={()=>setPanel('ends')}><RotateCw/>{t("コートチェンジ")}</button><button className="secondary-button" disabled={!session.match||state.finished} onClick={()=>setPanel('finish')}><Flag/>{t("ゲームセット")}</button><button className="secondary-button" disabled={!session.match} onClick={()=>downloadMatches([match])}><Download/>{t("現在の試合を書き出す")}</button><button className="secondary-button" onClick={()=>setPanel('help')}><CircleHelp/>{t("使い方・ホーム画面に追加")}</button></div>}
 {panel==='ends'&&<div><p className="form-note">{t("選手が実際にコートの反対側へ移動した場合に使用します。サービス権とペアの右・左の担当は維持し、得点カードとコートを左右交替します。")}</p><div className="actions"><button className="secondary-button" onClick={()=>setPanel('settings')}>{t("戻る")}</button><button className="primary-button" onClick={()=>{run(session.ends);setPanel(null)}}>{t("コートチェンジする")}</button></div></div>}
 {panel==='help'&&<div className="help-content"><p><strong>{t("1ラリー、1タップ。")}</strong><br/>{t("得点した側の大きなカードをタップします。サーブする選手を黄緑の「サーブ」、受ける選手を破線の「レシーブ」で表示します。")}</p><p><strong>{t("コートの見方")}</strong><br/>{t("ネットは中央の縦線です。右・左は各選手がネットを向いたときの向き。ダブルスの図はサービスコートの担当を示し、ラリー中の立ち位置を指定するものではありません。")}</p><p><strong>{t("訂正とエンド交替")}</strong><br/>{t("「戻る」で配置も含めて復元できます。次ゲームの開始直後に戻すと、前ゲームの最終得点を取り消します。エンド交替時は得点カードも移動するので、チーム名を確認してください。「進む」で取り消した得点をやり直します。審判の表示は常にコート中央の下側です。")}</p><p><strong>{t("ホーム画面に追加")}</strong><br/>{t("iPhone：Safariの共有 →「ホーム画面に追加」。")}<br/>{t("Android：Chromeのメニュー →「アプリをインストール」または「ホーム画面に追加」。")}</p><p><strong>{t("オフラインと画面点灯")}</strong><br/>{pwa.offlineReady?t("オフライン利用の準備ができています。"):t("初回は通信できる状態で開き、アプリの保存が完了するまでお待ちください。")}{!import.meta.env.PROD?t(" 開発プレビューではオフライン保存を無効にしています。"):''}<br/>{pwa.wakeLocked?t("画面の点灯を維持しています。"):t("対応端末では試合中に画面の点灯を維持します。")}</p><p><strong>{t("試合データ")}</strong><br/>{t("この端末のブラウザ内に保存します。別の端末への移行やバックアップは「試合履歴」のJSON書き出しをご利用ください。ブラウザのサイトデータを削除すると記録も消えます。")}</p><p className="form-note">{t("15点制プリセット：15点・2点差・上限21点。大会の要項に合わせて、開始前にルールを確認してください。")}</p></div>}
 </DialogContent></Dialog></div>;
}
