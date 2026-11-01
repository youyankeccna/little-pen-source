// Deterministic local publication of supplementary exercises; no claim of textbook review.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../web-preview/curriculum/data.js');
const lessons=C.lessons.map(l=>({...l,publicationStatus:'published-supplement',practiceStatus:l.packs.every(p=>p.origin==='selected-from-title')?'title-only':l.contentStatus==='public-domain-reviewed'?'public-domain':'topic-exercises'}));
const books=[...new Set(lessons.map(l=>l.revisionId))].map(id=>{const rows=lessons.filter(l=>l.revisionId===id),l=rows[0];return {id,series:l.series||'pep',grade:l.grade,subject:l.subject,term:l.term,edition:l.edition,reviewStatus:'reference-only',expectedLessonCount:null,lessonCount:rows.length,titleOnlyCount:rows.filter(l=>l.practiceStatus==='title-only').length};});
const payload={schemaVersion:1,engineVersion:'workbook-9',editionOptions:C.editionOptions,notice:'仅发布补充书写练习，教材修订版及逐课教学审核待确认。',books,lessons};
const hash=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');payload.contentVersion=hash;
if(lessons.some(l=>!l.packs.length)||new Set(lessons.map(l=>l.id)).size!==lessons.length)throw Error('Invalid or duplicate lessons');
for(const l of lessons)for(const p of l.packs)if(!['self-authored','selected-from-title','public-domain','selected-from-public-domain','authorized-textbook','user-provided-ocr'].includes(p.origin))throw Error('Unreviewed origin: '+p.origin);
const target=path.resolve(__dirname,'../server/content.json');
if(process.argv.includes('--check')){if(!fs.existsSync(target)||JSON.parse(fs.readFileSync(target)).contentVersion!==hash)throw Error('Publication is stale; run node scripts/content_release.cjs');}
else {const archives=path.resolve(__dirname,'../server/content-archive');fs.mkdirSync(archives,{recursive:true});const file=path.join(archives,hash+'.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(payload)+'\n');fs.writeFileSync(target+'.tmp',JSON.stringify(payload)+'\n');fs.renameSync(target+'.tmp',target);}
const coverage={auditedAt:'2026-10-16',note:payload.notice,contentVersion:hash,books:books.map(b=>({...b,directoryEntries:b.lessonCount,readyEntries:b.lessonCount,items:lessons.filter(l=>l.revisionId===b.id).reduce((n,l)=>n+l.packs.reduce((n,p)=>n+p.items.length,0),0)}))};
if(!process.argv.includes('--check'))fs.writeFileSync(path.resolve(__dirname,'../web-preview/curriculum/coverage.json'),JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({contentVersion:hash,books:books.length,lessons:lessons.length,titleOnly:lessons.filter(l=>l.practiceStatus==='title-only').length,mode:process.argv.includes('--check')?'verified':'published-supplement'}));
