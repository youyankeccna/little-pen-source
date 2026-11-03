const assert=require('node:assert/strict');
const C=require('./data.js'),G=require('./review-gate.js'),X=require('./reviewed-xiezi.js');
const lib=(g,s,t)=>C.lessons.filter(l=>l.materialLibrary&&l.grade===g&&l.subject===s&&l.term===t);
// 1上 / 1下：写字表 100 / 200 字，全部已校对，无 OCR 包
for(const [t,n] of [['upper',100],['lower',200]]){
 const [l]=lib(1,'cn',t);assert.equal(l.reviewStatus,'reviewed');
 const ch=l.packs.find(p=>p.kind==='characters');assert.equal(ch.items.length,n);assert.equal(new Set(ch.items.map(i=>i.text)).size,n);
 assert.ok(ch.items.every(i=>i.sourceRef.status==='reviewed'&&i.sourceRef.sources.length>=2));
 assert.ok(!l.packs.some(p=>p.origin==='user-provided-ocr'));
}
assert.equal(lib(1,'cn','upper')[0].packs[0].items.map(i=>i.text).join('').slice(0,8),'一二三上口耳目手');
for(const bad of ['另','办','爪'])assert.ok(!lib(1,'cn','upper')[0].packs[0].items.some(i=>i.text===bad),'1上 OCR 误字已去掉：'+bad);
for(const bad of ['舌','嘴','饼','址','開','釋','獎'])assert.ok(!lib(1,'cn','lower')[0].packs[0].items.some(i=>i.text===bad),'1下 OCR 误字已去掉：'+bad);
// 2上：部分已校对；2下及以上：待收录且不可选
assert.equal(lib(2,'cn','upper')[0].reviewStatus,'partial');assert.equal(lib(2,'cn','upper')[0].packs[0].items.length,X['cn-2-upper'].total);
for(const [g,t] of [[2,'lower'],[3,'upper'],[6,'lower']]){const [l]=lib(g,'cn',t);assert.ok(l.pending);assert.equal(l.packs.length,0);assert.match(l.title,/待收录/);}
// 没有任何 OCR 提取稿进入目录；英语单元去重、残缺单元隐藏
assert.ok(!C.lessons.some(l=>l.contentStatus==='ocr-draft'));
assert.ok(!C.lessons.some(l=>/^bank-en-ocr-/.test(l.id)));
for(const g of [3,4,5,6])for(const t of ['upper','lower']){const rows=lib(g,'en',t);assert.ok(rows.length<=6,g+t+' '+rows.length);assert.equal(new Set(rows.map(l=>l.title)).size,rows.length);assert.ok(!rows.some(l=>/Unit (7|8|9|1\d)/.test(l.title)));}
assert.ok(!lib(6,'en','lower').some(l=>/How tall/.test(l.title)),'6下 Unit 1 只有 1 个词，隐藏');
assert.ok(lib(6,'en','lower').some(l=>/Then and now/.test(l.title)));
// 2上：106 字，无重复，全部有 ≥2 个来源；首课 8 字（A+C 一致）已收录，冲突字（升/起/数/灾/知）未收录
{const it=lib(2,'cn','upper')[0].packs[0].items;assert.equal(it.length,106);assert.equal(new Set(it.map(i=>i.text)).size,106);
 assert.equal(it.filter(i=>i.group==='小蝌蚪找妈妈').map(i=>i.text).join(''),'两条哪宽那短孩成');
 for(const bad of ['升','起','数','灾','知'])assert.ok(!it.some(i=>i.text===bad),'2上 来源冲突字未收录：'+bad);}
// 每册总数与无重复
for(const k of Object.keys(X)){const s=X[k].groups.map(g=>g.chars).join('');assert.equal(s.length,X[k].total,k);assert.equal(new Set(s).size,s.length,k);}
assert.equal(X['cn-2-lower'].status,'pending');assert.equal(X['cn-2-lower'].total,0);
assert.equal(G.volumeStatus('cn',1,'upper'),'reviewed');assert.equal(G.volumeStatus('cn',2,'lower'),'pending');
console.log('PASS: reviewed 写字表 1上/1下, partial 2上, 待收录 others, no OCR drafts, English deduped');
