import type { Team } from '../domain/model.ts';
type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown|Promise<unknown>};
type Context={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export function registerScoreTools(actions:{read:()=>unknown;score:(team:Team)=>Promise<unknown>;undo:()=>Promise<unknown>},context?:Context){
 const ctx=context??(typeof document!=='undefined'?(document as Document&{modelContext?:Context}).modelContext:undefined);
 if(!ctx?.registerTool)return()=>{};
 const lifecycle=new AbortController();
 const tools:Tool[]=[
  {name:'read_match',title:'現在の試合を確認',description:'Read score, server, receiver and court positions without modifying the match.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>actions.read()},
  {name:'record_rally',title:'1ラリーの得点を記録',description:'Add one point to the rally winner in the active match, update the visible scoreboard, and save on this device. Fails after game end.',inputSchema:{type:'object',properties:{winner:{type:'string',enum:['A','B']}},required:['winner'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{const x=input as {winner:Team};if(!x||!['A','B'].includes(x.winner)||Object.keys(x).some(k=>k!=='winner'))throw new Error('winner must be A or B');return actions.score(x.winner)}},
  {name:'undo_rally',title:'1点戻す',description:'Undo the last rally and restore score, service order, courts and game status. Save the restored match on this device.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:()=>actions.undo()},
 ];
 for(const tool of tools){try{void Promise.resolve(ctx.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Unsupported experimental registry does not affect scoring. */}}
 return()=>lifecycle.abort();
}
