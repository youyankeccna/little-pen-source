const assert=require('node:assert/strict'),D=require('./data.js'),E=require('./engine.js'),G=require('./printable-guides.js');
assert.equal(Object.keys(G.letters).length,52);
for(const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')assert(G.letters[char]?.length);
for(const stage of G.stages)for(const code of stage.codes)assert(G.patterns[code]&&D.patternCodes.includes(code));
const measure=t=>Array.from(t).length*20,base={...D.defaults('hanzi'),size:18,text:'小明\n小红',fillPage:true,batchNames:['小明','小红'],showHeader:true,header:{title:'姓名练习',name:'',className:'一年级',date:'2026-10-24'}};
const model=E.build('hanzi',base,measure);assert.equal(model.pages,2);assert.equal(model.sheets[0].state.text,'小明');assert.equal(model.sheets[1].state.text,'小红');assert.equal(model.sheets[0].state.header.name,'小明');assert.equal(model.sheets[1].state.header.name,'小红');assert.equal(base.header.name,'');
const geometry=E.geometry('hanzi',base);assert(geometry.rows<=E.geometry('hanzi',{...base,showHeader:false}).rows);assert(geometry.y>=base.padding[0]+56);assert(geometry.y+geometry.rows*geometry.rowHeight+(geometry.rows-1)*geometry.gap<=E.HEIGHT-base.padding[2]);
function paint(index){const output=[],ctx=new Proxy({measureText:t=>({width:measure(t)}),fillText:t=>output.push(t)},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});E.drawPage({getContext:()=>ctx},model,index,1);return output;}
const one=paint(0).join(''),two=paint(1).join('');assert(one.includes('小明')&&!one.includes('小红'));assert(two.includes('小红')&&!two.includes('小明'));
const longNames=E.build('hanzi',{...base,size:30,showPinyin:true,batchNames:['一二三四五六','天地人']},measure);assert.equal(longNames.pageMap.filter(p=>p.index===1)[0].page,0);
console.log('PASS: 52 Latin guides, staged control paths, header geometry and private per-name page isolation');
