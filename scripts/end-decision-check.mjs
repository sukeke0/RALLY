import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createMatch,nextGame,scorePoint} from '../domain/engine.ts';
import {RULE_21,RULE_15} from '../domain/rules.ts';
const require=createRequire(process.env.RALLY_NODE_MODULES+'/runtime.cjs');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const now='2026-09-08T04:00:00.000Z';
function fixture(team,rule){
 let m=createMatch({matchType:'doubles',players:{A1:'John',A2:'James',B1:'Bob',B2:'Ben'},rule,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'},crypto.randomUUID(),now);
 for(let i=0;i<rule.target;i++)m=scorePoint(m,'A',now);
 m=nextGame(m,'A1','B1',now);
 for(let i=0;i<rule.target;i++)m=scorePoint(m,'B',now);
 m=nextGame(m,'B2','A2',now);
 for(let i=0;i<rule.ends.decidingGameAt-1;i++)m=scorePoint(m,team,now);
 return m;
}
try{
 for(const rule of [RULE_15,RULE_21])for(const [language,team,answer] of [['ja','A','Yes'],['en','B','No']]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'試合を設定',exact:true}).waitFor();
  await page.evaluate(({match,language})=>new Promise((resolve,reject)=>{
   localStorage.setItem('rally-language',language);
   const req=indexedDB.open('rally-scoreboard-v1',1);
   req.onsuccess=()=>{const db=req.result,tx=db.transaction(['matches','meta'],'readwrite');tx.objectStore('matches').put(match);tx.objectStore('meta').put({matchId:match.matchId},'active');tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error);};req.onerror=()=>reject(req.error);
  }),{match:fixture(team,rule),language});
  const saved=()=>page.locator('.local-status').filter({hasText:language==='ja'?'端末に保存済み':'Saved on device'}).waitFor();
  const card=()=>page.locator(`.score-card.team-${team.toLowerCase()}`);
  const left=()=>page.locator('.score-card').first().getAttribute('class');
  await page.reload();await saved();const before=await left();
  assert.equal(await page.getByRole('dialog').count(),0);
  await card().click();await saved();
  const modal=page.getByRole('dialog');await modal.waitFor();
  assert.equal(await modal.getByRole('heading').textContent(),language==='ja'?'コートチェンジしますか？':'Change ends?');
  assert.equal(await left(),before);assert.ok(await card().isDisabled());
  await page.keyboard.press('Escape');assert.ok(await modal.isVisible());
  await page.screenshot({path:`outputs/end-decision-${rule.id}-${language}.png`});
  await page.reload();await saved();await modal.waitFor();
  await modal.getByRole('button',{name:answer,exact:true}).click();await saved();await modal.waitFor({state:'hidden'});
  assert.equal((await left())===before,answer==='No');
  const after=await left();await page.reload();await saved();assert.equal(await modal.count(),0);assert.equal(await left(),after);
  await page.getByRole('button',{name:language==='ja'?'戻る':'Back',exact:true}).click();await saved();assert.equal(await left(),before);assert.equal(await card().locator('.score-number').textContent(),String(rule.ends.decidingGameAt-1));
  await page.getByRole('button',{name:language==='ja'?'進む':'Forward',exact:true}).click();await saved();assert.equal(await left(),after);assert.equal(await modal.count(),0);
  await page.getByRole('button',{name:language==='ja'?'戻る':'Back',exact:true}).click();await saved();await card().click();await saved();await modal.waitFor();
  await modal.getByRole('button',{name:answer==='Yes'?'No':'Yes',exact:true}).click();await saved();await modal.waitFor({state:'hidden'});
  await card().click();await saved();assert.equal(await modal.count(),0);
  assert.equal(await page.locator('.first-server-flag').count(),2);assert.deepEqual(errors,[]);
  await context.close();console.log(`${rule.id}-point ${language}: ${answer}, pending reload, saved answer, Undo/Redo and alternate answer passed`);
 }
}finally{await browser.close()}
