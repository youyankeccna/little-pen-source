(function(root){
'use strict';
function gradeOptions(subject,preschool=true){const start=subject==='en'?3:preschool?0:1;return Array.from({length:7-start},(_,i)=>{const grade=i+start;return [String(grade),grade?grade+'年级':'幼儿园'];});}
function normalizeGrade(grade,subject,preschool=true){const value=Number(grade);return gradeOptions(subject,preschool).some(row=>Number(row[0])===value)?value:subject==='en'?3:1;}
function matches(lesson,context,edition,subject){
 if(!lesson)return false;
 if(context&&(lesson.grade!==context.grade||lesson.term!==context.term))return false;
 return (!subject||lesson.subject===subject)&&(lesson.grade===0||(lesson.series||'pep')===edition);
}
function editorUrl(selection){
 if(!selection?.itemIds?.length)return null;
 return '#/'+selection.type+'?'+new URLSearchParams({course:selection.lessonId,kind:selection.kind,items:selection.itemIds.join(',')});
}
function activePlan(plans,mode,today){
 return plans.find(p=>p.mode===mode&&(mode==='daily'?p.days.some(d=>d.date===today):p.days.at(-1).date>=today));
}
root.WorkflowRules={gradeOptions,normalizeGrade,matches,editorUrl,activePlan};if(typeof module!=='undefined')module.exports=root.WorkflowRules;
})(typeof globalThis!=='undefined'?globalThis:this);
