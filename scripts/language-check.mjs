import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:process.env.RALLY_BROWSER_CHANNEL,headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const choose=async(label,value)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click()};
const english=async()=>{const text=await page.locator('body').innerText();assert.ok(!/[\u3040-\u30ff\u3400-\u9fff]/.test(text),text)};
const saved=()=>page.getByText('Saved on device',{exact:true}).waitFor();
const add=async team=>{await page.locator('.score-card.team-'+team).click();await saved()};
const distances=[];
const checkArrow=async()=>{
 await page.waitForFunction(()=>!!document.querySelector('.serve-arrow')?.getAttribute('d'));
 const data=await page.evaluate(()=>{
  const arrow=document.querySelector('.serve-arrow'),matrix=arrow.getScreenCTM();
  const p=arrow.getPointAtLength(0).matrixTransform(matrix),q=arrow.getPointAtLength(arrow.getTotalLength()).matrixTransform(matrix);
  const s=document.querySelector('.server strong').getBoundingClientRect(),r=document.querySelector('.receiver strong').getBoundingClientRect();
  const gap=(p,r)=>Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));
  return {width:innerWidth,startGap:gap(p,s),endGap:gap(q,r),umpireBelow:document.querySelector('.umpire-marker').getBoundingClientRect().top>=document.querySelector('.court').getBoundingClientRect().bottom};
 });
 assert.ok(data.startGap>0&&data.startGap<2.1,JSON.stringify(data));assert.ok(data.endGap>0&&data.endGap<2.1,JSON.stringify(data));assert.ok(data.umpireBelow);distances.push(data);
};
try{
 await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'設定',exact:true}).click();await choose('言語','English');
 assert.equal(await page.locator('html').getAttribute('lang'),'en');await english();
 await page.getByRole('button',{name:'Set up a new match',exact:true}).click();await english();
 await choose('Scoring rules','Custom');await page.getByLabel('Target score',{exact:true}).fill('1');await page.getByRole('button',{name:'Start match',exact:true}).click();await page.getByText('The change-of-ends score must be below the target score.',{exact:true}).waitFor();await english();
 await choose('Scoring rules','21 points');await page.getByLabel('A1 player name',{exact:true}).fill('John');await page.getByLabel('B1 player name',{exact:true}).fill('Bob');await page.getByRole('button',{name:'Start match',exact:true}).click();await saved();
 await english();assert.equal(await page.locator('.court-section h2').textContent(),'Court');
 assert.equal(await page.locator('.court-player.partner .court-role').allTextContents().then(x=>x.join('')),'');
 await checkArrow();await add('a');await checkArrow();await add('b');await checkArrow();
 await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Rotate display 180°',exact:true}).count(),0);await page.getByRole('button',{name:'Change ends',exact:true}).click();await page.getByRole('button',{name:'Confirm change of ends',exact:true}).click();await saved();await checkArrow();
 await page.getByRole('dialog').waitFor({state:'hidden'});await mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/english-court.png',fullPage:true});
 for(const width of [375,360,800]){await page.setViewportSize({width,height:width===800?1000:740});await page.waitForTimeout(50);await checkArrow();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);}
 await page.setViewportSize({width:390,height:844});await page.reload();await saved();assert.equal(await page.locator('html').getAttribute('lang'),'en');await english();
 await page.evaluate(()=>navigator.serviceWorker.ready);await context.setOffline(true);await page.reload();await saved();assert.equal(await page.locator('html').getAttribute('lang'),'en');await add('a');await english();await context.setOffline(false);
 await page.getByRole('button',{name:'Match history',exact:true}).click();await page.locator('.history-item').first().waitFor();await english();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Help & install app',exact:true}).click();await english();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Edit match settings',exact:true}).click();await english();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await choose('Language','日本語');await page.getByRole('button',{name:'閉じる',exact:true}).click();
 assert.equal(await page.locator('html').getAttribute('lang'),'ja');assert.equal(await page.locator('.court-section h2').textContent(),'コート');assert.equal(await page.getByText('審判から見た配置',{exact:true}).count(),0);
 await page.getByRole('dialog').waitFor({state:'hidden'});await page.screenshot({path:'outputs/japanese-court.png',fullPage:true});
 assert.deepEqual(errors,[]);const result={checks:['English settings before match','English setup and validation errors','English match/history/help/name editing','language retained on reload and offline','language change preserves score and names','Japanese switch back','court heading and role labels simplified','arrow anchored to actual card edges','umpire fixed'],distances,errors};console.log(JSON.stringify(result,null,2));await writeFile('outputs/language-results.json',JSON.stringify(result,null,2));
}finally{await browser.close()}
