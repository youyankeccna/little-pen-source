const assert=require('node:assert/strict'),M=require('./math-vertical.js'),D=require('./data.js'),E=require('./engine.js'),C=require('./curriculum/data.js');
for(const [text,result]of [['868 × 48 = ____','41664'],['756 × 80 = ____','60480'],['1005 ÷ 5 = ____','201'],['24 ÷ 9 = ____ 余 ____','2 余 6'],['0 ÷ 8 = ____','0'],['26 ÷ 4 = ____','6.5'],['24.91 ÷ 5.3 = ____','4.7'],['88.4 ÷ 10 = ____','8.84'],['0.4 × 6.1 = ____','2.44'],['9.34 + 9.4 = ____','18.74'],['10 - 9.99 = ____','0.01']])assert.equal(M.parse(text).result,result,text);
for(const text of ['1/2 + 1/3 = ____','4 × 8 + 2 = ____','9 ÷ 0 = ____','1 ÷ 3 = ____','1 - 2 = ____','x + 1 = 4'])assert.equal(M.parse(text),null,text);
function at(layout,y){return layout.glyphs.filter(g=>g.y===y).sort((a,b)=>a.x-b.x).map(g=>g.c).join('');}
const mul=M.parse('868 × 48 = ____');assert.equal(at(mul,2),'6944');assert.equal(at(mul,3),'3472');assert.equal(at(mul,4),'41664');assert.equal(Math.max(...mul.glyphs.filter(g=>g.y===3).map(g=>g.x)),mul.width-2);
const add=M.parse('9.34 + 9.4 = ____');assert.equal(new Set(add.glyphs.filter(g=>g.c==='.').map(g=>g.x)).size,1);
const division=M.parse('936 ÷ 39 = ____');assert.equal(at(division,0),'24');assert.equal(at(division,2),'78');assert.equal(at(division,3),'156');assert.equal(at(division,4),'156');assert.equal(at(division,5),'0');
let checked=0;for(const lesson of C.lessons.filter(l=>l.materialLibrary&&l.subject==='math')){
 const items=lesson.packs.find(p=>p.kind==='calculations').items;
 for(const item of items){const layout=M.parse(item.text);if(layout){assert.equal(layout.result,item.answer,item.text);checked++;}}
 for(const size of [8,20]){const state={...D.defaults('paragraph'),text:items.slice(0,20).map(i=>i.text).join('\n'),size,mathLayout:'trace',padding:[100,100,100,100],showHeader:true,fillPage:true};const m=E.build('paragraph',state,t=>t.length*20);for(const page of m.mathPages)for(const card of page){assert(card.y>=180);assert(card.y+card.height<=E.HEIGHT-116);if(card.layout){for(const g of card.layout.glyphs)assert(g.x>=0&&g.x<card.layout.width);}}assert.equal(state.text,m.state.text);}
}
assert.equal(checked,1765);
const twenty=C.getLesson('bank-math-4-upper-mul-two').packs.find(p=>p.kind==='calculations').items.slice(0,20).map(i=>i.text).join('\n');
const compact=E.build('paragraph',{...D.defaults('paragraph'),size:10,text:twenty,mathLayout:'trace'},t=>t.length*20);assert.equal(compact.pages,3);assert.equal(compact.mathPages[0].length,7);
for(const page of compact.mathPages)for(const card of page)for(const glyph of card.layout.glyphs)assert(38+glyph.y*card.cell*1.15+card.cell*.45<card.height);
const state={...D.defaults('paragraph'),text:'868 × 48 = ____\n9 ÷ 0 = ____',mathLayout:'trace'},m=E.build('paragraph',state,t=>t.length*20);
assert.equal(m.unsupported,1);assert.equal(m.rows.length,2);assert.equal(E.build('paragraph',{...state,mathLayout:'horizontal'},t=>t.length*20).mathPages,undefined);
console.log('PASS: 1765 bank results, partial-product shifts, decimal alignment, long division, fallback and A4 bounds');
