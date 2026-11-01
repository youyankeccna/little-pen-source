const assert=require('node:assert/strict');
const C=require('./curriculum/data.js'),D=require('./data.js'),R=require('./learning-rules.js'),E=require('./engine.js');
const raw=C.getBook(1,'cn','upper'),book=C.getCourseBook(1,'cn','upper');
assert.equal(book.lessons.length,32);assert.equal(new Set(book.lessons.map(l=>l.title)).size,32);
assert.equal(new Set(book.lessons.map(l=>l.unit)).size,8);
const all=[...book.lessons,...book.extras,...Object.values(book.variants).flat()];
assert.deepEqual(all.map(l=>l.id).sort(),raw.lessons.map(l=>l.id).sort(),'no source or legacy lesson disappears');
assert.equal(book.lessons[0].id,'cn-1u-tiandiren');
assert.ok(book.lessons.every(l=>l.reviewStatus!=='approved'&&l.curation.textbookWritingListVerified===false));
assert.equal(C.getLesson('import-5cc784e0ce98dc8c-21').title,'8 升国旗');
const first=C.getLesson('import-5cc784e0ce98dc8c-3');
assert.equal(first.packs.map(p=>p.kind).join(','),'characters');
assert.equal(first.packs[0].items.map(i=>i.text).join(''),'一二三四五上下');
assert.equal(first.packs[0].items[0].id,'characters-6','preserve surviving item identity');
assert.ok(C.getCourseBook(3,'en','upper').lessons.some(l=>l.contentStatus==='ocr-draft'));
assert.equal(C.getCourseBook(1,'en','upper').lessons.length,0);
for(const type of ['hanzi','cizu'])for(const mode of ['trace','copy','quiz']){
 const dirty={...D.defaults(type),text:type==='hanzi'?'天地':'天地\n大地',fillPage:true,showBishun:true,traceNum:99,readings:{天:'tiān',地:'dì','天地':'tiān dì','大地':'dà dì'}};
 const s=R.presetConfig(dirty,type,mode,1),paint=[];
 assert.equal(s.text,dirty.text);assert.equal(s.fillPage,false);assert.equal(s.practiceMode,mode);
 const ctx=new Proxy({measureText:t=>({width:t.length*20}),fillText:t=>paint.push(t)},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});
 const model=E.build(type,s,t=>t.length*20);E.drawPage({getContext:()=>ctx},model,0,1);
 assert.equal(model.pages,1);
 if(mode==='quiz'){assert.equal(s.showBishun,false);assert.ok(!paint.some(t=>['天','地','天地','大地'].includes(t)),'preset quiz must not leak answers');}
}
assert.deepEqual(R.presets('word').map(p=>p.id),['trace']);
const base=D.defaults('word');assert.equal(R.presetConfig(base,'word','quiz'),base,'unsupported mode is not applied');
console.log('PASS: primary catalog, all source links retained, OCR corrections, preset layouts and quiz answer isolation');
