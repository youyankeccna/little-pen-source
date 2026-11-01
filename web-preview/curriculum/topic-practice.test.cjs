const assert=require('node:assert/strict');
const C=require('./data.js');
assert.equal(new Set(C.lessons.map(l=>l.id)).size,C.lessons.length);
for(let grade=1;grade<=6;grade++)for(const subject of ['cn','math','en'])for(const term of ['upper','lower']){
 if(subject==='en'&&grade<3)continue;
 const b=C.getBook(grade,subject,term);assert.ok(b.lessons.length,`${grade}/${subject}/${term}`);
 for(const lesson of b.lessons)for(const p of lesson.packs){
  assert.ok(C.kindInfo[p.kind]);assert.ok(p.items.length);
  const v=C.getSelection(lesson.id,p.kind,p.items.map(i=>i.id));assert.ok(v?.text);
  assert.equal(C.getSelection(lesson.id,p.kind,['unknown-item']),null);
  if(p.origin==='selected-from-title'&&p.kind==='characters')for(const i of p.items)assert.ok(lesson.title.includes(i.text));
 }
 assert.equal(C.getBook(grade,subject,term,'other').lessons.length,0);
}
assert.ok(C.getBook(6,'en','lower').lessons.some(l=>/Last weekend/.test(l.title)));
const arithmetic=C.lessons.filter(l=>l.grade===1&&l.subject==='math').flatMap(l=>l.packs.filter(p=>p.kind==='formulas').flatMap(p=>p.items));
assert.ok(!arithmetic.some(i=>i.text==='24 + 18 = 42'));
for(const title of ['1-5的认识','6~9的认识','10的认识'])assert.ok(C.getBook(1,'math','upper').lessons.some(l=>l.title===title),title);
assert.ok(!C.getBook(1,'math','upper').lessons.some(l=>/^[-~～]|^的/.test(l.title)));
console.log('PASS: all 32 books selectable, valid selections, unique IDs, provenance and publisher isolation');
