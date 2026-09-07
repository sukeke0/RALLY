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
 await page.getByLabel('A1',{exact:true}).fill('田中');await page.getByLabel('B2',{exact:true}).fill('伊藤');
 await choose('最初のサーバー','A2');await choose('最初のレシーバー','伊藤');
 await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await saved();
 assert.equal(await page.locator('.court-player.server strong').textContent(),'A2');assert.equal(await page.locator('.court-player.receiver strong').textContent(),'伊藤');
 for(let i=0;i<11;i++)await add('A');
 assert.ok(await page.getByRole('button',{name:/Team Aに1点追加/}).isDisabled());assert.ok(await page.getByText('休憩中',{exact:true}).isVisible());
 await page.reload();await saved();assert.ok(await page.getByText('休憩中',{exact:true}).isVisible());
 await page.getByRole('button',{name:'休憩を終了',exact:true}).click();await saved();
 for(let i=0;i<10;i++)await add('A');
 assert.ok(await page.getByRole('button',{name:/Team Bに1点追加/}).isDisabled());
 await page.getByRole('button',{name:'次のゲームへ',exact:true}).click();
 await choose('最初のサーバー','田中');await choose('最初のレシーバー','B1');
 await page.getByRole('button',{name:'GAME 2 を開始',exact:true}).click();await saved();
 assert.equal(await page.locator('.court-player.server strong').textContent(),'田中');
 assert.equal(await page.locator('.score-card').first().getAttribute('class'),'score-card team-b');
 await page.getByRole('button',{name:'戻る',exact:true}).click();await saved();
 assert.equal(await page.locator('.score-card.team-a .score-number').textContent(),'20');assert.equal(await page.locator('.court-player.server strong').textContent(),'A2');
 await page.getByRole('button',{name:'設定',exact:true}).click();await page.getByRole('button',{name:'新しい試合を設定',exact:true}).click();
 await choose('種目','シングルス');await choose('得点ルール','15点制');
 await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await saved();
 assert.equal(await page.locator('.court-player').count(),2);
 for(let i=0;i<8;i++)await add('B');await page.getByRole('button',{name:'休憩を終了',exact:true}).click();await saved();for(let i=0;i<7;i++)await add('B');
 assert.ok(await page.getByText('Team B がゲーム獲得',{exact:true}).isVisible());
 await page.getByRole('button',{name:'試合履歴',exact:true}).click();await page.locator('.history-item').first().waitFor();assert.equal(await page.locator('.history-item').count(),2);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'全試合を書き出す',exact:true}).click();const download=await downloadPromise;await download.saveAs('outputs/test-export.json');
 await page.locator('input[type=file]').setInputFiles('outputs/test-export.json');await page.getByText('2件の試合をコピーとして保存しました。',{exact:true}).waitFor();assert.equal(await page.locator('.history-item').count(),4);
 const checks=['custom player selection','interval input lock','interval reload','automatic game end','next game reselect and ends','Undo across games','singles 15 point game','history persistence','JSON export/import'];assert.deepEqual(errors,[]);
 await writeFile('outputs/game-flow-results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close()}



