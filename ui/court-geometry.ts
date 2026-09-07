export interface Rect {left:number;top:number;width:number;height:number}
export interface Point {x:number;y:number}
export function connectRectangles(source:Rect,target:Rect,gap=2):{start:Point;end:Point}{
 const a={x:source.left+source.width/2,y:source.top+source.height/2},b={x:target.left+target.width/2,y:target.top+target.height/2};
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
 if(length===0)return {start:a,end:b};
 const edge=(rect:Rect)=>Math.min(dx===0?Infinity:rect.width/2/Math.abs(dx),dy===0?Infinity:rect.height/2/Math.abs(dy));
 const from=edge(source)+gap/length,to=edge(target)+gap/length;
 return {start:{x:a.x+dx*from,y:a.y+dy*from},end:{x:b.x-dx*to,y:b.y-dy*to}};
}
