'use strict';
/* 内容审核闸门：只把已校对的整册内容交给页面。
   - 用户导入的教材 OCR 稿（contentStatus: ocr-draft）一律不在目录中出现；
   - 语文整册素材只保留校对过的写字表（ReviewedXiezi），未校对的册次标为“待收录”，不可选择；
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
  if(!v||v.status==='pending'||!v.groups.length)return {...l,packs:[],pending:true,title:l.grade+'年级'+(l.term==='upper'?'上册':'下册')+'语文 · 待收录',reviewStatus:'pending',note:'本册写字表尚未完成校对，暂不提供教材内容。'};
  const own=l.packs.filter(p=>!OCR_KINDS.has(p.kind)&&p.origin!=='user-provided-ocr');
  return {...l,title:l.grade+'年级'+(l.term==='upper'?'上册':'下册')+'语文 · 写字表'+(v.status==='partial'?'（部分已校对）':'（已校对）'),packs:[reviewedCharacters(l,v),...own],reviewStatus:v.status==='reviewed'?'reviewed':'partial',note:v.status==='reviewed'?'写字表已与多个公开来源逐字核对（见 docs/curriculum-review.md）；其余为本站自编巩固内容。':'仅收录两个来源一致的 '+v.total+' 个写字表字，其余待收录；其余为本站自编巩固内容。'};
 }
 function gateEnBank(l){
  if(/^bank-en-ocr-/.test(l.id))return null;
  const vocab=l.packs.find(p=>p.kind==='vocabulary');if(!vocab||vocab.items.length<5)return null;
  let title=l.title;for(const [bad,good] of Object.entries(EN_FIX))title=title.replace(bad,good);
  return {...l,title};
 }
 function apply(lessons){
  const out=[];
  for(const l of lessons){
   if(l.contentStatus==='ocr-draft')continue;
   if(/^bank-cn-/.test(l.id)){out.push(gateCnBank(l));continue;}
   if(/^bank-en-/.test(l.id)){const g=gateEnBank(l);if(g)out.push(g);continue;}
   out.push(l);
  }
  return out;
 }
 const api={apply,volumeStatus,reviewed};
 root.ReviewGate=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
