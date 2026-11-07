(function(root){
'use strict';
const ranges={size:[6,30],rowGap:[0,10],scale:[48,128],offset:[-50,50],traceNum:[0,200],letterSpace:[-10,10]};
const enums={font:['kaiti','wenkai','song','italic','sans','pinyin1','pinyin2'],fontWeight:['normal','bold'],cellType:['zwg','num','tzg','mzg','htg','hmg','jgg','hxg','hgg','fg','sxg','dxg','lxg','blank','none']};
function pick(value){
 const result={};if(!value||typeof value!=='object')return result;
 for(const [field,[min,max]] of Object.entries(ranges))if(Number.isFinite(value[field])&&value[field]>=min&&value[field]<=max)result[field]=value[field];
 for(const [field,values] of Object.entries(enums))if(values.includes(value[field]))result[field]=value[field];
 for(const field of ['leading','blankRow','blankCol','fillPage'])if(typeof value[field]==='boolean')result[field]=value[field];
 for(const field of ['traceColor','lineColor'])if(typeof value[field]==='string'&&/^#[0-9a-f]{6}$/i.test(value[field]))result[field]=value[field];
 if(Array.isArray(value.padding)&&value.padding.length===4&&value.padding.every(v=>Number.isFinite(v)&&v>=10&&v<=100))result.padding=[...value.padding];
 return result;
}
function key(scope,context){return 'little-pen-layout-v1:'+JSON.stringify([scope||'guest',context.subject,context.grade,context.type,context.variant||'standard']);}
function apply(base,value){return {...base,...pick(value)};}
root.LayoutPreferences={pick,key,apply};if(typeof module!=='undefined')module.exports=root.LayoutPreferences;
})(typeof globalThis!=='undefined'?globalThis:this);
