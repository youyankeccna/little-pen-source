const assert=require('node:assert/strict');
const D=require('./data.js');global.WorkbookData=D;const E=require('./engine.js'),R=require('./family-rules.js'),C=require('./curriculum/data.js');
const lesson=C.getLesson('cn-1u-tiandiren');
let days=R.makeDays({lessons:[lesson],kind:'characters',amount:4,days:7,start:'2026-10-23',review:['天','山','水','火']});
assert.equal(days.length,2);assert.equal(days[0].date,'2026-10-23');assert.equal(days[1].date,'2026-10-24');assert.equal(days[0].items.length,4);assert.ok(!days[0].reviewChars.includes('天'));assert.equal(new Set(days.flatMap(d=>d.reviewChars)).size,days.flatMap(d=>d.reviewChars).length);
assert.equal(R.dayOffset('2026-12-31',1),'2027-01-01');assert.equal(R.dayOffset('2028-02-28',1),'2028-02-29');
let tested=0;
for(const subject of ['cn','en','math'])for(let grade=0;grade<=6;grade++)for(const term of ['upper','lower']){
 const rows=C.getCourseBook(grade,subject,term,'pep').lessons;
 for(const kind of Object.keys(R.types))for(const amount of R.limits(kind)){
  const days=R.makeDays({lessons:rows,kind,amount,days:7,start:'2026-10-23'});
  for(const day of days){const state=R.config(day,D),model=E.build(day.type,state,t=>t.length*14);assert.equal(model.pages,1,subject+grade+kind);assert.ok(!state.fillPage);assert.ok(day.items.length<=amount);tested++;}
 }
}
assert.ok(tested>100);console.log('PASS: plan ordering, real day count, review deduplication, CST calendar and '+tested+' single-page layouts');
