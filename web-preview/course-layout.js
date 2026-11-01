(function(root){
'use strict';
const D=root.WorkbookData||(typeof require==='function'?require('./data.js'):null);
const P=root.PracticeTools||(typeof require==='function'?require('./practice-tools.js'):null);
function defaults(course,materialLibrary=false){
 const s=P.ageConfig({...D.defaults(course.type),text:course.text},course.type,course.grade,course.subject);
 s.practiceMode='trace';s.text=course.text;s.fillPage=false;if(course.daily)return s;
 s.traceNum=course.grade<=2?3:2;
 if(course.kind.endsWith('Bilingual')||course.subject==='math'&&materialLibrary){s.font='wenkai';s.cellType='dxg';s.size=course.subject==='math'?(course.grade<=2?9:8.5):course.grade<=2?14:10;s.scale=course.subject==='math'?68:65;s.offset=0;s.traceColor='#344b3d';s.rowGap=course.subject==='math'?1.5:3;}
 if(course.kind==='formulas'){s.font='wenkai';s.cellType='lxg';s.scale=68;s.offset=0;}
 if(course.subject==='math'&&['calculations','calculationAnswers'].includes(course.kind)){s.mathLayout=course.kind==='calculationAnswers'?'answers':'trace';s.size=course.grade<=2?14:10;s.traceColor='#a6afb9';}
 return s;
}
root.CourseLayout={defaults};if(typeof module!=='undefined')module.exports=root.CourseLayout;
})(typeof globalThis!=='undefined'?globalThis:this);
