import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {collectLicenses,readLicense} from '../scripts/oss-licenses.ts';

test('license collection preserves notices, nested package roots and multiple installed versions',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'rally-licenses-'));
 try{
  const dirs=['first','second'].map((name,i)=>{
   const dir=path.join(root,'node_modules',name);mkdirSync(path.join(dir,'dist'),{recursive:true});
   writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'example',version:`${i+1}.0.0`,license:'MIT'}));
   writeFileSync(path.join(dir,'dist','package.json'),JSON.stringify({type:'module'}));
   writeFileSync(path.join(dir,'LICENSE'),'Copyright Example\nFull license text');
   writeFileSync(path.join(dir,'NOTICE.txt'),'Required upstream attribution');
   return dir;
  });
  const items=collectLicenses([path.join(dirs[0],'dist','index.js'),path.join(dirs[0],'dist','other.js'),path.join(dirs[1],'dist','index.js'),'\0virtual-module',path.join(root,'app.ts')],[dirs[0]]);
  assert.deepEqual(items.map(item=>item.version),['1.0.0','2.0.0']);
  for(const item of items){assert.match(item.text,/Full license text/);assert.match(item.text,/Required upstream attribution/);}
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('missing or empty license text fails instead of silently publishing an incomplete notice',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'rally-licenses-'));
 try{
  writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'example',version:'1.0.0',license:'MIT'}));
  assert.throws(()=>readLicense(root),/Missing license text/);
  writeFileSync(path.join(root,'LICENSE'),'   ');
  assert.throws(()=>readLicense(root),/Empty license/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('the complete Lucide notice retains the inherited Feather license',()=>{
 const item=readLicense('node_modules/lucide-react');
 assert.ok(item.text.includes(readFileSync('node_modules/lucide-react/LICENSE','utf8').trim()));
 assert.match(item.text,/Feather/);assert.match(item.text,/Cole Bemis/);
});
