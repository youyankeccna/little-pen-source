const assert=require('node:assert/strict');
const report=require('./crosscheck.json'),current=require('./pep-current.json'),C=require('../data.js');
assert.equal(report.books.length,32);
assert.equal(new Set(report.books.map(b=>b.bookId)).size,32);
assert.deepEqual(require('../pep-current.js'),current);
assert.equal(current.books.length,7);
assert.equal(current.books.reduce((n,b)=>n+b.units.length,0),49);
for(const book of current.books){
 assert.equal(new URL(book.source).hostname,'www.pep.com.cn');
 assert.ok(book.source.includes('/yyptzy/'));
 assert.equal(book.editionStatus,'copyright-page-not-verified');
 const ui=C.getBook(book.grade,'en',book.term);
 assert.deepEqual(ui.lessons.filter(l=>l.catalogStatus==='official-current-companion').map(l=>l.title),book.units);
 assert.ok(ui.lessons.filter(l=>l.contentStatus!=='ocr-draft').every(l=>l.catalogStatus==='official-current-companion'));
}
assert.equal(C.getBook(4,'en','upper').lessons.find(l=>l.catalogStatus==='official-current-companion').title,'Unit 1 Helping at home');
assert.equal(C.getBook(5,'en','upper').lessons.find(l=>l.catalogStatus==='official-current-companion').title,'Unit 1 Different friends');
assert.equal(C.getBook(6,'en','upper').lessons.find(l=>l.catalogStatus==='official-current-companion').title,'Unit 1 Amazing places');
const historical=C.getBook(6,'en','lower').lessons.filter(l=>l.contentStatus!=='ocr-draft');
assert.equal(historical.length,5);
assert.ok(historical.every(l=>l.catalogStatus==='legacy-topic-reference'&&l.edition.includes('非新版')));
assert.ok(!current.books.some(b=>b.grade===6&&b.term==='lower'));
assert.ok(report.books.find(b=>b.bookId==='en-5-upper').currentPublisherCatalog);
console.log('PASS: 32册来源对照、7册49条官方当前目录、六下历史参考与官方目录分离、版次待核验');
