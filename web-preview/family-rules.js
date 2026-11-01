(function(root){
'use strict';
const types={characters:'hanzi',words:'cizu',vocabulary:'word',digits:'number',letters:'alphabet',patterns:'pen-control'};
function dayOffset(day,offset){const value=new Date(day+'T00:00:00+08:00');return new Date(value.getTime()+offset*86400000+8*3600000).toISOString().slice(0,10);}
function limits(kind){return kind==='words'?[2,3,4]:kind==='vocabulary'?[2,4,6]:[4,6,8];}
function eligible(lesson,kind){return (lesson.packs.find(p=>p.kind===kind)?.items||[]).filter(i=>i.text.length<=(kind==='words'?8:32));}
function makeDays({lessons,kind,amount,days,start,review=[]}){
 if(!types[kind]||!limits(kind).includes(amount))return [];
 const queue=lessons.flatMap(l=>eligible(l,kind).map(item=>({lesson:l,item}))),result=[],seen=new Set();let index=0;
 // Each day keeps a single lesson; long lessons continue on the next day.
 while(index<queue.length&&result.length<days){const lesson=queue[index].lesson,items=[];while(index<queue.length&&queue[index].lesson.id===lesson.id&&items.length<amount)items.push(queue[index++].item);
 const chars=(['characters','words'].includes(kind)&&lesson.subject==='cn'?review:[]).filter(c=>!seen.has(c)&&!items.some(i=>i.text===c)).slice(0,2);chars.forEach(c=>seen.add(c));
 result.push({date:dayOffset(start,result.length),lessonId:lesson.id,title:lesson.title,kind,type:types[kind],items,itemIds:items.map(i=>i.id),reviewChars:chars,origin:lesson.packs.find(p=>p.kind===kind).origin,completed:false});}
 return result;
}
function text(day){return [...day.items.map(i=>i.text),...(day.reviewChars||[])].join(['characters','letters','patterns'].includes(day.kind)?'':'\n');}
function config(day,D,grade=1){return {...D.defaults(day.type),text:text(day),font:['hanzi','cizu'].includes(day.type)?'wenkai':day.type==='word'||day.type==='alphabet'?'sans':'wenkai',size:['hanzi','cizu'].includes(day.type)?(grade<=2?12:10):day.type==='number'?9:14,rowGap:['hanzi','cizu','number'].includes(day.type)?1.5:2,scale:['hanzi','cizu'].includes(day.type)?75:day.type==='number'?68:D.defaults(day.type).scale,padding:[70,36,48,36],traceNum:3,fillPage:false,practiceMode:'trace',showPinyin:['hanzi','cizu'].includes(day.type),showBishun:false};}
root.FamilyRules={types,dayOffset,limits,eligible,makeDays,text,config};if(typeof module!=='undefined')module.exports=root.FamilyRules;
})(typeof globalThis!=='undefined'?globalThis:this);
