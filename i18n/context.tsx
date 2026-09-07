import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {loadLanguage,translate,type Language,type Params} from './messages';
interface I18n {language:Language;locale:string;t:(text:string,params?:Params)=>string;setLanguage:(language:Language)=>void;languageError:boolean}
const LanguageContext=createContext<I18n|null>(null);
export function LanguageProvider({children}:{children:ReactNode}){
 const [language,updateLanguage]=useState<Language>(()=>{try{return loadLanguage(window.localStorage)}catch{return 'ja'}}),[languageError,setLanguageError]=useState(false);
 useEffect(()=>{document.documentElement.lang=language;document.title=language==='en'?'RALLY | Badminton scoreboard':'RALLY｜バドミントンスコアボード';},[language]);
 function setLanguage(next:Language){updateLanguage(next);try{window.localStorage.setItem('rally-language',next);setLanguageError(false)}catch{setLanguageError(true)}}
 return <LanguageContext.Provider value={{language,locale:language==='en'?'en-US':'ja-JP',t:(text,params)=>translate(language,text,params),setLanguage,languageError}}>{children}</LanguageContext.Provider>;
}
export function useI18n(){const value=useContext(LanguageContext);if(!value)throw new Error('LanguageProvider is required');return value;}
