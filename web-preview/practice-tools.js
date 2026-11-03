(function(root){
'use strict';
const englishModes=[['copy','中英对照描写'],['to-en','看中文写英文'],['to-cn','看英文写中文'],['cloze','补全单词'],['answers','同批答案']];
function ageConfig(base,type,grade,subject){
 const s={...base},cn=['hanzi','cizu'].includes(type),young=grade<=2;
 s.size=grade===0?18:young?14:10;s.rowGap=young?3:2;s.scale=cn?68:75;
 s.traceNum=young?4:3;s.leading=true;s.blankRow=false;s.blankCol=false;s.fillPage=false;
 s.practiceMode='trace';s.showPinyin=cn&&grade>0&&young;s.showBishun=false;
 if(['alphabet','word','paragraph'].includes(type)){s.font=/[\u3400-\u9fff]/.test(s.text)?'wenkai':'sans';s.offset=0;s.size=young?14:10;}
 if(['hanzi','cizu','duanluo','bihua'].includes(type)){s.size=grade===0?14:type==='duanluo'?(young?10:8):(young?11:9);s.rowGap=1.5;s.scale=68;}
 if(cn&&grade>0){s.size=young?12:10;s.scale=75;}
 if(type==='pinyin'){s.size=young?9:8;s.rowGap=1.5;s.scale=60;}
 if(subject==='math'){s.size=grade===0?12:young?9:8.5;s.rowGap=1.5;s.scale=68;s.offset=0;if(['trace','answers'].includes(base.mathLayout))s.size=young?14:10;}
 return s;
}
function traceInk(s,index,capacity){
 if(!s.fadeTrace)return s.leading&&index===0?'#000000':s.traceColor;
 const count=Math.max(1,Math.min(capacity,s.fillPage?capacity:s.traceNum));
 const shown=Math.max(1,count-(s.fadeStyle==='more-write'?Math.ceil(count/2):Math.min(2,Math.max(1,Math.floor(count/3)))));
 if(index>=shown)return null;
 if(index===0)return '#000000';
 const alpha=Math.round(255*(.95-.4*index/Math.max(1,shown-1)));
 return s.traceColor+alpha.toString(16).padStart(2,'0');
}
function englishPairs(text){return text.split('\n').filter(x=>x.trim()).map(line=>{const split=line.indexOf('  /  ');return split<1?null:[line.slice(0,split),line.slice(split+5)];});}
function englishText(text,mode){
 if(!mode||mode==='copy')return text;
 return englishPairs(text).map((pair,i)=>{
  if(!pair)return '';
  const [en,cn]=pair,prefix=(i+1)+'. ';
  if(mode==='answers')return prefix+en+'  /  '+cn;
  if(mode==='to-en')return prefix+cn+'\n ';
  if(mode==='to-cn')return prefix+en+'\n ';
  return prefix+en.replace(/[A-Za-z]+/g,word=>word.length<2?'_':word[0]+word.slice(1).replace(/[A-Za-z]/g,'_'))+'  /  '+cn;
 }).join('\n');
}
function integerProblem(item){const m=item.text.match(/^(\d+)\s*([+−\-×÷])\s*(\d+)\s*=/);return m?{a:Number(m[1]),op:m[2],b:Number(m[3])}:null;}
function regroup(p){let a=p.a,b=p.b;while(a||b){if(p.op==='+'?a%10+b%10>=10:a%10<b%10)return true;a=Math.floor(a/10);b=Math.floor(b/10);}return false;}
function mathFilter(items,settings={}){
 let found=items.filter(item=>{const p=integerProblem(item);
  if(settings.regroup&&settings.regroup!=='all'&&(!p||!['+','-','−'].includes(p.op)||regroup(p)!==(settings.regroup==='yes')))return false;
  if(settings.remainder&&settings.remainder!=='all'&&(!p||p.op!=='÷'||(p.a%p.b!==0)!==(settings.remainder==='yes')))return false;
  return true;
 });
 if(settings.level&&settings.level!=='all'){
  const values=found.map(i=>integerProblem(i)).filter(Boolean).map(p=>Math.max(p.a,p.b)).sort((a,b)=>a-b);
  if(values.length===found.length&&values.length){const mid=values[Math.floor((values.length-1)/2)];found=found.filter(i=>{const p=integerProblem(i),v=Math.max(p.a,p.b);return settings.level==='small'?v<=mid:v>mid;});}
 }
 return found;
}
function nextSet(items,count,excluded=[],random=Math.random){
 const old=new Set(excluded),fresh=items.filter(i=>!old.has(i.id)),repeat=items.filter(i=>old.has(i.id));
 for(const list of [fresh,repeat])for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
 return [...fresh,...repeat].slice(0,count).map(i=>i.id);
}
function fitPages(items,target,pagesFor){
 if(!items.length)return {items:[],pages:0,overTarget:false};
 const cache=new Map(),pages=n=>{if(!cache.has(n))cache.set(n,pagesFor(items.slice(0,n)));return cache.get(n);};
 const first=pages(1);if(!Number.isFinite(first))return {items:[],pages:0,overTarget:false,tooLong:true};
 if(first>target)return {items:items.slice(0,1),pages:first,overTarget:true};
 let low=1,high=items.length,best=1;
 while(low<=high){const mid=Math.floor((low+high)/2);if(pages(mid)<=target){best=mid;low=mid+1;}else high=mid-1;}
 return {items:items.slice(0,best),pages:pages(best),overTarget:false};
}
const api={englishModes,ageConfig,traceInk,englishPairs,englishText,integerProblem,regroup,mathFilter,nextSet,fitPages};root.PracticeTools=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
