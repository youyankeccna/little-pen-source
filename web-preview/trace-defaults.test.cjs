const assert=require('node:assert/strict'),fs=require('fs');
globalThis.WorkbookData=require('./data.js');const D=globalThis.WorkbookData;
// P1-5：默认文字适合一年级（全部出自 1上写字表），描红格数全站一致
const X=require('./curriculum/reviewed-xiezi.js'),first=X['cn-1-upper'].groups.map(g=>g.chars).join('');
const def=D.defaults('hanzi');assert.equal(def.text,'大小天人');for(const c of def.text)assert.ok(first.includes(c),c+' 应在 1上写字表');
assert.equal(D.traceCount(1),4);assert.equal(D.traceCount(2),4);assert.equal(D.traceCount(3),3);
assert.equal(def.traceNum,D.traceCount(1),'编辑器默认与首页一致');
const P=require('./practice-tools.js'),L=require('./learning-rules.js');globalThis.PracticeTools=P;
const CL=require('./course-layout.js');
for(const g of [1,2,3,5]){
 assert.equal(P.ageConfig(D.defaults('hanzi'),'hanzi',g,'cn').traceNum,D.traceCount(g),'ageConfig '+g);
 assert.equal(L.presetConfig(D.defaults('hanzi'),'hanzi','trace',g).traceNum,D.traceCount(g),'preset '+g);
 assert.equal(CL.defaults({type:'hanzi',text:'大',grade:g,subject:'cn',kind:'characters'}).traceNum,D.traceCount(g),'course '+g);
}
const ep=fs.readFileSync(__dirname+'/editor-panel.js','utf8');assert.ok(ep.includes('1 个范字 + 3 个描红'));
for(const f of ['app.js','data.js','index.html'])assert.ok(!fs.readFileSync(__dirname+'/'+f,'utf8').includes('你好世界'),f);
console.log('PASS: grade-1 default text, one trace-count rule for home, editor, presets, courses');
