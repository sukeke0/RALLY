import test from 'node:test';
import assert from 'node:assert/strict';
import {connectRectangles,type Rect} from '../ui/court-geometry.ts';
test('arrow follows the measured player-card edges in every serve direction',()=>{
 for(const x of [-1,1])for(const y of [-1,1]){
  const a:Rect={left:200,top:200,width:100,height:30},b:Rect={left:200+x*200,top:200+y*90,width:100,height:30};
  const p=connectRectangles(a,b,2),reversed=connectRectangles(b,a,2);
  assert.deepEqual(p.start,reversed.end);assert.deepEqual(p.end,reversed.start);
  const distanceToEdge=(p:{x:number;y:number},r:Rect)=>Math.hypot(Math.max(r.left-p.x,0,p.x-r.left-r.width),Math.max(r.top-p.y,0,p.y-r.top-r.height));
  assert.ok(distanceToEdge(p.start,a)>0&&distanceToEdge(p.start,a)<=2.01);
  assert.ok(distanceToEdge(p.end,b)>0&&distanceToEdge(p.end,b)<=2.01);
 }
});
test('horizontal and vertical arrow endpoints remain just outside cards',()=>{
 assert.deepEqual(connectRectangles({left:0,top:0,width:100,height:40},{left:200,top:0,width:100,height:40}),{start:{x:102,y:20},end:{x:198,y:20}});
 assert.deepEqual(connectRectangles({left:0,top:0,width:100,height:40},{left:0,top:100,width:100,height:40}),{start:{x:50,y:42},end:{x:50,y:98}});
});
