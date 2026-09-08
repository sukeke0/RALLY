import english from './en.json' with {type:'json'};
export type Language = 'ja' | 'en';
export type Params = Record<string,string|number>;
export const translations:Record<string,string> = english;
export function translate(language:Language,key:string,params:Params={}):string{
 const text=language==='en'?(translations[key]??key):key;
 return text.replace(/\{(\w+)\}/g,(match,name)=>Object.prototype.hasOwnProperty.call(params,name)?String(params[name]):match);
}
export function loadLanguage(storage?:Pick<Storage,'getItem'>,browserLanguage?:string):Language{
 try{const saved=storage?.getItem('rally-language');if(saved==='ja'||saved==='en')return saved;}catch{/* Use the browser language when storage is unavailable. */}
 return /^ja(?:-|$)/i.test(browserLanguage??'')?'ja':'en';
}
