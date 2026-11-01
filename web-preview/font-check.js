'use strict';
window.FontCheck=(()=>{
 let coverage;
 async function inspect(current){
  const key=current.state.font==='pinyin2'?'wenkai':current.state.font;
  if(!['wenkai','italic'].includes(key))return {unknown:true,missing:[]};
  if(!coverage){const r=await fetch('vendor/font-coverage.json');if(!r.ok)throw Error('字体检查暂不可用，请重试。');coverage=await r.json();}
  const text=current.rows.map(r=>typeof r==='string'?r:r.examples||'').join('')+Object.values(current.state.readings||{}).join('')+(current.state.showHeader?Object.values(current.state.header||{}).join(''):'');
  const missing=[...new Set(Array.from(text))].filter(c=>!/[\s\u200b-\u200d]/u.test(c)&&!coverage[key].some(([a,b])=>c.codePointAt(0)>=a&&c.codePointAt(0)<=b));
  return {unknown:false,missing};
 }
 async function confirm(current,manual=false){
  const result=await inspect(current);
  if(!manual&&(result.unknown||!result.missing.length))return true;
  return new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','打印字体检查');
   const shell=document.createElement('div');shell.className='dialog-shell';dialog.append(shell);
   const title=document.createElement('h2');title.textContent='打印字体检查';shell.append(title);
   const info=document.createElement('p');info.textContent=result.unknown?'系统字体和临时导入字体无法精确核对字库。可以切换为本站文楷再检查，也可以保留当前字体并核对预览。':result.missing.length?'所选字体未收录：'+result.missing.slice(0,30).join('、')+(result.missing.length>30?' 等 '+result.missing.length+' 个字符':'')+'。设备可能使用替代字体，请核对字形。':'所选字体已收录本次正文字符。请同时核对拼音、排版和实际打印尺寸。';shell.append(info);
   const actions=document.createElement('div');actions.className='dialog-footer';shell.append(actions);
   const finish=value=>{dialog.close();dialog.remove();resolve(value);};
   if(current.state.font!=='wenkai'&&(result.unknown||result.missing.length)){
    const change=document.createElement('button');change.className='button primary';change.textContent='切换文楷并重新预览';change.onclick=()=>{document.dispatchEvent(new CustomEvent('use-verified-font'));finish(false);};actions.append(change);
   }
   const close=document.createElement('button');close.className='button outline';close.textContent=manual?'返回预览':'返回检查';close.onclick=()=>finish(false);actions.append(close);
   if(!manual){const keep=document.createElement('button');keep.className='button outline';keep.textContent='已核对预览，继续输出';keep.onclick=()=>finish(true);actions.append(keep);}
   dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);dialog.showModal();
  });
 }
 return {inspect,confirm};
})();
