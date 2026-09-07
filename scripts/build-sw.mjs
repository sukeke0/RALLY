import { readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist');
async function walk(dir){const list=[];for(const entry of await readdir(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);if(entry.isDirectory())list.push(...await walk(target));else if(entry.name!=='sw.js')list.push(target);}return list;}
const files=await walk(root),hash=createHash('sha256');
for(const f of files.sort())hash.update(await readFile(f));
const version=hash.digest('hex').slice(0,16),assets=files.map(f=>'/'+path.relative(root,f).replaceAll('\\','/'));
const code=`// Generated from the complete production bundle. Never caches unrelated requests.
const CACHE='rally-${version}';
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.all(ASSETS.map(async url=>{const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));if(!response.ok||response.redirected)throw new Error('Cannot cache app shell');if(url==='/index.html'&&!(await response.clone().text()).includes('id="root"'))throw new Error('Unexpected app shell');await cache.put(url,response);}));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('rally-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){event.respondWith(caches.open(CACHE).then(cache=>cache.match('/index.html')).then(cached=>cached||fetch(event.request)));return;}
 if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(event.request)));
});
`;
await writeFile(path.join(root,'sw.js'),code);console.log(`Offline app shell: ${assets.length} files, cache ${version}`);
