'use strict';
/* 内容闸门：只把已校对的整册内容交给页面。
   - 用户导入的教材 OCR 稿（contentStatus: ocr-draft）一律不在目录中出现；
   - 语文整册素材只保留校对过的写字表（ReviewedXiezi），未校对的册次标为“整理中”，不可选择；
   - 页面文字里不出现 OCR/提取/审核/校对 一类的内部状态说明（clean）；
   - 英语只保留一套人教版单元，去掉重复/残缺的 OCR 单元。 */
(function(root){
 const reviewed=root.ReviewedXiezi||(typeof require==='function'?require('./reviewed-xiezi.js'):{});
 const OCR_KINDS=new Set(['characters','words','sentences','chineseTexts']);
 const EN_FIX={'Then ano now':'Then and now','The weather and usl':'The weather and us'};
 function volumeKey(l){return l.subject+'-'+l.grade+'-'+l.term;}
 function volumeStatus(subject,grade,term){const v=reviewed[subject+'-'+grade+'-'+term];return v?v.status:(subject==='cn'?'pending':'unknown');}
 function reviewedCharacters(l,v){
  const items=[];let n=0;
  for(const g of v.groups)for(const ch of g.chars)items.push({id:'rv-'+(++n),text:ch,group:g.label,sourceRef:{status:v.status==='reviewed'?'reviewed':'cross-checked',section:'写字表 · '+g.label,sources:v.sources}});
  return {kind:'characters',origin:'cross-checked-list',items};
 }
 function gateCnBank(l){
  const v=reviewed[volumeKey(l)];
  if(!v||v.status==='pending'||!v.groups.length)return {...l,packs:[],pending:true,title:l.grade+'年级'+(l.term==='upper'?'上册':'下册')+'语文 · 整理中',reviewStatus:'pending',note:'本册整理中。'};
  const own=l.packs.filter(p=>!OCR_KINDS.has(p.kind)&&p.origin!=='user-provided-ocr');
  return {...l,title:l.grade+'年级'+(l.term==='upper'?'上册':'下册')+'语文 · 写字表',packs:[reviewedCharacters(l,v),...own],reviewStatus:v.status==='reviewed'?'reviewed':'partial',note:'本册写字表 '+v.total+' 字；其余为本站自编巩固内容。'};
 }
 function gateEnBank(l){
  if(/^bank-en-ocr-/.test(l.id))return null;
  const vocab=l.packs.find(p=>p.kind==='vocabulary');if(!vocab||vocab.items.length<5)return null;
  let title=l.title;for(const [bad,good] of Object.entries(EN_FIX))title=title.replace(bad,good);
  return {...l,title};
 }
 const INTERNAL=/OCR|ocr|提取|审核|校对|待收录|非完整|待核|待补齐|待确认|待校订|识别|尚未确认|不是教材|非教材|非限定|待核验/;
 const TEXT_KEYS=['title','unit','note','edition','section','label','notice','scope','basis'];
 function cleanText(s){if(typeof s!=='string'||!INTERNAL.test(s))return s;return s.split(/[；;。]|\s·\s|（[^）]*）|\([^)]*\)/).map(x=>x&&x.trim()).filter(x=>x&&!INTERNAL.test(x)).join(' · ');}
 function clean(o,depth=0){if(!o||typeof o!=='object'||depth>4)return o;if(Array.isArray(o))return o.map(x=>clean(x,depth+1));const r={...o};for(const k of Object.keys(r)){if(TEXT_KEYS.includes(k))r[k]=cleanText(r[k]);else if(r[k]&&typeof r[k]==='object'&&k!=='sources')r[k]=clean(r[k],depth+1);}return r;}
 function apply(lessons){
  const out=[];
  for(const l of lessons){
   if(l.contentStatus==='ocr-draft')continue;
   if(/^bank-cn-/.test(l.id)){out.push(gateCnBank(l));continue;}
   if(/^bank-en-/.test(l.id)){const g=gateEnBank(l);if(g)out.push(g);continue;}
   out.push(l);
  }
  return out.map(l=>clean(l));
 }
 const api={apply,volumeStatus,reviewed,cleanText};
 root.ReviewGate=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
