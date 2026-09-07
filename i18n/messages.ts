import english from './en.json' with {type:'json'};
export type Language = 'ja' | 'en';
export type Params = Record<string,string|number>;
export const translations:Record<string,string> = english;
export function translate(language:Language,key:string,params:Params={}):string{
 const text=language==='en'?(translations[key]??key):key;
 return text.replace(/\{(\w+)\}/g,(match,name)=>Object.prototype.hasOwnProperty.call(params,name)?String(params[name]):match);
}
export function loadLanguage(storage?:Pick<Storage,'getItem'>):Language{
 try{return storage?.getItem('rally-language')==='en'?'en':'ja';}catch{return 'ja';}
}
