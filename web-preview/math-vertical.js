(function(root){
'use strict';
const decimal=s=>({digits:s.replace('.',''),places:(s.split('.')[1]||'').length});
const power=n=>10n**BigInt(n);
function fixed(n,p){const sign=n<0n?'-':'';let s=String(n<0n?-n:n).padStart(p+1,'0');return sign+(p?s.slice(0,-p)+'.'+s.slice(-p):s);}
function trimmed(s){return s.includes('.')?s.replace(/0+$/,'').replace(/\.$/,''):s;}
function parse(text){
 const match=text.match(/^\s*(\d+(?:\.\d+)?)\s*([+\-×÷])\s*(\d+(?:\.\d+)?)\s*=/);
 if(!match)return null;
 const [,a,op,b]=match,A=decimal(a),B=decimal(b);
 if(A.digits.length>9||B.digits.length>9)return null;
 const glyphs=[],lines=[];let height=3,width=1,result='',note='';
 const put=(value,right,row)=>{let x=right;for(const c of [...value].reverse()){if(c==='.')glyphs.push({c,x:x+.5,y:row});else{glyphs.push({c,x,y:row});x--;}}};
 const bar=(left,right,row)=>lines.push({x1:left,y1:row,x2:right,y2:row});
 if(op==='+'||op==='-'){
  const p=Math.max(A.places,B.places),ai=BigInt(A.digits)*power(p-A.places),bi=BigInt(B.digits)*power(p-B.places),answer=op==='+'?ai+bi:ai-bi;
  if(answer<0n)return null;
  const values=[fixed(ai,p),fixed(bi,p),fixed(answer,p)];result=trimmed(values[2]);width=Math.max(...values.map(v=>v.replace('.','').length))+1;
  values.forEach((v,i)=>put(v,width-1,i));glyphs.push({c:op,x:0,y:1});bar(-.4,width-.5,1.55);note=p?'小数点对齐':'相同数位对齐';
 }else if(op==='×'){
  const ai=BigInt(A.digits),bi=BigInt(B.digits),p=A.places+B.places;result=trimmed(fixed(ai*bi,p));
  width=Math.max(String(ai*bi).length,A.digits.length,B.digits.length,p+1)+1;
  put(a,width-1,0);put(b,width-1,1);glyphs.push({c:'×',x:0,y:1});bar(-.4,width-.5,1.55);
  let row=2;
  if(B.digits.length>1){[...B.digits].reverse().forEach((d,i)=>put(String(ai*BigInt(d)),width-1-i,row++));bar(-.4,width-.5,row-.45);}
  put(fixed(ai*bi,p),width-1,row);height=row+1;note=p?'先按整数相乘，再确定小数点':'分步积按数位错开';
 }else{
  const divisor=BigInt(B.digits);if(divisor===0n)return null;
  const fraction=A.places>0||B.places>0||!text.includes('余');
  let shifted=fixed(BigInt(A.digits),Math.max(0,A.places-B.places));if(B.places>A.places)shifted=String(BigInt(A.digits)*power(B.places-A.places));
  const integerLength=shifted.split('.')[0].length,digits=shifted.replace('.','').split('');
  let remaining=0n,started=false,quotient='',row=2;const offset=String(divisor).length+1,steps=[];
  for(let i=0;i<digits.length;i++){
   const current=remaining*10n+BigInt(digits[i]),q=current/divisor;remaining=current%divisor;
   if(q>0n||started||i===integerLength-1){started=true;quotient+=String(q);glyphs.push({c:String(q),x:offset+i,y:0});steps.push({current,product:q*divisor,remainder:remaining,index:i});}
   if(i===integerLength-1&&fraction&&((remaining!==0n)||i<digits.length-1)){quotient+='.';glyphs.push({c:'.',x:offset+i+.5,y:0});}
   if(i===digits.length-1&&fraction&&remaining!==0n){if(digits.length-integerLength>=6)return null;digits.push('0');}
  }
  let dividend=digits.join('');if(fraction&&digits.length>integerLength)dividend=dividend.slice(0,integerLength)+'.'+dividend.slice(integerLength);
  put(String(divisor),offset-2,1);put(dividend,offset+digits.length-1,1);bar(offset-.55,offset+digits.length-.5,.55);lines.push({x1:offset-.55,y1:.55,x2:offset-.8,y2:1.5});
  steps.forEach((step,i)=>{if(i)put(String(step.current),offset+step.index,row++);put(String(step.product),offset+step.index,row++);bar(offset+step.index-String(step.current).length+.5,offset+step.index+.5,row-.45);});
  put(String(remaining),offset+digits.length-1,row);height=row+1;width=offset+digits.length;result=trimmed(quotient)+(remaining?' 余 '+remaining:'');
  note=B.places?'同时移动小数点：'+shifted+' ÷ '+divisor:'商写在对应数位上';
 }
 return {a,b,op,result,note,glyphs,lines,width,height};
}
function build(state,WIDTH,HEIGHT){
 const entries=state.text.split(/\r?\n/).filter(s=>s.trim()).map((text,index)=>({text,index:index+1,layout:parse(text)}));
 const top=state.padding[0]+(state.showHeader?56:0)+24,bottom=HEIGHT-state.padding[2]-16,available=WIDTH-state.padding[1]-state.padding[3];
 const panelWidth=(available-24)/3,unit=Math.max(12,Math.min(26,state.size*3.78*.45));
 const pages=[[]];let y=top;
 for(const entry of entries){const l=entry.layout,cell=l?Math.min(unit,(panelWidth-24)/(l.width+1),(bottom-top-38)/(l.height*1.15)):unit;
  const height=l?Math.ceil(l.height*cell*1.15+38):64;
  if(y+height>bottom&&pages.at(-1).length){pages.push([]);y=top;}
  pages.at(-1).push({...entry,y,height,cell});y+=height+8;
 }
 if(state.fillPage&&entries.length){const templates=pages.flat(),last=pages.at(-1);let i=0;while(i<templates.length){const item=templates[i++];if(y+item.height>bottom)break;last.push({...item,y});y+=item.height+8;}}
 return {mathPages:pages,rows:entries.map(e=>e.text),pages:pages.length,g:{rows:pages[0].length},state:structuredClone(state),type:'paragraph',mathWidth:available,mathPanelWidth:panelWidth,unsupported:entries.filter(e=>!e.layout).length};
}
function draw(ctx,model,pageIndex,WIDTH,HEIGHT,family){
 const s=model.state,answer=s.mathLayout==='answers',x=s.padding[3],w=model.mathWidth,panel=model.mathPanelWidth;
 const label=(text,xx,yy,color='#42584a',max=w)=>{ctx.fillStyle=color;ctx.font='12px "LXGW WenKai", Arial';ctx.textAlign='left';ctx.fillText(text,xx,yy,max);};
 label(answer?'竖式答案 · 核对每一步':'竖式临摹 · 看范例，再描红，最后自己写',x,s.padding[0]+(s.showHeader?56:0)+14);
 for(const item of model.mathPages[pageIndex]){
  const {layout:l,y,height,cell}=item;
  if(!l){label(item.index+'. '+item.text,x,y+16);label('此题保留原式练习',x,y+40,'#66796b');ctx.strokeStyle='#dce3dd';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y+height-10);ctx.lineTo(x+w,y+height-10);ctx.stroke();continue;}
  label(item.index+'. '+l.a+' '+l.op+' '+l.b+' = '+l.result+'    ·    '+l.note,x,y+8);
  for(let n=0;n<3;n++){
   const px=x+n*(panel+12),start=px+(panel-l.width*cell)/2+cell/2,base=y+38;
   label(answer?(n===0?'计算过程':'自己核对'):['范例','描红','自己写'][n],px+8,y+22,'#66796b',panel-16);
   ctx.strokeStyle=s.lineColor+'55';ctx.lineWidth=.6;ctx.strokeRect(px,y+28,panel,height-28);
   if((answer&&n>0)||n===2)continue;
   const ink=n===0?'#263c32':s.traceColor;ctx.fillStyle=ink;ctx.font=`${s.fontWeight==='bold'?'700':'400'} ${cell*.9}px ${family}`;ctx.textAlign='center';
   for(const g of l.glyphs)ctx.fillText(g.c,start+g.x*cell,base+g.y*cell*1.15);
   ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.beginPath();for(const line of l.lines){ctx.moveTo(start+line.x1*cell,base+line.y1*cell*1.15);ctx.lineTo(start+line.x2*cell,base+line.y2*cell*1.15);}ctx.stroke();
  }
 }
 if(model.pages>1){ctx.fillStyle='#777';ctx.font='12px Arial';ctx.textAlign='center';ctx.fillText(String(pageIndex+1),WIDTH/2,HEIGHT-20);}
}
const api={parse,build,draw};root.MathVertical=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
