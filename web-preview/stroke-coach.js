'use strict';
window.StrokeCoach=(()=>{
 let writer=null,target=null,ticket=0;const characterData={};
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn)=>{const b=node('button',text);b.type='button';b.className='button outline';b.onclick=fn;return b;};
 function stop(){ticket++;if(writer){writer.cancelQuiz();writer.pauseAnimation();}}
 async function open(char,characters=[char]){
  stop();const own=ticket,dialog=document.getElementById('stroke-guide-dialog'),body=document.getElementById('stroke-guide-body');
  document.getElementById('stroke-guide-title').textContent=char+' · 看笔顺与跟写';body.replaceChildren(node('p','正在准备书写练习…'));if(!dialog.open)dialog.showModal();
  try{
   const response=await fetch('vendor/hanzi/'+encodeURIComponent(char)+'.json');if(!response.ok)throw Error('这个字暂未收录笔顺，可先观察字帖范字。');
   const data=await response.json();if(own!==ticket||!dialog.open)return;
   if(!data.strokes?.length||!data.medians?.length)throw Error('这个字暂不支持跟写，可先使用纸上练习。');
   body.replaceChildren();const choices=node('div');choices.className='coach-characters';
   for(const c of characters){const b=button(c,()=>open(c,characters));b.setAttribute('aria-pressed',String(c===char));choices.append(b);}body.append(choices);
   target=target||node('div');target.id='coach-writing-area';target.className='coach-writing-area';target.setAttribute('aria-label',char+'的手写区域');
   const size=Math.max(180,Math.min(300,window.innerWidth-100));target.style.width=size+'px';target.style.height=size+'px';body.append(target);
   const status=node('p','共 '+data.strokes.length+' 笔。先看演示，再尝试跟写。');status.id='coach-status';status.setAttribute('aria-live','polite');body.append(status);
   characterData[char]=data;
   if(writer){writer.updateDimensions({width:size,height:size,padding:18});await writer.setCharacter(char);writer.resumeAnimation();writer.showOutline({duration:0});writer.showCharacter({duration:0});writer.updateColor('radicalColor','#9b6031');}else writer=HanziWriter.create(target,char,{width:size,height:size,padding:18,showCharacter:true,showOutline:true,strokeColor:'#283f34',radicalColor:'#9b6031',outlineColor:'#e3e9e4',highlightColor:'#287653',showHintAfterMisses:3,strokeAnimationSpeed:1,delayBetweenStrokes:450,charDataLoader:c=>characterData[c]});
   if(own!==ticket||!dialog.open)return;
   const current=writer;let step=0,run=0;
   const active=()=>own===ticket&&dialog.open;
   function quiz(outline){run++;current.cancelQuiz();current.resumeAnimation();outline?current.showOutline():current.hideOutline();status.textContent=outline?'从第一笔开始，沿着轮廓写。':'轮廓已隐藏，试着独立写；需要时可返回跟写。';current.quiz({onCorrectStroke:d=>{if(active())status.textContent='第 '+(d.strokeNum+1)+' 笔完成，还剩 '+d.strokesRemaining+' 笔。';},onMistake:()=>{if(active())status.textContent='再看看起点和方向，慢慢试一次。';},onComplete:()=>{if(active())status.textContent='这一遍按笔顺完成了！可以再写一次，或回到纸上练习。';}});}
   const actions=node('div');actions.className='coach-actions';actions.append(button('先看演示',async()=>{const id=++run;current.cancelQuiz();current.showOutline();status.textContent='正在演示，观察每一笔的起点和方向。';await current.animateCharacter();if(active()&&id===run)status.textContent='演示完成，可以点击跟着写。';}),button('跟着写',()=>quiz(true)),button('独立写',()=>quiz(false)),button('下一笔',async()=>{const id=++run;current.cancelQuiz();current.resumeAnimation();current.showOutline();await current.hideCharacter();if(!active()||id!==run)return;await current.animateStroke(step);if(active()&&id===run){status.textContent='第 '+(step+1)+' / '+data.strokes.length+' 笔';step=(step+1)%data.strokes.length;}}));body.append(actions);
   const radical=node('label'),check=node('input');check.type='checkbox';check.checked=true;check.onchange=()=>current.updateColor('radicalColor',check.checked?'#9b6031':'#283f34');radical.append(check,document.createTextNode('突出部首笔画（有对应数据时）'));body.append(radical,node('p','手指或鼠标都可以跟写。反馈仅用于笔顺练习，不评判字写得是否漂亮；字形请结合老师指定范字。'));
   const source=node('a','Hanzi Writer · 本地笔顺数据');source.href='https://hanziwriter.org/';source.target='_blank';source.rel='noopener';body.append(source);
  }catch(error){if(own===ticket&&dialog.open)body.replaceChildren(node('p',error.message));}
 }
 function openText(text){const chars=[...new Set(Array.from(text).filter(c=>/[\u4e00-\u9fff]/.test(c)))].slice(0,40);if(chars.length)open(chars[0],chars);}
 document.getElementById('stroke-guide-dialog').addEventListener('close',stop);
 window.addEventListener('hashchange',()=>{const dialog=document.getElementById('stroke-guide-dialog');if(dialog.open)dialog.close();});
 return {open,openText};
})();
