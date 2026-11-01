const assert=require('node:assert/strict'),D=require('./data.js'),E=require('./engine.js');
function painted(practiceMode,fillPage=false){
 const output=[],target={measureText:text=>({width:Array.from(text).length*20}),fillText(text){output.push({text,color:ctx.fillStyle});}};
 const ctx=new Proxy(target,{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});
 const canvas={getContext:()=>ctx};
 const state={...D.defaults('hanzi'),text:'天地',traceNum:3,showPinyin:true,practiceMode,fillPage,readings:{天:'tiān',地:'dì'}};
 const model=E.build('hanzi',state,text=>text.length*20);E.drawPage(canvas,model,0,1);return {output,model};
}
const trace=painted('trace'),copy=painted('copy'),quiz=painted('quiz'),answer=painted('answer');
assert.equal(trace.output.filter(i=>i.text==='天').length,3);
assert.equal(copy.output.filter(i=>i.text==='天').length,1);
assert.ok(!quiz.output.some(i=>['天','地'].includes(i.text)),'question paper must not render answers');
assert.ok(quiz.output.some(i=>i.text==='tiān'));
assert.equal(answer.output.filter(i=>i.text==='天').length,1);
assert.ok(answer.output.some(i=>i.text.includes('答案版')));
assert.deepEqual(quiz.model.rows,answer.model.rows);assert.equal(quiz.model.pages,answer.model.pages);assert.deepEqual(quiz.model.g,answer.model.g);
assert.equal(quiz.model.state.text,'天地');
console.log('PASS: trace, copy, questions hide answers, answer paper matches questions without mutating text');

const full=painted('trace',true),fullQuiz=painted('quiz',true);assert.ok(full.output.filter(i=>i.text==='天').length>trace.output.filter(i=>i.text==='天').length);assert.equal(full.model.rows.length%full.model.g.rows,0);assert.ok(!fullQuiz.output.some(i=>['天','地'].includes(i.text)));
