(function(root){
'use strict';
// Original single-line school-print guides. Coordinates share four writing lines at 0, 33, 66, 100.
const letters={
 A:['M18 66 L50 4 L82 66','M30 43 L70 43'],B:['M22 4 L22 66','M22 4 C90 0 85 34 22 34 C94 30 94 70 22 66'],
 C:['M80 12 C10 -12 3 86 80 60'],D:['M22 4 L22 66','M22 4 C98 2 98 68 22 66'],E:['M24 4 L24 66','M24 4 L80 4','M24 34 L70 34','M24 66 L80 66'],
 F:['M24 4 L24 66','M24 4 L80 4','M24 34 L70 34'],G:['M80 12 C10 -12 3 86 80 60 L80 36 L54 36'],H:['M20 4 L20 66','M80 4 L80 66','M20 34 L80 34'],
 I:['M50 4 L50 66','M25 4 L75 4','M25 66 L75 66'],J:['M75 4 L75 50 C75 78 20 74 20 50'],K:['M22 4 L22 66','M80 4 L22 38','M43 26 L82 66'],
 L:['M24 4 L24 66 L80 66'],M:['M15 66 L15 4 L50 40 L85 4 L85 66'],N:['M20 66 L20 4 L80 66 L80 4'],O:['M52 4 C8 4 6 66 50 66 C94 66 94 4 52 4'],
 P:['M24 4 L24 66','M24 4 C92 -2 92 38 24 34'],Q:['M52 4 C8 4 6 66 50 66 C94 66 94 4 52 4','M58 48 L84 74'],R:['M24 4 L24 66','M24 4 C92 -2 92 38 24 34','M48 34 L82 66'],
 S:['M80 12 C35 -14 0 22 50 34 C103 46 69 86 20 58'],T:['M15 4 L85 4','M50 4 L50 66'],U:['M20 4 L20 48 C20 74 80 74 80 48 L80 4'],V:['M18 4 L50 66 L82 4'],
 W:['M12 4 L30 66 L50 22 L70 66 L88 4'],X:['M20 4 L80 66','M80 4 L20 66'],Y:['M18 4 L50 34 L82 4','M50 34 L50 66'],Z:['M20 4 L80 4 L20 66 L80 66'],
 a:['M74 38 C18 12 12 82 74 60','M74 34 L74 66'],b:['M25 4 L25 66','M25 40 C82 12 94 84 25 60'],c:['M76 38 C18 12 10 86 76 60'],
 d:['M73 38 C15 12 12 84 73 60','M73 4 L73 66'],e:['M23 48 L78 48 C77 19 13 27 22 55 C28 73 62 73 78 60'],f:['M74 8 C42 -8 38 14 38 28 L38 66','M18 34 L72 34'],
 g:['M74 38 C18 12 12 82 74 60','M74 34 L74 80 C74 101 28 101 22 85'],h:['M25 4 L25 66','M25 46 C28 24 76 24 76 46 L76 66'],i:['M50 34 L50 66','M50 18 L50 19'],
 j:['M61 34 L61 80 C61 101 28 101 23 85','M61 18 L61 19'],k:['M25 4 L25 66','M78 34 L25 55','M48 46 L78 66'],l:['M50 4 L50 66'],
 m:['M12 34 L12 66','M12 46 C14 28 48 25 48 46 L48 66','M48 46 C52 25 85 28 85 46 L85 66'],n:['M25 34 L25 66','M25 46 C28 24 76 24 76 46 L76 66'],
 o:['M52 34 C10 30 10 70 50 66 C91 70 91 30 52 34'],p:['M25 34 L25 96','M25 40 C86 12 92 86 25 60'],q:['M74 38 C18 12 12 82 74 60','M74 34 L74 96'],
 r:['M28 34 L28 66','M28 46 C40 27 61 28 76 37'],s:['M74 38 C42 19 4 45 50 50 C96 56 57 81 22 61'],t:['M45 10 L45 55 C45 69 61 70 76 61','M20 34 L75 34'],
 u:['M24 34 L24 54 C24 77 75 71 75 50','M75 34 L75 66'],v:['M20 34 L50 66 L80 34'],w:['M10 34 L29 66 L49 39 L69 66 L89 34'],
 x:['M23 34 L77 66','M77 34 L23 66'],y:['M20 34 L50 66','M80 34 L35 96'],z:['M23 34 L77 34 L23 66 L77 66']
};
const stages=[
 {id:'straight',title:'第一步 · 直线与方向',description:'从起点出发，练横线、竖线和斜线。',codes:'12LM'},
 {id:'curves',title:'第二步 · 曲线与圆弧',description:'沿着圆弧和波浪，尝试连续运笔。',codes:'JPS'},
 {id:'turns',title:'第三步 · 转折与折线',description:'在转角稍停，再继续向前。',codes:'HFT'},
 {id:'combined',title:'第四步 · 综合小图形',description:'把曲线和折线组合起来，慢慢完成。',codes:'QUW'}
];
const patterns={
 '1':['M12 25 L88 25','M12 55 L88 55','M12 85 L88 85'], '2':['M25 12 L25 88','M55 12 L55 88','M85 12 L85 88'],
 L:['M18 28 L82 12','M18 58 L82 42','M18 88 L82 72'],M:['M18 12 L82 28','M18 42 L82 58','M18 72 L82 88'],
 J:['M10 30 Q20 10 30 30 T50 30 T70 30 T90 30','M10 70 Q20 50 30 70 T50 70 T70 70 T90 70'],
 P:['M10 25 Q50 85 90 25','M10 55 Q50 110 90 55'],S:['M50 14 C2 14 2 86 50 86 C98 86 98 14 50 14'],
 H:['M12 25 L30 50 L48 25 L66 50 L84 25','M12 60 L30 85 L48 60 L66 85 L84 60'],
 F:['M12 88 L12 62 L36 62 L36 38 L60 38 L60 12 L88 12'],T:['M18 18 L82 18 L82 82 L18 82 L18 18'],
 Q:['M30 12 L88 12 L70 88 L12 88 L30 12'],U:['M50 8 L61 37 L91 37 L67 56 L76 88 L50 69 L24 88 L33 56 L9 37 L39 37 L50 8'],
 W:['M50 85 C0 55 5 10 28 18 C40 18 47 30 50 38 C53 30 60 18 72 18 C95 10 100 55 50 85']
};
function markStart(ctx,path,index){
 const points=path.match(/-?\d+(?:\.\d+)?/g).map(Number),[x,y,tx,ty]=points,angle=Math.atan2(ty-y,tx-x);
 ctx.save();ctx.setLineDash([]);ctx.fillStyle='#26634f';ctx.strokeStyle='#26634f';ctx.lineWidth=1.3;
 ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill();
 if(Math.hypot(tx-x,ty-y)>5){const ex=x+Math.cos(angle)*12,ey=y+Math.sin(angle)*12;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.moveTo(ex-5*Math.cos(angle-.5),ey-5*Math.sin(angle-.5));ctx.lineTo(ex,ey);ctx.lineTo(ex-5*Math.cos(angle+.5),ey-5*Math.sin(angle+.5));ctx.stroke();}
 if(index!==undefined){ctx.font='9px Arial';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(String(index+1),x-4,Math.max(7,y-6));}ctx.restore();
}
function drawPaths(ctx,paths,x,y,w,h,color,dotted,arrows,weight=2){ctx.save();ctx.translate(x,y);ctx.scale(w/100,h/100);ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.setLineDash(dotted?[1,5]:[]);for(const path of paths)ctx.stroke(new Path2D(path));if(arrows)paths.forEach((path,i)=>markStart(ctx,path,paths.length>1?i:undefined));ctx.restore();}
function alphabet(ctx,text,x,y,w,h,color,dotted,arrows){const chars=Array.from(text),unit=Math.min(w/chars.length,h*.9),left=x+(w-unit*chars.length)/2;chars.forEach((c,i)=>{if(letters[c])drawPaths(ctx,letters[c],left+i*unit,y,unit,h,color,dotted,arrows);});}
function control(ctx,code,x,y,size,color,bold=false){if(!patterns[code])return false;drawPaths(ctx,patterns[code],x+size*.05,y+size*.05,size*.9,size*.9,color,true,true,bold?3:2);return true;}
const api={letters,stages,patterns,alphabet,control};root.PrintableGuides=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
