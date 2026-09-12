import {readFileSync,readdirSync,existsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {build,type Plugin,type ResolvedConfig} from 'vite';

export interface OssLicense {name:string;version:string;identifier:string;text:string}
const fileName='oss-licenses.json';
// CSS imports and copied shadcn components do not appear in the JavaScript module list.
const additionalPackages=['tailwindcss','tw-animate-css','shadcn','vite'];

export function readLicense(directory:string):OssLicense{
 const pkg=JSON.parse(readFileSync(path.join(directory,'package.json'),'utf8'));
 const files=readdirSync(directory,{withFileTypes:true})
  .filter(file=>file.isFile()&&/^(licen[sc]e|copying|notice|copyright)(?:$|[.-])/i.test(file.name))
  .map(file=>file.name).sort();
 if(!files.some(name=>/^(licen[sc]e|copying)/i.test(name)))throw new Error(`Missing license text: ${pkg.name}@${pkg.version}`);
 const text=files.map(name=>{
  const contents=readFileSync(path.join(directory,name),'utf8').trim();
  if(!contents)throw new Error(`Empty license or notice: ${pkg.name}/${name}`);
  return `${name}\n\n${contents}`;
 }).join('\n\n---\n\n');
 if(!pkg.name||!pkg.version||!pkg.license||!text.trim())throw new Error(`Incomplete license metadata: ${directory}`);
 return {name:pkg.name,version:pkg.version,identifier:typeof pkg.license==='string'?pkg.license:pkg.license.type,text};
}

export function collectLicenses(moduleIds:Iterable<string>,extraDirectories:string[]):OssLicense[]{
 const directories=new Set(extraDirectories.map(directory=>realpathSync(directory)));
 for(const id of moduleIds){
  if(id.startsWith('\0')||!id.replaceAll('\\','/').includes('/node_modules/'))continue;
  let directory=path.dirname(id.split('?')[0]);
  for(;;){
   const manifest=path.join(directory,'package.json');
   if(existsSync(manifest)&&JSON.parse(readFileSync(manifest,'utf8')).name){directories.add(realpathSync(directory));break;}
   const parent=path.dirname(directory);
   if(parent===directory)throw new Error(`Cannot identify bundled dependency: ${id}`);
   directory=parent;
  }
 }
 const entries=new Map<string,OssLicense>();
 for(const directory of directories){const item=readLicense(directory);entries.set(`${item.name}@${item.version}`,item);}
 return [...entries.values()].sort((a,b)=>`${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`,'en'));
}

export function ossLicenses():Plugin{
 let config:ResolvedConfig;
 return {
  name:'rally-oss-licenses',
  configResolved(value){config=value;},
  generateBundle(_options,bundle){
   const ids=Object.values(bundle).flatMap(chunk=>chunk.type==='chunk'?chunk.moduleIds:[]);
   const entries=collectLicenses(ids,additionalPackages.map(name=>path.join(config.root,'node_modules',name)));
   this.emitFile({type:'asset',fileName,source:JSON.stringify(entries,null,2)+'\n'});
  },
  configureServer(server){
   // Generate from a production bundle on demand, including on a fresh clone.
   // write:false keeps development requests from modifying the public build.
   server.middlewares.use(`/${fileName}`,async(_req,res)=>{
    try{
     const result=await build({root:config.root,configFile:config.configFile,logLevel:'error',build:{write:false}});
     const outputs=Array.isArray(result)?result:[result];
     const asset=outputs.flatMap(output=>'output' in output?output.output:[]).find(item=>item.type==='asset'&&item.fileName===fileName);
     if(!asset||asset.type!=='asset')throw new Error('License generation failed');
     res.setHeader('Content-Type','application/json; charset=utf-8');res.end(asset.source);
    }catch(error){server.config.logger.error(String(error));res.statusCode=500;res.end('License generation failed');}
   });
  },
 };
}
