import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const require=createRequire(process.env.RALLY_NODE_MODULES ? process.env.RALLY_NODE_MODULES + '/runtime.cjs' : import.meta.url);
const { chromium }=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.getByText('端末に保存済み',{exact:true}).waitFor();
const add=async t=>{await page.getByRole('button',{name:new RegExp(`Team ${t}に1点追加`)}).click();await saved();};
try{
 await page.goto('http://127.0.0.1:4180/');
 await page.getByRole('button',{name:'試合を設定',exact:true}).click();
 await page.getByRole('button',{name:'この設定で試合を開始',exact:true}).click();await saved();
 assert.equal(await page.locator('.court-player.server strong').textContent(),'A1');
 await add('A');assert.equal(await page.locator('.court-player.receiver strong').textContent(),'B2');
 await add('B');await add('B');await add('A');
 const before=await page.locator('.court').getAttribute('aria-label');
 await page.reload();await saved();assert.equal(await page.locator('.court').getAttribute('aria-label'),before);
 await page.getByRole('button',{name:'戻る',exact:true}).click();await saved();
 assert.equal(await page.locator('.court-player.server strong').textContent(),'B2');assert.equal(await page.locator('.court-player.receiver strong').textContent(),'A2');
 await page.getByRole('button',{name:'進む',exact:true}).click();await saved();assert.equal(await page.locator('.court').getAttribute('aria-label'),before);
 await page.getByRole('button',{name:'設定',exact:true}).click();assert.equal(await page.getByRole('button',{name:'表示だけを180°反転',exact:true}).count(),0);await page.getByRole('button',{name:'閉じる',exact:true}).click();await saved();assert.equal(await page.locator('.court').getAttribute('aria-label'),before);
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await context.setOffline(true);await page.reload();await saved();assert.equal(await page.locator('.court').getAttribute('aria-label'),before);
 await add('B');assert.equal(await page.locator('.court-player.server strong').textContent(),'B1');
 await page.reload();await saved();assert.equal(await page.locator('.court-player.server strong').textContent(),'B1');
 await context.setOffline(false);
 await mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/mobile.png',fullPage:true});
 const sizes=[];for(const [width,height] of [[390,844],[375,667],[360,740],[1440,1000]]){await page.setViewportSize({width,height});sizes.push(await page.evaluate(()=>({width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,undoBottom:document.querySelector('.toolbar').getBoundingClientRect().bottom})));}
 const webmcp=await page.evaluate(()=>({documentRegistry:!!document.modelContext?.registerTool,navigatorRegistry:!!navigator.modelContext?.registerTool}));
 assert.deepEqual(errors,[]);
 const result={checks:['mobile scoring','service order','Undo/Redo','reload restores IndexedDB','display rotation removed','offline launch','offline scoring and reload'],sizes,webmcp,errors};await writeFile('outputs/browser-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close()}



