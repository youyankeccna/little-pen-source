const assert=require('node:assert/strict'),C=require('./data.js');
const sample=C.getBook(1,'cn','upper').lessons.filter(l=>l.curation?.batch==='grade1-upper-topic-pilot-1');
assert.equal(sample.length,24);assert.equal(new Set(sample.map(l=>l.teachingOrder)).size,24);
assert.equal(sample.filter(l=>l.packs.some(p=>p.kind==='pinyin')).length,14);
assert.ok(sample.some(l=>l.title==='ang eng ing ong'));assert.ok(!sample.some(l=>l.title==='ang en ing ong'));
assert.ok(sample.every(l=>l.curation.textbookWritingListVerified===false));
for(const l of sample){assert.ok(l.source&&l.note);for(const p of l.packs){assert.ok(p.items.length);assert.ok(!['selected-from-title','authorized-textbook'].includes(p.origin));assert.ok(C.getSelection(l.id,p.kind,p.items.map(i=>i.id)));}}
console.log('PASS: 24 topic samples, 14 phonics groups, eng corrected, provenance explicit and textbook status not overstated');
