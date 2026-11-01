'use strict';
window.MaterialLibrary=(()=>{
 const C=CurriculumData,B=MaterialBankData,by=id=>document.getElementById(id);
 let context,rows=[],current,kind,selected=new Set(),page=0,size=20,query='',bilingual=false,mathSettings={},englishMode='copy',quantity='page-1',planning=0,pendingEstimate=false,estimatedPages=null,quantityNotice='';
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn,cls='button outline')=>{const b=node('button',text,cls);b.type='button';b.onclick=fn;return b;};
 const options=(select,values,value)=>{for(const [id,label] of values){const o=node('option',label);o.value=id;select.append(o);}select.value=value;};
 function key(){return 'little-pen-materials-v1:'+(WorkbookAccount.scope()||'guest')+':'+[context.subject,context.grade,context.term,context.edition].join(':');}
 function save(){try{localStorage.setItem('little-pen-material-context:'+(WorkbookAccount.scope()||'guest'),JSON.stringify({grade:context.grade,term:context.term}));localStorage.setItem(key(),JSON.stringify({lesson:current?.id,kind,page,size,bilingual,mathSettings,englishMode,quantity,items:[...selected]}));}catch{}}
 function link(lesson,pack,ids){return '#/materials?'+new URLSearchParams({subject:lesson.subject,grade:lesson.grade,term:lesson.term,lesson:lesson.id,...(pack?{kind:pack.replace(/Bilingual$/,''),bilingual:pack.endsWith('Bilingual')?'1':'0'}:{}),...(ids?{items:ids.join(',')}:{})});}
 function group(){return current?.packs.find(p=>p.kind===kind);}
 function visibleItems(){const items=context.subject==='math'?PracticeTools.mathFilter(group()?.items||[],mathSettings):group()?.items||[];return items.filter(i=>!query||(i.text+' '+(i.translation||'')+' '+(i.caption||'')).toLocaleLowerCase().includes(query.toLocaleLowerCase()));}
 function manualSelection(){quantity='manual';by('bank-amount').value=quantity;quantityNotice='';save();estimate();}
 function selectPage(){for(const item of visibleItems().slice(page*size,(page+1)*size))selected.add(item.id);manualSelection();renderItems();}
 function targetKind(answer=false){let target=answer?'calculationAnswers':kind;if((bilingual||context.subject==='en'&&englishMode!=='copy'&&['vocabulary','phrases','extraPhrases'].includes(kind))&&current.packs.some(p=>p.kind===kind+'Bilingual'))target=kind+'Bilingual';return target;}
 function selectionFor(items){return C.getSelection(current.id,targetKind(),items.map(i=>typeof i==='string'?i:i.id));}
 function overrides(){return context.subject==='en'&&['vocabulary','phrases','extraPhrases'].includes(kind)?{englishMode}:{};}
 async function estimate(){
  const own=++planning,owner=WorkbookAccount.scope(),selection=selectionFor([...selected]);pendingEstimate=!!selection;estimatedPages=selection?null:0;updateCount();if(!selection)return;
  try{const build=await WorkbookPreview.prepare(selection,overrides());if(own!==planning||owner!==WorkbookAccount.scope()||!location.hash.startsWith('#/materials'))return;estimatedPages=selection.text.length>20000?Infinity:build(selection).pages;}
  catch{if(own!==planning)return;estimatedPages=null;quantityNotice='页数暂时无法估算，请在预览中核对。';}
  if(own===planning){pendingEstimate=false;updateCount();}
 }
 async function applyQuantity(candidates){
  if(quantity==='manual'){estimate();return;}
  const items=Array.isArray(candidates)?candidates:visibleItems().slice(page*size),own=++planning,owner=WorkbookAccount.scope(),goal=quantity;pendingEstimate=true;estimatedPages=null;quantityNotice='';updateCount();
  if(!items.length){selected.clear();pendingEstimate=false;estimatedPages=0;save();renderItems();return;}
  try{const seed=selectionFor(items.slice(0,1)),build=await WorkbookPreview.prepare(seed,overrides());if(own!==planning||owner!==WorkbookAccount.scope()||!location.hash.startsWith('#/materials'))return;
   const pagesFor=batch=>{const next=selectionFor(batch);return next.text.length>20000?Infinity:build(next).pages;};
   const result=goal.startsWith('page-')?PracticeTools.fitPages(items,Number(goal.slice(5)),pagesFor):{items:items.slice(0,Number(goal.slice(5))),overTarget:false};
   selected=new Set(result.items.map(i=>i.id));estimatedPages=result.items.length?pagesFor(result.items):0;
   quantityNotice=result.tooLong?'首项内容过长，请换一项或分段练习。':result.overTarget?'首项内容本身需要 '+result.pages+' 页，已完整保留；可减少字号或换内容。':result.items.length===items.length?'当前条件下可选内容已全部选中。':'';
   pendingEstimate=false;save();renderItems();
  }catch{if(own!==planning)return;pendingEstimate=false;quantityNotice='按页选量暂时不可用，可以直接勾选内容后预览。';updateCount();}
 }
 function changeKind(value){if(['calculations','calculationAnswers'].includes(kind)&&['calculations','calculationAnswers'].includes(value)){kind=value;save();renderTabs();renderItems();estimate();return;}kind=value;page=0;query='';by('bank-search').value='';size=/Texts|poems/.test(kind)?1:/Sentences|sentences|Excerpts/.test(kind)?5:20;selected.clear();quantity='page-1';by('bank-amount').value=quantity;renderTabs();renderItems();applyQuantity();}
 function chooseLesson(value,restore={}){
  planning++;pendingEstimate=false;estimatedPages=null;quantityNotice='';current=rows.find(l=>l.id===value)||rows[0];if(!current)return;mathSettings=restore.mathSettings||{};
  const packs=current.packs.filter(p=>!p.kind.endsWith('Bilingual'));kind=packs.some(p=>p.kind===restore.kind)?restore.kind:packs[0].kind;
  query='';by('bank-search').value='';size=/Texts|poems/.test(kind)?1:/Sentences|sentences|Excerpts/.test(kind)?5:20;
  page=Math.max(0,Math.min(Number(restore.page)||0,Math.ceil(group().items.length/size)-1));
  quantity=['page-1','page-2','page-3','item-1','item-5','item-10','item-20','item-40','manual'].includes(restore.quantity)?restore.quantity:Array.isArray(restore.items)?'manual':'page-1';by('bank-amount').value=quantity;
  selected=new Set(Array.isArray(restore.items)?restore.items.filter(id=>group().items.some(i=>i.id===id)):[]);
  if(restore.items?.length&&restore.page===undefined){const first=group().items.findIndex(i=>selected.has(i.id));if(first>=0)page=Math.floor(first/size);}
  by('bank-lesson').value=current.id;renderMathControls();renderTabs();renderItems();save();if(Array.isArray(restore.items))estimate();else applyQuantity();
 }
 function rememberEnglish(lesson,mode){
  const k='little-pen-materials-v1:'+(WorkbookAccount.scope()||'guest')+':'+[lesson.subject,lesson.grade,lesson.term,WorkbookAccount.edition(lesson.subject)].join(':');
  try{const prefs=JSON.parse(localStorage.getItem(k)||'{}');prefs.englishMode=mode;localStorage.setItem(k,JSON.stringify(prefs));}catch{}
 }
 function mathItems(lesson){
  let prefs={};try{prefs=JSON.parse(localStorage.getItem('little-pen-materials-v1:'+(WorkbookAccount.scope()||'guest')+':'+[lesson.subject,lesson.grade,lesson.term,WorkbookAccount.edition('math')].join(':'))||'{}');}catch{}
  return PracticeTools.mathFilter(lesson.packs.find(p=>p.kind==='calculations')?.items||[],prefs.lesson===lesson.id?prefs.mathSettings||{}:{});
 }
 function renderMathControls(){
  const panel=by('bank-math-options');panel.replaceChildren();panel.hidden=context.subject!=='math';if(panel.hidden)return;
  const items=current.packs.find(p=>p.kind==='calculations').items,problems=items.map(PracticeTools.integerProblem);
  const fields=[];
  if(problems.every(Boolean))fields.push(['level','数值难度',[['all','本专项全部'],['small','数值较小'],['large','数值较大']]]);
  if(problems.every(p=>p&&['+','-','−'].includes(p.op))&&new Set(problems.map(PracticeTools.regroup)).size>1)fields.push(['regroup','进位 / 退位',[['all','不限'],['no','不进位 / 不退位'],['yes','需要进位 / 退位']]]);
  if(problems.every(p=>p&&p.op==='÷')&&new Set(problems.map(p=>p.a%p.b!==0)).size>1)fields.push(['remainder','余数',[['all','不限'],['no','整除'],['yes','有余数']]]);
  for(const [field,title,values] of fields){const label=node('label',title),select=node('select');select.setAttribute('aria-label',title);options(select,values,mathSettings[field]||'all');select.onchange=()=>{mathSettings[field]=select.value;page=0;quantityNotice='';if(quantity==='manual'){const valid=new Set(visibleItems().map(i=>i.id));selected=new Set([...selected].filter(id=>valid.has(id)));save();renderItems();estimate();}else applyQuantity();};label.append(select);panel.append(label);}
  panel.append(button('换一套题',()=>{const items=visibleItems(),ids=PracticeTools.nextSet(items,quantity.startsWith('page-')?items.length:Math.max(selected.size,size),[...selected]),shuffled=ids.map(id=>items.find(i=>i.id===id));if(quantity==='manual'){selected=new Set(ids);save();renderItems();estimate();}else applyQuantity(shuffled);}));
  panel.append(node('small','默认生成竖式临摹，可在预览中切回横式；分数等题型保留原式。从本专项题库抽取，答案同步。进位、退位、余数可通过计算专项选择；组合条件仅在本题库同时包含时显示。'));
 }
 function renderTabs(){
  const tabs=by('bank-kinds');tabs.replaceChildren();
  for(const p of current.packs.filter(p=>!p.kind.endsWith('Bilingual'))){const b=button((p.label||C.kindInfo[p.kind].label)+' · '+p.items.length,()=>changeKind(p.kind));b.setAttribute('aria-pressed',String(p.kind===kind));tabs.append(b);}
 }
 function renderItems(){
  const p=group(),items=visibleItems(),list=by('bank-items');list.replaceChildren();
  list.className='bank-items '+(['characters','extraCharacters'].includes(kind)?'bank-characters':/Texts|sentences|Sentences|Excerpts|poems/.test(kind)?'bank-long':'');
  const translation=p.items.some(i=>i.translation);by('bank-bilingual-label').hidden=!translation;by('bank-bilingual').checked=bilingual;by('bank-english-mode-label').hidden=!(context.subject==='en'&&['vocabulary','phrases','extraPhrases'].includes(kind)&&translation);by('bank-english-mode').value=englishMode;by('bank-bilingual').disabled=!by('bank-english-mode-label').hidden&&englishMode!=='copy';
  by('bank-origin').textContent=C.originLabel(p.origin)+(translation?' · 中文释义可一同打印':'')+(/calculat/.test(kind)?' · 答案与同一批题目一一对应':'');
  const total=Math.ceil(items.length/size);page=Math.min(page,Math.max(0,total-1));
  for(const i of items.slice(page*size,(page+1)*size)){
   const label=node('label',undefined,'bank-item'),check=node('input');check.type='checkbox';check.checked=selected.has(i.id);check.setAttribute('aria-label','选择 '+i.text);check.onchange=()=>{if(check.checked)selected.add(i.id);else selected.delete(i.id);manualSelection();};
   const copy=node('span',undefined,'bank-item-copy');if(i.caption)copy.append(node('small',i.caption));copy.append(node('strong',i.text));if(i.translation)copy.append(node('span',i.translation,'bank-translation'));
   label.append(check,copy);list.append(label);
  }
  if(!items.length)list.append(node('p','没有找到匹配内容，试试换一个字词。','bank-empty'));
  by('bank-range').textContent=items.length?`第 ${page+1} 批 · ${page*size+1}–${Math.min((page+1)*size,items.length)} / ${items.length} 项`:'0 项';
  by('bank-prev').disabled=page===0;by('bank-next').disabled=page+1>=total;
  by('bank-answer').hidden=context.subject!=='math'||kind==='calculationAnswers';updateCount();
 }
 function updateCount(){
  if(!by('bank-selection'))return;const pages=pendingEstimate?' · 正在计算页数…':estimatedPages===Infinity?' · 内容过长':estimatedPages?' · 预计 '+estimatedPages+' 页 A4':'';
  by('bank-selection').textContent='已选 '+selected.size+' 项'+pages;const tooLarge=estimatedPages>20;by('bank-preview').disabled=by('bank-answer').disabled=!selected.size||pendingEstimate||tooLarge;
  by('bank-reselect').disabled=quantity==='manual';
  const shown=visibleItems().slice(page*size,(page+1)*size),outside=selected.size-shown.filter(i=>selected.has(i.id)).length;
  by('bank-quantity-note').textContent=(tooLarge?'每次最多 20 页，请减少选择。':quantityNotice||'搜索与翻批不会清除勾选；调整练习量或换题会重新选取。')+(outside?' 另有 '+outside+' 项在其他批次或搜索范围外。':'');
 }
 function preview(answer=false){
  const target=targetKind(answer);
  const selection=C.getSelection(current.id,target,[...selected]);if(!selection)return;
  if(selection.text.length>20000){by('bank-selection').textContent='所选内容过长，请分批练习。';return;}
  save();location.hash=WorkflowRules.editorUrl(selection)+(context.subject==='en'&&['vocabulary','phrases','extraPhrases'].includes(kind)?'&englishMode='+englishMode:'');
 }
 function open(params=new URLSearchParams()){
  planning++;let previous={};try{previous=JSON.parse(localStorage.getItem('little-pen-material-context:'+(WorkbookAccount.scope()||'guest'))||'{}');}catch{}
  const saved=WorkbookAccount.studyContext()||previous,subject=['cn','en','math'].includes(params.get('subject'))?params.get('subject'):saved.subject||'cn';
  const requested=C.getLesson(params.get('lesson'));
  if(saved.grade===0&&subject!=='en'&&!params.has('grade')){location.hash='#/early';return;}
  const grade=Number(params.get('grade')||saved.grade||1);context={subject,grade:WorkflowRules.normalizeGrade(grade,subject,false),term:['upper','lower'].includes(params.get('term'))?params.get('term'):saved.term||'upper',edition:WorkbookAccount.edition(subject)};
  if(subject==='en'&&grade!==context.grade){const normalized=new URLSearchParams(params);normalized.set('grade',context.grade);for(const field of ['lesson','kind','items'])normalized.delete(field);params=normalized;history.replaceState(null,'','#/materials?'+normalized);}
  rows=C.lessons.filter(l=>l.materialLibrary&&l.grade===context.grade&&l.subject===subject&&l.term===context.term&&(subject==='math'||l.series===context.edition));
  // A supplied link may choose a lesson only from the current account's edition.
  const view=by('personal-view');view.replaceChildren();const wrap=node('div',undefined,'material-library');view.append(wrap);
  const head=node('header',undefined,'bank-heading');head.append(node('span','整册与单元素材','bank-eyebrow'),node('h1',subject==='cn'?'语文，一册慢慢练':subject==='en'?'英语，单元里学与写':'数学，边写边算'));
  head.append(node('p',subject==='cn'?'整册字词、句段和课文片段集中选择，不必逐课查找。':subject==='en'?'选择单元，查看单词、短语与句段的中文释义。':'按年级与册次选择专项，每批题目都有对应答案。'));
  const old=node('a','按课次浏览','bank-course-link');old.href='#/course?'+new URLSearchParams({subject,grade:context.grade,term:context.term});head.append(old);wrap.append(head);
  const contextBox=node('section',undefined,'bank-context');const contextText=node('strong',`${context.grade} 年级 · ${context.term==='upper'?'上册':'下册'} · ${subject==='math'?'原创计算专项':(WorkbookAccount.editionOptions[subject]?.find(e=>e[0]===context.edition)?.[1]||context.edition)}`);contextBox.append(contextText);
  const change=button('修改学习信息',()=>WorkbookAccount.openVersions(context));contextBox.append(change);wrap.append(contextBox);
  if(!WorkbookAccount.configured()){
   const choices=node('div',undefined,'bank-filters');for(const [field,title,values] of [['grade','年级',WorkflowRules.gradeOptions(subject,false)],['term','册次',[['upper','上册'],['lower','下册']]]]){
    const label=node('label',title),sel=node('select');sel.setAttribute('aria-label','素材库'+title);options(sel,values,String(context[field]));sel.onchange=()=>{location.hash='#/materials?'+new URLSearchParams({...context,[field]:sel.value});};label.append(sel);choices.append(label);
   }contextText.textContent=context.subject==='math'?'原创计算专项':(WorkbookAccount.editionOptions[subject]?.find(e=>e[0]===context.edition)?.[1]||context.edition);contextBox.prepend(choices);
  }
  const coverage=B.coverage.find(b=>b.subject===subject&&b.grade===context.grade&&b.term===context.term&&b.series===context.edition);
  const notice=node('p',subject==='cn'?(coverage?.notice||'所选版本暂未收录整册素材。'):subject==='en'?'词汇按本单元正文匹配，包含复现词；OCR释义与本站译文待复核。原创短文另行标注。':'按常见教学进度编制的原创练习，具体学习顺序请结合学校教材。','bank-notice');wrap.append(notice);
  if(!rows.length){wrap.append(node('p','本册暂没有可用的整册双语素材，可先按课次浏览已有内容。','bank-empty'));return;}
  const unitLabel=node('label',subject==='math'?'计算专项':'单元','bank-unit-label'),unit=node('select');unit.id='bank-lesson';unit.setAttribute('aria-label',subject==='math'?'计算专项':'英语单元');options(unit,rows.map(l=>[l.id,l.title]),rows[0].id);unit.onchange=()=>chooseLesson(unit.value);unitLabel.append(unit);unitLabel.hidden=subject==='cn';wrap.append(unitLabel);
  const mathPanel=node('div',undefined,'bank-math-options');mathPanel.id='bank-math-options';wrap.append(mathPanel);
  const tabs=node('div',undefined,'bank-kinds');tabs.id='bank-kinds';tabs.setAttribute('aria-label','素材类型');wrap.append(tabs);
  const toolbar=node('div',undefined,'bank-toolbar'),searchLabel=node('label','搜索本类素材'),search=node('input');search.id='bank-search';search.type='search';search.placeholder=subject==='en'?'英文或中文释义':'输入字词或内容';search.oninput=()=>{query=search.value.trim();page=0;renderItems();};searchLabel.append(search);toolbar.append(searchLabel);
  const amountLabel=node('label','练习量'),amount=node('select');amount.id='bank-amount';amount.setAttribute('aria-label','练习量');options(amount,[['page-1','练 1 页（推荐）'],['page-2','练 2 页'],['page-3','练 3 页'],['item-1','选 1 项'],['item-5','选 5 项'],['item-10','选 10 项'],['item-20','选 20 项'],['item-40','选 40 项'],['manual','自己勾选']],quantity);amount.onchange=()=>{quantity=amount.value;save();applyQuantity();};amountLabel.append(amount);toolbar.append(amountLabel);
  const reselect=button('按当前条件选量',()=>applyQuantity());reselect.id='bank-reselect';toolbar.append(reselect,button('加选本批',selectPage),button('清空选择',()=>{selected.clear();manualSelection();renderItems();}));wrap.append(toolbar);
  const quantityNote=node('p',undefined,'bank-quantity-note');quantityNote.id='bank-quantity-note';quantityNote.setAttribute('role','status');wrap.append(quantityNote);
  const origin=node('p',undefined,'bank-origin');origin.id='bank-origin';wrap.append(origin);
  const list=node('div');list.id='bank-items';wrap.append(list);
  const pagination=node('div',undefined,'bank-pagination'),prev=button('上一批',()=>{page--;save();renderItems();}),next=button('下一批',()=>{page++;save();renderItems();}),range=node('span');prev.id='bank-prev';next.id='bank-next';range.id='bank-range';pagination.append(prev,range,next);wrap.append(pagination);
  const bar=node('div',undefined,'bank-actionbar'),count=node('strong');count.id='bank-selection';count.setAttribute('aria-live','polite');bar.append(count);
  const biLabel=node('label',undefined,'bank-bilingual');biLabel.id='bank-bilingual-label';const bi=node('input');bi.type='checkbox';bi.id='bank-bilingual';bi.onchange=()=>{bilingual=bi.checked;save();if(quantity.startsWith('page-'))applyQuantity();else estimate();};biLabel.append(bi,node('span','打印中文释义'));bar.append(biLabel);
  const enLabel=node('label','英语练法 ','bank-english-mode');enLabel.id='bank-english-mode-label';const enSelect=node('select');enSelect.id='bank-english-mode';enSelect.setAttribute('aria-label','英语练法');options(enSelect,PracticeTools.englishModes,'copy');enSelect.onchange=()=>{englishMode=enSelect.value;save();renderItems();if(quantity.startsWith('page-'))applyQuantity();else estimate();};enLabel.append(enSelect);bar.append(enLabel);
  const answer=button('同批答案',()=>preview(true));answer.id='bank-answer';const start=button('预览练习纸',()=>preview(),'button primary');start.id='bank-preview';bar.append(answer,start);wrap.append(bar);
  const detail=node('details',undefined,'bank-sources');detail.append(node('summary','收录范围与来源说明'),node('p','语文现有 9 册教材文件，四、五、六年级下册为补充练习。课文暂以可识别片段呈现，尚非完整课文库。英语优先整理人教 PEP 三至六年级；其他版本按可配对的双语词汇收录。预览时可设置铺满 A4 纸；无需登录即可导出和打印，登录后可云端保存。'));const report=node('a','查看本册数量与缺漏清单');report.href='curriculum/material-bank-coverage.json';report.target='_blank';report.rel='noopener';detail.append(report);wrap.append(detail);
  let prior={};try{prior=JSON.parse(localStorage.getItem(key())||'{}');}catch{}
  if(params.has('kind'))prior.kind=params.get('kind').replace(/Bilingual$/,'');if(params.has('items')){prior.items=params.get('items').split(',');delete prior.page;}bilingual=params.has('bilingual')?params.get('bilingual')==='1':prior.bilingual??subject==='en';
  englishMode=PracticeTools.englishModes.some(m=>m[0]===prior.englishMode)?prior.englishMode:'copy';
  if(['1','2','3'].includes(params.get('pages'))){prior.quantity='page-'+params.get('pages');delete prior.items;}
  chooseLesson(requested?.materialLibrary?requested.id:prior.lesson,prior);document.title='整册素材库 · 小小笔尖';
 }
 window.addEventListener('accountchange',()=>{if(location.hash.startsWith('#/materials'))open(new URLSearchParams(location.hash.split('?')[1]||''));});
 return {open,link,mathItems,rememberEnglish};
})();
