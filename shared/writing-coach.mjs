export const method = 'median-guide-v1';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function makeGuides(medians){
 const points=medians.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=.76/Math.max(maxX-minX,maxY-minY,1);
 return medians.map(stroke=>stroke.map(([x,y])=>[(x-(minX+maxX)/2)*scale+.5,((minY+maxY)/2-y)*scale+.5]));
}
export function length(points){let value=0;for(let i=1;i<points.length;i++)value+=distance(points[i-1],points[i]);return value;}
function resample(points,count=24){
 const total=length(points),result=[];if(!total)return Array.from({length:count},()=>points[0]);
 let segment=1,travelled=0;
 for(let i=0;i<count;i++){
  const target=total*i/(count-1);
  while(segment<points.length-1&&travelled+distance(points[segment-1],points[segment])<target){travelled+=distance(points[segment-1],points[segment]);segment++;}
  const a=points[segment-1],b=points[segment],t=Math.max(0,Math.min(1,(target-travelled)/(distance(a,b)||1)));
  result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
 }return result;
}
function nearest(point,guide){let best=Infinity;for(let i=1;i<guide.length;i++){const a=guide[i-1],b=guide[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,distance(point,[a[0]+t*dx,a[1]+t*dy]));}return best;}
export function liveHint(points,guide){
 if(!points.length)return '从亮起来的起点开始，慢慢写。';
 if(nearest(points[points.length-1],guide)>.12)return '靠近灰色参考线一点点，我们慢慢来。';
 return '顺着参考线，慢慢把这一笔写完整。';
}
export function analyzeStroke(points,guide){
 const travelled=length(points),expected=length(guide);
 if(points.length<2||travelled<.025)return {passed:false,message:'慢慢画出这一笔，我们一起试试。',deviation:1};
 const start=distance(points[0],guide[0]),end=distance(points[points.length-1],guide[guide.length-1]);
 if(start>.15)return {passed:false,message:'试试从亮起来的起点出发，好吗？',deviation:start};
 const a=resample(points),b=resample(guide),deviation=a.reduce((sum,p,i)=>sum+distance(p,b[i]),0)/a.length;
 if(travelled<expected*.55||end>.16)return {passed:false,message:'这一笔再写完整一点，慢慢走到终点吧。',deviation};
 if(travelled>expected*1.9||deviation>.07){
  const horizontal=Math.abs(guide[0][1]-guide[guide.length-1][1])<.12;
  return {passed:false,message:horizontal?'再试一次，让这一横更平稳一点？':'再试一次，沿着参考线慢慢走，好吗？',deviation};
 }
 return {passed:true,message:'这一笔完成啦，接着写下一笔吧。',deviation};
}
export function analyzeCharacter(strokes,guides){
 if(strokes.length!==guides.length)return {passed:false,message:'我们按顺序，一笔一笔写完整。',method,deviation:1};
 const results=strokes.map((s,i)=>analyzeStroke(s,guides[i])),first=results.find(r=>!r.passed);
 return {passed:!first,message:first?.message||'这一遍认真写完啦，为你点亮一颗星！',method,deviation:results.reduce((n,r)=>n+r.deviation,0)/results.length};
}
