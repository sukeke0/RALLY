import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createMatch,nextGame,scorePoint,needsEndDecision,decideEnds,changeEnds,endGame} from '../domain/engine.ts';
import {RULE_21} from '../domain/rules.ts';
const {chromium}=createRequire(process.env.RALLY_NODE_MODULES+'/runtime.cjs')('playwright');
const now='2026-09-08T05:00:00.000Z';
const points=(match,team,n)=>{for(let i=0;i<n;i++){match=scorePoint(match,team,now);if(needsEndDecision(match))match=decideEnds(match,false,now);}return match;};
let m=createMatch({matchType:'doubles',players:{A1:'John',A2:'James',B1:'Bob',B2:'Ben'},teamNames:{A:'Team A',B:'Team B'},rule:RULE_21,servingTeam:'A',server:'A1',receiver:'B1',teamASide:'left'},'summary-fixture',now);
m=points(points(m,'A',14),'B',21);m=nextGame(m,'B1','A1',now);m=points(points(points(m,'A',20),'B',20),'A',2);m=nextGame(m,'A1','B1',now);
const progress=points(points(m,'A',10),'B',8),completed=points(points(m,'A',19),'B',21);
const fixtures=[{match:completed,rows:[[14,21],[22,20],[19,21]],totals:[1,2],language:'ja',name:'completed'},
 {match:progress,rows:[[14,21],[22,20],[10,8]],totals:[1,1],language:'ja',name:'progress'},
 {match:changeEnds(progress,now),rows:[[21,14],[20,22],[8,10]],totals:[1,1],language:'en',name:'changed-ends'},
 {match:endGame(progress,{scope:'match',reason:'time-limit',winner:null,timestamp:now}),rows:[[14,21],[22,20],[10,8]],totals:[1,1],language:'en',name:'time-limit'}];
const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const fixture of fixtures){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'試合を設定',exact:true}).waitFor();assert.ok(await page.locator('.game-summary').isDisabled());
 await page.evaluate(({match,language})=>new Promise((resolve,reject)=>{localStorage.setItem('rally-language',language);const req=indexedDB.open('rally-scoreboard-v1',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction(['matches','meta'],'readwrite');tx.objectStore('matches').put(match);tx.objectStore('meta').put({matchId:match.matchId},'active');tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error)};req.onerror=()=>reject(req.error)}),fixture);
 await page.reload();await page.getByText(fixture.language==='ja'?'端末に保存済み':'Saved on device',{exact:true}).waitFor();
 assert.doesNotMatch(await page.locator('.sheet-meta').innerText(),/ラリー|rallies/i);
 await page.locator('.game-summary').click();await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByRole('dialog').getByRole('heading').textContent(),fixture.language==='ja'?'試合状況':'Match overview');
 const rows=await page.locator('.match-set-points').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('strong')].map(n=>Number(n.textContent))));assert.deepEqual(rows,fixture.rows);
 assert.deepEqual((await page.locator('.match-game-total').allTextContents()).map(Number),fixture.totals);
 assert.equal(await page.locator('.match-set-row.is-current').count(),fixture.match.status==='completed'?0:1);
 if(fixture.name==='time-limit')assert.equal(await page.locator('.match-set-ending').textContent(),'Time limit');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`outputs/match-summary-${fixture.name}.png`});
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.locator('.game-summary').focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();
 const stored=await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('rally-scoreboard-v1',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('matches'),get=tx.objectStore('matches').get('summary-fixture');get.onsuccess=()=>resolve(get.result);tx.oncomplete=()=>db.close();get.onerror=()=>reject(get.error)}}));assert.deepEqual(stored,fixture.match);assert.deepEqual(errors,[]);
 await context.close();console.log(`${fixture.name}: scores, team order, responsive layout and read-only interaction passed`);
}}finally{await browser.close()}
