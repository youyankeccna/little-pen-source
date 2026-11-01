'use strict';
window.FamilyWorks=(()=>{
 let ticket=0,urls=[],trash=false;
 const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const button=(text,action)=>{const b=node('button',text,'button outline');b.type='button';b.onclick=action;return b;};
 function clear(){ticket++;urls.forEach(URL.revokeObjectURL);urls=[];}
 async function open(){
  clear();const own=ticket,box=document.getElementById('personal-view');box.replaceChildren();
  const heading=node('header',undefined,'personal-heading');heading.append(node('h1','作品墙与练字星星'),node('p','按孩子私密保存，与小程序使用同一份记录。'));box.append(heading);
  await WorkbookAccount.ready;const user=WorkbookAccount.user(),scope=WorkbookAccount.scope();
  if(!user){box.append(node('p','登录后可以查看孩子的作品。'),button('登录并查看',()=>WorkbookAccount.openLogin()));return;}
  const active=()=>own===ticket&&scope===WorkbookAccount.scope()&&location.hash.split('?')[0]==='#/works';
  const status=node('p','正在读取作品…');box.append(status);
  try{
   const [list,summary,progress]=await Promise.all([WorkbookAccount.request('/api/works?trash='+(trash?'1':'0')),WorkbookAccount.request('/api/works/summary'),WorkbookAccount.request('/api/writing/progress')]);if(!active())return;
   status.textContent='本周 '+summary.thisWeek+' 件作品 · 上周 '+summary.lastWeek+' 件 · 今天 '+progress.stars+' 颗练字星星';
   const panel=node('section',undefined,'personal-panel'),actions=node('div',undefined,'personal-actions');actions.append(button(trash?'返回作品墙':'查看回收站',()=>{trash=!trash;open();}),button('刷新',open));panel.append(actions,node('p',summary.message));box.append(panel);
   if(!list.works.length){panel.append(node('p',trash?'回收站里还没有作品。':'还没有保存作品。可在小程序中拍照保存，或完成屏幕跟写后留存。'));return;}
   const compare=node('section',undefined,'works-comparison'),compareGrid=node('div',undefined,'saved-grid'),chosen=new Map();compare.append(node('h2','选两件作品，一起回顾'),node('p','选同一个字的作品，找找值得表扬的一笔。'),compareGrid);if(!trash)panel.append(compare);
   const grid=node('div',undefined,'saved-grid works-grid');panel.append(grid);
   const rows=list.works.slice(0,40);
   for(const work of rows){
    const card=node('article',undefined,'saved-card'),photo=node('img',undefined,'family-work-picture');photo.alt=work.title+'，'+work.date;photo.loading='lazy';card.append(node('h2',work.title),node('p',work.date+' · '+(work.kind==='trace'?'屏幕跟写':'纸上作品')));if(!trash)card.append(photo);
    if(!trash){const label=node('label',undefined,'work-compare-choice'),check=node('input');check.type='checkbox';label.append(check,document.createTextNode('加入对比'));card.append(label);check.onchange=()=>{if(check.checked){if(chosen.size>=2){check.checked=false;return;}chosen.set(work.id,{work,photo});}else chosen.delete(work.id);compareGrid.replaceChildren();for(const {work,photo}of chosen.values()){const item=node('div');item.append(photo.cloneNode(),node('p',work.date+' · '+work.title));compareGrid.append(item);}};}
    const action=button(trash?'恢复作品':'移入回收站',async()=>{action.disabled=true;try{await WorkbookAccount.request('/api/works/'+work.id+(trash?'/restore':''),{method:trash?'POST':'DELETE',body:'{}'});if(active())open();}catch(error){if(active())status.textContent=error.message;}finally{action.disabled=false;}});card.append(action);grid.append(card);
    if(!trash){fetch('/api/v1/works/'+work.id+'/image',{credentials:'same-origin',headers:{'X-Child-Id':user.activeChildId}}).then(async response=>{if(!response.ok)throw Error();const blob=await response.blob();if(!active())return;const url=URL.createObjectURL(blob);urls.push(url);photo.src=url;}).catch(()=>{if(active())photo.alt='图片暂未载入，请刷新。';});}
   }
   if(list.works.length>40)panel.append(node('p','当前展示最近40件作品，更多作品可在小程序按日期查找。'));
   panel.append(node('p','照片由家长留存；当前没有对照片进行 AI 评分。'));
  }catch(error){if(active())status.textContent=error.message;}
 }
 const menu=button('作品墙与星星',()=>{document.getElementById('account-user').open=false;location.hash='#/works';});document.getElementById('account-library').after(menu);
 window.addEventListener('hashchange',()=>{if(location.hash.split('?')[0]!=='#/works')clear();});
 window.addEventListener('accountchange',()=>{if(location.hash.split('?')[0]==='#/works')open();else clear();});
 return {open};
})();
