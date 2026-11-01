const assert=require('node:assert/strict');
const json=require('./public-domain.json'),js=require('./public-domain.js'),C=require('./data.js'),catalog=require('./sources/catalog.json');
assert.deepEqual(js,json);
assert.equal(json.lessons.length,12);
assert.equal(new Set(json.lessons.map(l=>l.id)).size,12);
for(const l of json.lessons){
 const book=catalog.books.find(b=>b.grade===l.grade&&b.subject==='cn'&&b.term===l.term);
 assert.ok(book.contents.some(t=>t.replace(/^\d+\s*/, '')===l.title),l.title+' must have a candidate catalog match');
 assert.equal(l.rights.status,'public-domain');assert.ok(l.author&&l.source&&l.variantNote);
 const poem=l.packs.find(p=>p.kind==='sentences').items[0].text;
 for(const p of l.packs){
  assert.equal(new Set(p.items.map(i=>i.id)).size,p.items.length);
  const selected=C.getSelection(l.id,p.kind,p.items.map(i=>i.id));assert.ok(selected?.text);
  assert.notEqual(selected.origin,'self-authored');
  if(p.kind!=='sentences')for(const item of p.items)assert.ok(poem.includes(item.text),item.text);
  assert.equal(C.getSelection(l.id,p.kind,['not-an-item']),null);
 }
 assert.ok(C.getBook(l.grade,'cn',l.term).lessons.some(item=>item.id===l.id));
}
assert.equal(C.getSelection('pd-cn-1-upper','sentences',[]),null);
assert.equal(C.originLabel('public-domain'),'古诗公版原作');
console.log('PASS: 12首原作、候选目录关联、字词确实出自本诗、来源与异文标注、选项校验、JS/JSON一致');
