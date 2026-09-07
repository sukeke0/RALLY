import test from 'node:test';
import assert from 'node:assert/strict';
import { registerScoreTools } from '../pwa/webmcp.ts';
test('WebMCP contract uses shared actions, validates rally winner, and cleans up',async()=>{
 const registered=new Map<string,any>();let score=0;let signal:AbortSignal|undefined;
 const dispose=registerScoreTools({read:()=>({score}),score:async team=>({score:++score,team}),undo:async()=>({score:--score})},{registerTool:(tool,options)=>{registered.set(tool.name,tool);signal=options.signal;}});
 assert.equal(registered.size,3);assert.equal(registered.get('read_match').annotations.readOnlyHint,true);
 assert.deepEqual(await registered.get('record_rally').execute({winner:'B'}),{score:1,team:'B'});
 assert.throws(()=>registered.get('record_rally').execute({winner:'C'}));assert.equal(score,1);
 assert.deepEqual(await registered.get('undo_rally').execute({}),{score:0});dispose();assert.ok(signal!.aborted);
});
