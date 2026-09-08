import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require=createRequire(process.env.RALLY_NODE_MODULES ? process.env.RALLY_NODE_MODULES + '/runtime.cjs' : import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.getByText('端末に保存済み',{exact:true}).waitFor();
const add=async t=>{await page.getByRole('button',{name:new RegExp(`Team ${t}に1点追加`)}).click();await saved();};
const choose=async(label,text)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:text,exact:true}).click();};
try{
 await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'試合を設定',exact:true}).click();
 assert.equal(await page.getByRole('combobox',{name:'得点ルール',exact:true}).textContent(),'15点制▼');
 await choose('得点ルール','21点制');
 await page.getByLabel('A1 選手名',{exact:true}).fill('田中');await page.getByLabel('B2 選手名',{exact:true}).fill('伊藤');
 await choose('最初のサーバー','A2');await choose('最初のレシーバー','伊藤');
 await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await saved();
 assert.equal(await page.locator('.court-player.server strong').textContent(),'A2');assert.equal(await page.locator('.court-player.receiver strong').textContent(),'伊藤');
 for(let i=0;i<11;i++)await add('A');
 assert.ok(await page.getByRole('button',{name:/Team Aに1点追加/}).isEnabled());assert.equal(await page.getByText('休憩中',{exact:true}).count(),0);
 // Recreate an active interval saved by the previous app version.
 await page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('rally-scoreboard-v1');req.onerror=()=>reject(req.error);req.onsuccess=()=>{
   const db=req.result,tx=db.transaction(['meta','matches'],'readwrite'),meta=tx.objectStore('meta'),matches=tx.objectStore('matches');
   const active=meta.get('active');active.onsuccess=()=>{const prefs=active.result;meta.put({...prefs,pause:{key:'legacy',until:Date.now()+60000,label:'インターバル'}},'active');const saved=matches.get(prefs.matchId);saved.onsuccess=()=>{const match=saved.result;match.rule.interval={at:11,seconds:60,betweenGamesSeconds:120};matches.put(match)}};
   tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);
  };
 }));
 await page.reload();await saved();assert.ok(await page.getByRole('button',{name:/Team Aに1点追加/}).isEnabled());
 for(let i=0;i<10;i++)await add('A');
 assert.ok(await page.getByRole('button',{name:/Team Bに1点追加/}).isDisabled());
 await page.getByRole('button',{name:'次のセットへ',exact:true}).click();
 await choose('最初のサーバー','田中');await choose('最初のレシーバー','B1');
 await page.getByRole('button',{name:'GAME 2 を開始',exact:true}).click();await saved();
 assert.equal(await page.locator('.court-player.server strong').textContent(),'田中');
 assert.equal(await page.locator('.score-card').first().getAttribute('class'),'score-card team-b');
 await page.getByRole('button',{name:'戻る',exact:true}).click();await saved();
 assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'20');assert.equal(await page.locator('.court-player.server strong').textContent(),'A2');
 await page.getByRole('button',{name:'設定',exact:true}).click();await page.getByRole('button',{name:'新しい試合を設定',exact:true}).click();
 const replaceWarning=page.getByText('新しい試合を開始すると、現在の試合と得点履歴は削除されます。元に戻せません。',{exact:true});
 await replaceWarning.waitFor();assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'20');
 assert.equal(await page.getByRole('combobox',{name:'種目',exact:true}).count(),0);
 assert.deepEqual(await page.getByRole('dialog').locator('.actions button').allTextContents(),['OK','キャンセル']);
 assert.ok((await page.getByRole('button',{name:'OK',exact:true}).boundingBox()).x<(await page.getByRole('button',{name:'キャンセル',exact:true}).boundingBox()).x);
 await page.screenshot({path:'outputs/new-match-entry-warning.png'});
 await page.getByRole('button',{name:'キャンセル',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'20');
 await page.getByRole('button',{name:'設定',exact:true}).click();await page.getByRole('button',{name:'新しい試合を設定',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).click();
 await choose('種目','シングルス');assert.equal(await page.getByRole('combobox',{name:'得点ルール',exact:true}).textContent(),'15点制▼');
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.reload();await saved();assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'20');
 await page.getByRole('button',{name:'設定',exact:true}).click();assert.equal(await page.getByRole('button',{name:'現在の試合を破棄',exact:true}).count(),0);await page.getByRole('button',{name:'新しい試合を設定',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).click();await choose('種目','シングルス');
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){const req=original.call(this,value,key);if(this.name==='matches'){IDBObjectStore.prototype.put=original;req.addEventListener('success',()=>this.transaction.abort(),{once:true})}return req}});
 await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await page.getByText('新しい試合を保存できませんでした。現在の試合は保持されています。',{exact:true}).waitFor();assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'20');
 await page.screenshot({path:'outputs/replace-match-warning.png'});
 await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await saved();await page.getByRole('dialog').waitFor({state:'hidden'});await page.reload();await saved();assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'0');
 assert.equal(await page.locator('.court-player').count(),2);
 for(let i=0;i<8;i++)await add('B');for(let i=0;i<7;i++)await add('B');
 assert.ok(await page.getByRole('button',{name:'次のセットへ',exact:true}).isVisible());
 await page.getByRole('button',{name:'試合履歴',exact:true}).click();await page.locator('.history-item').first().waitFor();assert.equal(await page.locator('.history-item').count(),1);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'全試合を書き出す',exact:true}).click();const download=await downloadPromise;await download.saveAs('outputs/test-export.json');
 await page.locator('input[type=file]').setInputFiles('outputs/test-export.json');await page.getByText('1件の試合をコピーとして保存しました。',{exact:true}).waitFor();assert.equal(await page.locator('.history-item').count(),2);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByRole('button',{name:'設定',exact:true}).click();await choose('言語','English');await page.getByRole('button',{name:'Set up a new match',exact:true}).click();
 await page.getByText('Starting a new match deletes the current match and its rally history. This cannot be undone.',{exact:true}).waitFor();assert.deepEqual(await page.getByRole('dialog').locator('.actions button').allTextContents(),['OK','Cancel']);await page.getByRole('button',{name:'OK',exact:true}).click();await page.getByRole('button',{name:'Start match',exact:true}).click();await page.getByText('Saved on device',{exact:true}).waitFor();await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.ok(await page.getByRole('button',{name:'Back',exact:true}).isDisabled());assert.ok(await page.getByRole('button',{name:'Forward',exact:true}).isDisabled());
 await page.getByRole('button',{name:'Match history',exact:true}).click();await page.locator('.history-item').first().waitFor();assert.equal(await page.locator('.history-item').count(),2);
 const checks=['custom player selection','continuous scoring past 11','reload without pause','automatic game end','next game reselect and ends','Undo across games','singles 15 point game','history persistence','JSON export/import'];assert.deepEqual(errors,[]);
 await writeFile('outputs/game-flow-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close()}



