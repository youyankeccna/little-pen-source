const assert=require('node:assert/strict');
const D=require('./data.js'),P=require('./practice-tools.js'),E=require('./engine.js'),B=require('./curriculum/material-bank.js');
for(const grade of [0,1,2,3,4,5,6]){
 const s=P.ageConfig({...D.defaults('hanzi'),text:'天地人'},'hanzi',grade);
 assert.equal(s.text,'天地人');assert.equal(s.showPinyin,grade>0&&grade<=2);assert(s.size>=9&&s.size<=14);
}

for(const grade of [1,3])for(const type of ['hanzi','cizu','duanluo']){
 const s=P.ageConfig(D.defaults(type),type,grade),old={...s,size:grade<=2?14:10,rowGap:grade<=2?3:2,scale:68};
 const m=E.build(type,s,t=>t.length*20),before=E.build(type,old,t=>t.length*20);
 assert(m.g.rows>before.g.rows);assert(s.size<=old.size);
 const R=require('./learning-rules.js');assert.equal(R.dailyConfig(s).size,s.size);assert.equal(R.presetConfig(s,type,'trace',grade).size,s.size);
}
for(const grade of [1,2,3,4,5,6])for(const type of ['hanzi','cizu']){
 const s=P.ageConfig(D.defaults(type),type,grade),previousSize=grade<=2?11:9;
 assert.equal(s.size,grade<=2?12:10);assert.equal(s.scale,75);
 assert(s.size*s.scale/(previousSize*68)>1.2,'printed glyphs must be visibly larger than v28');
}
for(const grade of [1,3]){const s=P.ageConfig(D.defaults('paragraph'),'paragraph',grade,'math');assert(s.size<=9);assert.equal(P.ageConfig({...s,mathLayout:'trace'},'paragraph',grade,'math').size,grade<=2?14:10);}
assert.equal(P.ageConfig(D.defaults('paragraph'),'paragraph',1,'en').size,14);

const faded={...D.defaults('hanzi'),fadeTrace:true,fillPage:true,fadeStyle:'more-trace'};
assert.equal(P.traceInk(faded,0,8),'#000000');assert.equal(P.traceInk(faded,6,8),null);
assert(parseInt(P.traceInk(faded,1,8).slice(-2),16)>parseInt(P.traceInk(faded,5,8).slice(-2),16));
assert.equal(P.traceInk({...faded,fadeStyle:'more-write'},4,8),null);
assert.equal(P.traceInk(faded,0,1),'#000000');
const text='school  /  学校\nread a book  /  读书';
const question=P.englishText(text,'to-en');assert(!question.includes('school'));assert(!question.includes('read'));assert(question.includes('学校'));
const chinese=P.englishText(text,'to-cn');assert(!chinese.includes('学校'));assert(chinese.includes('school'));
assert(P.englishText(text,'cloze').includes('s_____'));assert(P.englishText(text,'answers').includes('school  /  学校'));
for(const [mode] of P.englishModes){const s={...D.defaults('paragraph'),text,englishMode:mode},model=E.build('paragraph',s,t=>t.length*14);assert.equal(model.state.text,text);assert(model.pages>=1);if(mode==='to-en')assert(!model.rows.join('').includes('school'));}
assert(P.regroup({a:195,b:15,op:'+'}));assert(P.regroup({a:300,b:11,op:'-'}));assert(!P.regroup({a:21,b:12,op:'+'}));
for(const lesson of B.lessons.filter(l=>l.subject==='math')){
 const all=lesson.packs.find(p=>p.kind==='calculations').items,answers=lesson.packs.find(p=>p.kind==='calculationAnswers').items;
 for(const level of ['all','small','large']){
  const filtered=P.mathFilter(all,{level}),old=filtered.slice(0,5).map(i=>i.id),ids=P.nextSet(filtered,5,old,()=>.3);
  assert.equal(new Set(ids).size,ids.length);assert(ids.every(id=>filtered.some(i=>i.id===id)&&answers.some(i=>i.id===id)));
  if(filtered.length>=10)assert(ids.every(id=>!old.includes(id)));
 }
}
assert.deepEqual(P.nextSet([],20),[]);
assert.equal(P.mathFilter([{text:'15 + 7 = ____'},{text:'12 + 7 = ____'}],{regroup:'yes'}).length,1);
assert.equal(P.mathFilter([{text:'15 ÷ 7 = ____'},{text:'14 ÷ 7 = ____'}],{remainder:'yes'}).length,1);
console.log('PASS: age presets, fading and blank cells, English answer hiding, grade-contained question replacement and paired answers');

const quizState={...D.defaults('paragraph'),text:Array.from({length:12},(_,i)=>'word'+i+'  /  释义'+i).join('\n'),size:10,rowGap:3,englishMode:'to-en',fillPage:true};
const quizModel=E.build('paragraph',quizState,t=>t.length*14);
assert.equal(quizModel.rows.length%quizModel.g.rows,0);
for(let i=quizModel.g.rows-1;i<quizModel.rows.length;i+=quizModel.g.rows)assert.equal(quizModel.rows[i],'','Question must not end a page without its answer line');

// Select whole materials against the same page geometry used for printing.
const materials=Array.from({length:100},(_,i)=>({id:String(i),text:'练习'}));
const pageState=P.ageConfig(D.defaults('cizu'),'cizu',3);
const pagesFor=items=>E.build('cizu',{...pageState,text:items.map(i=>i.text).join('\n')},t=>t.length*20).pages;
for(const target of [1,2,3]){
 const fitted=P.fitPages(materials,target,pagesFor);
 assert.equal(fitted.pages,target);assert.equal(pagesFor(fitted.items),target);
 assert(pagesFor(materials.slice(0,fitted.items.length+1))>target,'one more complete item must overflow');
}
assert.equal(materials.length,100,'page fitting must not consume the source library');
assert.deepEqual(P.fitPages([],1,pagesFor).items,[]);
const passage={id:'long',text:'完整课文'};
const oversized=P.fitPages([passage],1,()=>3);
assert.equal(oversized.items[0],passage);assert.equal(oversized.pages,3);assert(oversized.overTarget);
assert(P.fitPages([passage],1,()=>Infinity).tooLong);
console.log('PASS: whole-item A4 selection, exact page boundaries, preserved oversized passages and unchanged source materials');
