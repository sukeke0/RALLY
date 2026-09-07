import { useId } from 'react';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '../components/ui/select';
export function Choice({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}){
 const id=useId();return <div className="field"><label id={id}>{label}</label><Select value={value} onValueChange={v=>{if(v!==null)onChange(v)}} items={options}><SelectTrigger aria-labelledby={id} className="choice-trigger"><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
}
