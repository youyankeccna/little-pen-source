const assert=require('node:assert/strict'),C=require('./curriculum/data.js'),B=require('./curriculum/material-bank.js'),E=require('./engine.js'),D=require('./data.js');
assert.equal(B.lessons.filter(l=>l.subject==='cn').length,12);
assert.equal(B.lessons.filter(l=>l.subject==='en'&&l.series==='pep').length,46);
assert.equal(new Set(B.lessons.map(l=>l.id)).size,B.lessons.length);
let checked=0;
for(const l of B.lessons){
 assert(l.packs.length);assert(!C.getBook(l.grade,l.subject,l.term,l.series).lessons.some(x=>x.materialLibrary),'Bank polluted lesson picker');
 for(const p of l.packs){
  assert(C.kindInfo[p.kind],p.kind);assert(p.items.length);assert.equal(new Set(p.items.map(i=>i.id)).size,p.items.length);
  const ids=p.items.slice(0,/Texts|poems/.test(p.kind)?1:5).map(i=>i.id),selection=C.getSelection(l.id,p.kind,ids);assert(selection);assert(selection.text.length<=20000);
  if(l.subject==='en')for(const i of p.items){assert(i.translation&&/[\u4e00-\u9fff]/.test(i.translation),`${l.id} ${i.text}`);assert(i.sourceRef);}
  if(p.kind.endsWith('Bilingual')){
   const source=l.packs.find(x=>x.kind===p.kind.replace(/Bilingual$/,''));
   for(const i of p.items){const original=source.items.find(x=>x.id===i.id);assert.equal(i.text,original.text+(['vocabulary','phrases','extraPhrases'].includes(source.kind)?'  /  ':'\n')+original.translation);}
  }
  const state={...D.defaults(selection.type),text:selection.text,font:'wenkai',size:10,scale:65,cellType:selection.type==='paragraph'?'dxg':D.defaults(selection.type).cellType};
  const model=E.build(selection.type,state,t=>Array.from(t).length*20);assert(model.pages>=1&&model.pages<=20);assert(model.rows.length);checked++;
 }
}
for(const l of B.lessons.filter(l=>l.subject==='math')){
 const q=l.packs.find(p=>p.kind==='calculations'),a=l.packs.find(p=>p.kind==='calculationAnswers');assert.equal(q.items.length,a.items.length);
 for(const i of q.items){const answer=a.items.find(x=>x.id===i.id);assert(answer);assert(!answer.text.includes('____'));assert(answer.text.includes(i.answer));}
}
const missing=B.coverage.filter(x=>x.subject==='cn'&&!x.sourceAvailable);assert.deepEqual(missing.map(x=>x.grade),[4,5,6]);
console.log(`PASS: ${B.lessons.length} bank entries, ${checked} packs, bilingual IDs, layout bounds, math answer pairing and legacy course isolation`);
