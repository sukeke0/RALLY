import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:process.env.RALLY_BROWSER_CHANNEL,headless:true});
const context=await browser.newContext({locale:'ja-JP',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.getByText('端末に保存済み',{exact:true}).waitFor();
const score=async t=>{await page.locator(`.score-card.team-${t}`).click();await saved()};
const edit=async()=>{await page.getByRole('button',{name:'設定',exact:true}).click();await page.getByRole('button',{name:'試合設定を変更',exact:true}).click()};
const umpire=async()=>assert.ok(await page.evaluate(()=>document.querySelector('.umpire-marker').getBoundingClientRect().top>=document.querySelector('.court').getBoundingClientRect().bottom));
try{
 await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'試合を設定',exact:true}).click();
 await page.getByLabel('チームAの名前',{exact:true}).fill('青空クラブ');await page.getByLabel('チームBの名前',{exact:true}).fill('レッドスター');
 await page.getByLabel('A1 選手名',{exact:true}).fill('John');await page.getByLabel('B1 選手名',{exact:true}).fill('Bob');
 await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await saved();
 await score('a');await score('b');await page.getByRole('button',{name:'戻る',exact:true}).click();await saved();
 const before=await page.locator('.court').getAttribute('aria-label');
 await edit();await page.getByLabel('チームAの名前',{exact:true}).fill('テスト変更');await page.getByRole('button',{name:'閉じる',exact:true}).click();assert.equal(await page.locator('.team-a .team-name').textContent(),'青空クラブ');
 await edit();await page.getByLabel('チームAの名前',{exact:true}).fill('ブルースター');await page.getByLabel('A1 選手名',{exact:true}).fill('James');await page.getByRole('button',{name:'変更を保存',exact:true}).click();await saved();
 assert.equal(await page.locator('.team-a .score-number').textContent(),'1');assert.equal(await page.locator('.team-b .score-number').textContent(),'0');
 assert.equal(await page.locator('.court-player.server strong').textContent(),'James');
 assert.equal(await page.locator('.team-a .team-name').textContent(),'ブルースター');
 assert.ok(await page.getByRole('button',{name:'進む',exact:true}).isDisabled());await score('b');assert.equal(await page.locator('.team-b .score-number').textContent(),'1');assert.equal(await page.locator('.team-a .player-names').textContent(),'James / A2');
 await page.reload();await saved();assert.equal(await page.locator('.team-a .team-name').textContent(),'ブルースター');assert.equal(await page.locator('.team-a .player-names').textContent(),'James / A2');
 assert.equal(await page.getByText('NEXT SERVE',{exact:true}).count(),0);assert.equal(await page.locator('.toolbar button').count(),2);assert.equal(await page.getByRole('button',{name:'表示反転',exact:true}).count(),0);
 await page.getByRole('button',{name:'設定',exact:true}).click();await page.getByRole('button',{name:'コートチェンジ',exact:true}).click();await page.getByRole('button',{name:'コートチェンジする',exact:true}).click();await saved();await umpire();
 assert.equal(await page.getByText('エンドを交替しました。得点カードも左右が変わります。',{exact:true}).count(),0);await page.reload();await saved();assert.equal(await page.getByText('エンドを交替しました。得点カードも左右が変わります。',{exact:true}).count(),0);
 assert.equal(await page.locator('.serve-arrow').getAttribute('marker-end'),'url(#serve-arrow-head)');
 const court=await page.locator('.court').boundingBox();const arrow=await page.locator('.serve-arrow').boundingBox();assert.ok(arrow.width>0&&arrow.x>court.x&&arrow.x+arrow.width<court.x+court.width);
 assert.equal(await page.locator('[data-slot=table-container]').evaluate(el=>el.scrollLeft),0);
 await mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/revised-mobile.png',fullPage:true});
 const sizes=[];for(const [width,height]of [[390,844],[375,667]]){await page.setViewportSize({width,height});const size=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,toolbarBottom:document.querySelector('.toolbar').getBoundingClientRect().bottom}));assert.ok(size.toolbarBottom<=height);assert.equal(size.scrollWidth,width);sizes.push(size)}
 assert.deepEqual(errors,[]);const result={checks:['team/player names at setup','cancel edit','in-match rename','scores and server preserved','settings edit clears pending Redo','reload retains names','two navigation buttons only','NEXT SERVE removed','umpire fixed across court change','visible arrow marker'],sizes,errors};await writeFile('outputs/name-edit-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close()}

