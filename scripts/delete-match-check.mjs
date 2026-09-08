import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:process.env.RALLY_BROWSER_CHANNEL,headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.getByText('端末に保存済み',{exact:true}).waitFor();
const choose=async(label,value)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click()};
const start=async name=>{await page.getByLabel('チームAの名前',{exact:true}).fill(name);assert.equal(await page.getByRole('button',{name:'OK',exact:true}).count(),0);await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await saved();await page.locator('.score-card.team-a').click();await saved()};
try{
 await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'試合を設定',exact:true}).click();await start('Archived A');
 await page.getByRole('button',{name:'設定',exact:true}).click();await page.getByRole('button',{name:'ゲームセット',exact:true}).click();await choose('終了する範囲','試合全体を終了');await choose('結果','Archived A の勝利');await page.getByRole('button',{name:'ゲームセットを確定',exact:true}).click();await saved();
 await page.getByRole('button',{name:'新しい試合',exact:true}).click();await start('Current A');await page.getByRole('button',{name:'試合履歴',exact:true}).click();await page.locator('.history-item').first().waitFor();assert.equal(await page.locator('.history-item').count(),2);
 const archived=page.locator('.history-item').filter({hasText:'Archived A'});await archived.getByRole('button',{name:'削除',exact:true}).click();await page.getByRole('button',{name:'キャンセル',exact:true}).click();assert.equal(await page.locator('.history-item').count(),2);
 await archived.getByRole('button',{name:'削除',exact:true}).click();await mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/delete-match-confirm.png',fullPage:true});
 // Simulate a storage failure: the transaction must roll back and preserve both matches.
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(key){const req=original.call(this,key);if(this.name==='matches'){IDBObjectStore.prototype.delete=original;req.addEventListener('success',()=>this.transaction.abort(),{once:true})}return req}});
 await page.getByRole('button',{name:'この試合を削除',exact:true}).click();await page.getByText('試合を削除できませんでした。もう一度お試しください。',{exact:true}).waitFor();assert.equal(await page.locator('.history-item').count(),2);
 await page.getByRole('button',{name:'この試合を削除',exact:true}).click();await page.getByText('試合を削除しました。',{exact:true}).waitFor();assert.equal(await page.locator('.history-item').count(),1);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();assert.equal(await page.locator('.score-card.team-a .team-name').textContent(),'Current A');assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'1');
 await page.reload();await saved();await page.getByRole('button',{name:'試合履歴',exact:true}).click();await page.locator('.history-item').first().waitFor();assert.equal(await page.locator('.history-item').count(),1);await page.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'設定',exact:true}).click();await choose('言語','English');await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Match history',exact:true}).click();await page.locator('.history-item').first().waitFor();await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByText('Delete this match and its rally history? This cannot be undone.',{exact:true}).waitFor();await page.getByRole('button',{name:'Delete this match',exact:true}).click();await page.getByText('No saved matches yet.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Set up match',exact:true}).isVisible());assert.ok(await page.getByRole('button',{name:'Back',exact:true}).isDisabled());assert.ok(await page.getByRole('button',{name:'Forward',exact:true}).isDisabled());
 await page.reload();await page.getByRole('button',{name:'Set up match',exact:true}).waitFor();assert.equal(await page.locator('.error-message').count(),0);assert.deepEqual(errors,[]);
 const result={checks:['cancel deletion','transaction failure retains results and can be retried','delete archived result without changing current score','deletion persists after reload','English confirmation','delete current match clears board and Undo/Redo','empty-history reload succeeds'],errors};console.log(JSON.stringify(result,null,2));await writeFile('outputs/delete-match-results.json',JSON.stringify(result,null,2));
}finally{await browser.close()}
