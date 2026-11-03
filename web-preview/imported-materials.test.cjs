const assert=require('node:assert/strict'),C=require('./curriculum/data.js'),M=require('./curriculum/imported/materials.js'),manifest=require('./curriculum/imported/manifest.json');
global.WorkbookData=require('./data.js');const E=require('./engine.js');
assert.equal(manifest.bookCount,170);assert.equal(manifest.editionCount,24);assert.equal(M.lessons.length,manifest.lessonCount);assert.ok(manifest.books.every(b=>b.importedLessons>0));
for(const b of manifest.books){const rows=M.lessons.filter(l=>l.revisionId===b.id);assert.equal(rows.length,b.importedLessons);assert.ok(rows.every(l=>l.provenance.file===b.file&&l.reviewStatus==='ocr-unreviewed'));assert.equal(C.getBook(b.grade,b.subject,b.term,b.series).lessons.filter(l=>l.revisionId===b.id).length,0,'未校对 OCR 稿不进入目录');}
for(const [id] of C.editionOptions.en){for(const term of ['upper','lower'])for(let grade=1;grade<=6;grade++){const rows=C.getBook(grade,'en',term,id).lessons;assert.ok(rows.every(l=>(l.series||'pep')===id));}}
for(const type of ['hanzi','cizu','duanluo','word','paragraph']){const s=WorkbookData.defaults(type);s.text={hanzi:'天地',cizu:'你好\n世界',duanluo:'这是一段测试内容。',word:'hello\nworld',paragraph:'Hello, my friend.'}[type];const plain=E.build(type,s,t=>t.length*15);s.fillPage=true;const filled=E.build(type,s,t=>t.length*15);assert.equal(filled.rows.length%filled.g.rows,0);assert.equal(filled.pages,plain.pages);assert.equal(filled.state.text,s.text);assert.ok(filled.rows.length>=plain.rows.length);assert.deepEqual(filled.rows.slice(0,plain.rows.length),plain.rows);}
console.log('PASS: 170 books, 24 English editions, provenance and edition isolation; fill A4 repeats rows without changing source text or pages');

assert.ok(C.getBook(0,'en','upper','yilin').lessons.length);

assert.equal(manifest.books.filter(b=>b.subject==='cn').length,9);assert.equal(manifest.books.filter(b=>b.subject==='en').length,161);
