const assert=require('node:assert/strict');
const data=require('./catalog.json');
assert.equal(data.books.length,32);
assert.equal(new Set(data.books.map(book=>book.id)).size,32);
for(const book of data.books){
 assert.ok(book.grade>=1&&book.grade<=6);
 assert.ok(['cn','math','en'].includes(book.subject));
 assert.ok(['upper','lower'].includes(book.term));
 if(book.subject==='en')assert.ok(book.grade>=3);
 assert.equal(book.editionStatus,'copyright-page-not-verified');
 assert.equal(book.practiceStatus,'not-imported');
 assert.ok(book.officialCandidates.length);
 for(const source of book.officialCandidates)assert.equal(new URL(source.readerUrl).hostname,'book.pep.com.cn');
 assert.equal(new Set(book.contents).size,book.contents.length);
 for(const title of book.contents){assert.ok(title.length<150);assert.ok(!/微信扫描|电子课本网|免费下载/.test(title));}
}
assert.ok(data.books.find(b=>b.id==='en-5-lower').officialCandidates.length>1);
console.log('PASS: 32册覆盖、学制与系列筛选、重复版本保留、目录去重、待核验状态');
