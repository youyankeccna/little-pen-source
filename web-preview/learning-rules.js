(function(root){
'use strict';
function day(now=Date.now()){return new Date(now+8*3600000).toISOString().slice(0,10);}
function due(item,now=Date.now()){return item.reviewStatus!=='mastered'&&day((item.nextReviewAt??item.addedAt??0)*1000)<=day(now);}
function review(item,action,now=Date.now()){
 const value=structuredClone(item),seconds=Math.floor(now/1000);
 if(action==='reviewed'&&value.lastReviewAt!==undefined&&day(value.lastReviewAt*1000)===day(now))return value;
 const stage=action==='reviewed'?Math.min((value.reviewStage||0)+1,4):0;
 value.reviewStage=stage;value.reviewStatus=action==='mastered'?'mastered':'active';value.nextReviewAt=action==='mastered'?null:seconds+[1,3,7,14,14][stage]*86400;
 if(['reviewed','again'].includes(action))value.lastReviewAt=seconds;
 return value;
}
function dailyConfig(base){return {...base,size:base.size,rowGap:base.rowGap,padding:[36,36,36,36],scale:base.scale,practiceMode:'trace',traceNum:3,showPinyin:true,showBishun:false,blankRow:false,blankCol:false};}
function presets(type){return ['hanzi','cizu'].includes(type)?[
 {id:'trace',title:'初学描红',description:'少量描红，留空自己写'},
 {id:'copy',title:'独立临写',description:'看一个范字，再独立书写'},
 {id:'quiz',title:'复习自测',description:'看拼音写字，可另出答案'}
 ]:[{id:'trace',title:'推荐练习',description:'使用适合本课的默认排版'}];}
function presetConfig(base,type,mode,grade=1){
 if(!presets(type).some(p=>p.id===mode))return base;
 const chinese=['hanzi','cizu'].includes(type);
 return {...base,practiceMode:chinese?mode:'trace',size:base.size,rowGap:base.rowGap===1.5?1.5:2,padding:[36,36,36,36],traceNum:grade<=2?3:2,leading:true,fillPage:false,blankRow:false,blankCol:false,showPinyin:chinese&&(mode==='quiz'||(mode==='trace'&&grade<=2)),showBishun:false};
}
root.LearningRules={day,due,review,dailyConfig,presets,presetConfig};if(typeof module!=='undefined')module.exports=root.LearningRules;
})(typeof globalThis!=='undefined'?globalThis:this);
