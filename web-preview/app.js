'use strict';
const D=WorkbookData,E=WorkbookEngine,$=id=>document.getElementById(id);
let type='hanzi',state,model,strokeDraft=[],toastTimer,renderTimer,renderVersion=0,observer,strokeData={},exporting=false,preparingOutput=false,activeCourse=null,activeSaved=null,activeReview=null;
const labels={hanzi:'汉字',cizu:'词语',duanluo:'中文段落',bihua:'笔画',alphabet:'字母',word:'单词',paragraph:'英文段落',number:'数字',pinyin:'拼音','pen-control':'控笔'};
const titles={hanzi:'汉字练习',cizu:'词语练习',duanluo:'中文段落练习',bihua:'基础笔画练习',alphabet:'英文字母练习',word:'英文单词练习',paragraph:'英文段落练习',number:'数字练习',pinyin:'拼音练习','pen-control':'控笔练习'};
const hints={hanzi:'每个字单独一行，输入你想练习的内容。',cizu:'用空格或逗号分开词语，整组练习。',duanluo:'保留段落，让一篇短文成为练习内容。',bihua:'选择笔画，再配上几个熟悉的例字。',alphabet:'输入字母，可开启大小写成对练习。',word:'每行一个单词，也可以用逗号分开。',paragraph:'输入一段英文，按纸张宽度自动换行。',number:'每行一个数字，或一组数字。',pinyin:'每行一组拼音，带声调字母可快捷输入。','pen-control':'先选几条线，沿着图案慢慢描画。'};
const savedStates={},measureContext=document.createElement('canvas').getContext('2d');
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function draftKey(key){return key+(WorkbookAccount.scope()?':'+WorkbookAccount.scope():'');}
function layoutContext(config,kind,course){
 const lesson=course||CurriculumData.getLesson(activeSaved?.lessonId);
 return {subject:lesson?.subject||(config.mathLayout?'math':D.types[kind].group),grade:lesson?.grade??WorkbookAccount.studyContext()?.grade??1,type:kind,variant:['trace','answers'].includes(config.mathLayout)?'vertical':'standard'};
}
function layoutKey(config,kind,course){return LayoutPreferences.key(WorkbookAccount.scope(),layoutContext(config,kind,course));}
function storedLayout(config,kind,course){try{return LayoutPreferences.pick(JSON.parse(localStorage.getItem(layoutKey(config,kind,course))||'null'));}catch{return {};}}
function defaultLayout(config,kind,course){return LayoutPreferences.apply(config,storedLayout(config,kind,course));}
async function openLayoutPreferences(){
 const openingScope=WorkbookAccount.scope();try{await LayoutSync.refresh(true);}catch{toast("云端排版暂不可用，显示本机设置。保存时会再次尝试同步。");}if(openingScope!==WorkbookAccount.scope())return;
 const dialog=$('layout-dialog'),context=layoutContext(state,type,activeCourse),key=layoutKey(state,type,activeCourse),saved=storedLayout(state,type,activeCourse);
 $('layout-context').textContent=(WorkbookAccount.user()?.childName||'本机练习')+' · '+(context.grade?context.grade+'年级':'幼儿园')+' · '+({cn:'语文',math:'数学',en:'英语',base:'基础练习'}[context.subject]||'练习')+' · '+labels[type]+(context.variant==='vertical'?' · 竖式':'');
 const summary=Object.keys(saved).length?`${saved.size??state.size} mm · 行距 ${saved.rowGap??state.rowGap} mm · ${D.fonts[saved.font||state.font]?.name||'默认字体'}`:'还没有保存常用排版。';
 $('layout-status').textContent=summary;$('layout-apply').disabled=$('layout-clear').disabled=!Object.keys(saved).length;
 $('layout-save').onclick=async()=>{if(state.font==='local'){toast('请先选择内置字体，再保存常用排版。');return;}const button=$('layout-save');button.disabled=true;try{const config=LayoutPreferences.pick(state),synced=await LayoutSync.save(context,config);if(!synced)localStorage.setItem(key,JSON.stringify(config));dialog.close();toast(synced?'常用排版已同步到账号，其他设备也可使用。':'已记住本机常用排版。');}catch(error){toast(error.message);}finally{button.disabled=false;}};
 $('layout-apply').onclick=()=>{state=LayoutPreferences.apply(state,saved);dialog.close();renderQuickPractice(true);renderControls();schedule();toast('已将常用排版应用到当前练习。');};
 $('layout-clear').onclick=async()=>{const button=$('layout-clear');button.disabled=true;try{const synced=await LayoutSync.save(context,null);if(!synced)localStorage.removeItem(key);dialog.close();toast('已清除常用排版，当前练习保留原样。');}catch(error){toast(error.message);}finally{button.disabled=false;}};
 dialog.showModal();
}
function initPreviewZoom(){
 const stage=document.querySelector('.preview-stage'),stack=$('paper-stack');let mode='fit',width=0;
 try{const value=localStorage.getItem('little-pen-preview-zoom-v1');if(['fit','100','150'].includes(value))mode=value;}catch{}
 const update=()=>{const style=getComputedStyle(stage),available=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);if(available<=0)return;
  const next=mode==='fit'?Math.min(970,available):210*96/25.4*Number(mode)/100,top=stage.scrollTop;
  stack.style.width=Math.round(next)+'px';if(width)stage.scrollTop=top*next/width;width=next;
  for(const b of document.querySelectorAll('[data-preview-zoom]'))b.setAttribute('aria-pressed',String(b.dataset.previewZoom===mode));
  $('preview-scale').textContent=(mode==='fit'?'适宽 · ':'')+Math.round(next/(210*96/25.4)*100)+'%';
 };
 for(const b of document.querySelectorAll('[data-preview-zoom]'))b.onclick=()=>{mode=b.dataset.previewZoom;try{localStorage.setItem('little-pen-preview-zoom-v1',mode);}catch{}update();};
 new ResizeObserver(update).observe(stage);update();
}
function restoreLayout(base,stored,compact=false){
 const merged={...base,...stored};
 const previousSize={12:11,11:10,9:8,8:7,10:9,8.5:7.5,14:14}[base.size];
 if(compact&&(([10,14].includes(stored.size)&&[2,3].includes(stored.rowGap)&&[60,65,68,75,85].includes(stored.scale))||(stored.size===previousSize&&stored.rowGap===1.5&&[60,64,65,68].includes(stored.scale))))Object.assign(merged,{size:base.size,rowGap:base.rowGap,scale:base.scale});
 return merged;
}
function loadState(key){const scoped=draftKey(key);if(savedStates[scoped])return savedStates[scoped];let s=defaultLayout(D.defaults(key),key);try{const raw=JSON.parse(localStorage.getItem(draftKey('little-pen-reference-v2-'+key))||'null');if(raw&&Array.isArray(raw.padding)&&Array.isArray(raw.strokes))s=restoreLayout(s,raw,D.types[key].group==='cn'||['number','pinyin'].includes(key));}catch{}if(!D.fonts[s.font])s.font=D.defaults(key).font;return savedStates[scoped]=s;}
function save(){if(!activeCourse&&!activeSaved&&!activeReview){const starter=new URLSearchParams(location.hash.split('?')[1]||'').get('starter');if(starter){try{localStorage.setItem(draftKey('little-pen-starter-'+starter),JSON.stringify(state));}catch{}return;}}if(activeSaved||activeReview||activeCourse?.daily)return;if(!activeCourse)savedStates[draftKey(type)]=state;try{localStorage.setItem(draftKey(activeCourse?'little-pen-course-'+activeCourse.lessonId+'-'+activeCourse.kind:'little-pen-reference-v2-'+type),JSON.stringify(state));}catch{}}
function schedule(){save();clearTimeout(renderTimer);renderTimer=setTimeout(render,80);}
function settingRow(label){const row=el('div','setting');row.append(el('label','',label));return row;}
function toggle(group,key,label){const row=settingRow(label),input=el('input','switch');input.type='checkbox';input.checked=state[key];if(['quiz','answer'].includes(state.practiceMode)&&['showPinyin','showBishun'].includes(key))input.disabled=true;input.id='setting-'+key;input.setAttribute('role','switch');input.setAttribute('aria-label',label);input.onchange=()=>{state[key]=input.checked;if(key==='alphabetGuides'&&input.checked){state.guideStyle=state.guideStyle||'dotted';state.cellType='sxg';}if(key==='fadeTrace'&&input.checked){state.traceNum=Math.max(state.traceNum,6);state.fadeStyle=state.fadeStyle||'more-trace';}if(['fillPage','fadeTrace','alphabetGuides'].includes(key))renderControls();schedule();if(key==='showPinyin')$('readings-open').hidden=!input.checked;};row.append(input);group.append(row);}
function select(group,key,label,options){const row=settingRow(label),input=el('select');input.id='setting-'+key;input.setAttribute('aria-label',label);options.forEach(([v,t])=>{const op=el('option','',t);op.value=v;input.append(op);});input.value=state[key];input.onchange=()=>{state[key]=input.value;if(key==='cellType')renderControls();schedule();};row.append(input);group.append(row);}
function range(group,key,label,min,max,step=1,unit=''){
  const row=settingRow(label),wrap=el('div','range-control'),slider=el('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=Math.min(max,state[key]);slider.id='setting-'+key;slider.setAttribute('aria-label',label);
  const value=el('input','range-value');value.type='text';value.value=state[key]+unit;value.setAttribute('aria-label',label+'数值');
  slider.oninput=()=>{state[key]=Number(slider.value);value.value=state[key]+unit;schedule();};
  value.onchange=()=>{const num=parseFloat(value.value);if(Number.isFinite(num)){state[key]=Math.min(max,Math.max(min,Math.round(num/step)*step));slider.value=state[key];schedule();}value.value=state[key]+unit;};
  if(key==='traceNum'&&state.fillPage){slider.disabled=true;value.disabled=true;value.title='铺满A4时自动安排重复数量';}wrap.append(slider,value);row.append(wrap);group.append(row);
}
function action(group,label,text,onclick){const row=settingRow(label),b=el('button','plain',text);b.type='button';b.onclick=onclick;row.append(b);group.append(row);}
function color(group,key,label){const row=settingRow(label),input=el('input','color');input.type='color';input.value=state[key];input.id='setting-'+key;input.setAttribute('aria-label',label);input.oninput=()=>{state[key]=input.value;schedule();};row.append(input);group.append(row);}
function renderControls(){
  for(const id of ['paper-controls','writing-controls','toggle-controls','advanced-controls'])$(id).replaceChildren();
  const paper=$('paper-controls'),writing=$('writing-controls'),toggles=$('toggle-controls'),advanced=$('advanced-controls');
  if(type==='paragraph'&&['trace','answers'].includes(state.mathLayout)){
    range(paper,'size','数字大小',8,20,.5,'mm');action(paper,'页边距',state.padding.join(', '),openMargins);action(paper,'页眉与姓名栏',state.showHeader?'已开启':'添加',openHeader);
    action(writing,'字体',D.fonts[state.font]?.name||'系统字体',openFonts);color(writing,'traceColor','描红颜色');select(writing,'fontWeight','字体粗细',[['normal','常规'],['bold','加粗']]);color(advanced,'lineColor','边框颜色');toggle(toggles,'fillPage','铺满 A4 纸');$('readings-open').hidden=true;$('font-manage').hidden=false;return;
  }
  const paragraph=['duanluo','paragraph'].includes(type),control=type==='pen-control',guided=type==='alphabet'&&state.alphabetGuides,cn=D.types[type].group==='cn';
  if(cn)select(paper,'cellType','方格类型',type==='duanluo'?[['hxg','横线格'],...D.chineseGrids]:D.chineseGrids);
  else if(['word','paragraph'].includes(type))select(paper,'cellType','方格类型',D.englishGrids);
  range(paper,'size',cn||control?'方格大小':'行高',D.types[type].group==='en'&&activeCourse?.subject!=='math'&&!state.mathLayout?8:6,['hanzi','cizu','bihua','pen-control'].includes(type)?30:20,.5,'mm');
  range(paper,'rowGap','行间距',0,10,.5,'mm');action(paper,'页边距',state.padding.join(', '),openMargins);action(paper,'页眉与姓名栏',state.showHeader?'已开启':'添加',openHeader);
  if(!control&&!guided){action(writing,type==='bihua'?'示例字体':'字体',D.fonts[state.font]?.name||'系统字体',openFonts);range(writing,'scale','字体大小',48,128,1,'%');}
  if(!paragraph&&(!state.practiceMode||state.practiceMode==='trace')){const geom=E.geometry(type,state),max=type==='pinyin'||type==='number'?Math.floor(geom.width/(geom.size/2)):D.types[type].group==='en'?geom.cols*3:geom.cols;range(writing,'traceNum','描红数量',0,Math.max(max,state.traceNum));}
  if(['hanzi','cizu'].includes(type)){
    const row=settingRow('练习方式'),modes=el('select');modes.setAttribute('aria-label','练习方式');for(const [value,text] of [['trace','描红练习'],['copy','看范字临写'],['quiz','看拼音写字'],['answer','测验答案版（另行导出）']]){const o=el('option','',text);o.value=value;modes.append(o);}modes.value=state.practiceMode||'trace';modes.onchange=()=>{state.practiceMode=modes.value;if(['quiz','answer'].includes(modes.value)){state.showPinyin=true;state.showBishun=false;}renderQuickPractice(false);renderControls();schedule();};row.append(modes);writing.append(row);
  }
  if(!paragraph&&(!state.practiceMode||state.practiceMode==='trace')){const row=settingRow('描红布局'),presets=el('select');presets.setAttribute('aria-label','描红布局');for(const [v,t] of [['','选择描红布局'],['short','少量描红，留空自写'],['trace','整行描红']]){const option=el('option','',t);option.value=v;presets.append(option);}presets.disabled=!!state.fillPage;presets.onchange=()=>{if(!presets.value)return;state.traceNum=presets.value==='short'?3:100;state.leading=true;renderControls();schedule();};writing.append(row);row.append(presets);}
  if(!state.practiceMode||state.practiceMode==='trace')color(writing,'traceColor','描红颜色');
  if(['hanzi','cizu','alphabet','word','number','pinyin'].includes(type)&&(!state.practiceMode||state.practiceMode==='trace')){toggle(writing,'fadeTrace','渐隐描红');if(state.fadeTrace)select(writing,'fadeStyle','渐隐布局',[['more-trace','多描一点'],['more-write','多自己写']]);}
  if(!control&&!guided){select(advanced,'fontWeight','字体粗细',[['normal','常规'],['bold','加粗']]);range(advanced,'offset','上下偏移',-50,50,1,'%');}
  else if(control)select(writing,'fontWeight','描红粗细',[['normal','常规'],['bold','加粗']]);
  color(advanced,'lineColor',control?'方格颜色':'线条颜色');
  if(type==='duanluo'&&state.cellType==='hxg')range(advanced,'letterSpace','字间距',-10,10,1,'px');
  toggle(toggles,'fillPage','铺满 A4 纸');
  if(['hanzi','cizu'].includes(type))toggle(toggles,'showPinyin','显示拼音');
  if(type==='hanzi')toggle(toggles,'showBishun','显示笔顺');
  if(!paragraph&&!control&&(!state.practiceMode||state.practiceMode==='trace'))toggle(toggles,'leading','首字高亮');
  toggle(toggles,'blankRow','插入空行');
  if(['hanzi','cizu','number'].includes(type))toggle(toggles,'blankCol','插入空列');
  if(type==='alphabet'){toggle(toggles,'pair','大小写成对');toggle(writing,'alphabetGuides','字母起笔提示');if(state.alphabetGuides)select(writing,'guideStyle','书写引导',[['dotted','点线描红'],['solid','实线描红']]);}
  if(control)toggle(writing,'controlGuides','起点与方向提示');
  $('readings-open').hidden=!(['hanzi','cizu'].includes(type)&&state.showPinyin);
  $('font-manage').hidden=control||guided;
}
function updateInputPreview(){const content=type==='bihua'?state.strokes.filter(s=>s.id).map(s=>(D.strokes.find(x=>x.id===s.id)?.name||'')+' '+s.examples).join('\n'):state.text;$('content-open').textContent=content||D.types[type].placeholder;$('content-open').classList.toggle('empty',!content);$('pattern-input').value=state.text;}
async function prepareFont(s,text){await document.fonts.load(E.fontString(s),text.slice(0,1500)||'你好ABC');await document.fonts.ready;}
async function loadStrokes(chars){
  const unique=[...new Set(Array.from(chars).filter(c=>/[\u4e00-\u9fff]/.test(c)))];
  let index=0;await Promise.all(Array.from({length:Math.min(6,unique.length)},async()=>{while(index<unique.length){const char=unique[index++];if(Object.hasOwn(strokeData,char))continue;try{const response=await fetch('vendor/hanzi/'+encodeURIComponent(char)+'.json');strokeData[char]=response.ok?await response.json():null;}catch{strokeData[char]=null;}}}));
  return unique.filter(char=>!strokeData[char]);
}
async function render(){
  const version=++renderVersion,renderType=type,s=structuredClone(state),sourceContext={owner:WorkbookAccount.scope(),course:activeCourse?structuredClone(activeCourse):null,saved:activeSaved?structuredClone(activeSaved):null,review:activeReview?structuredClone(activeReview):null};
  updateInputPreview();$('data-status').textContent='正在生成字帖…';
  await prepareFont(s,s.text+ s.strokes.map(x=>x.examples).join(''));
  if(s.showHeader||s.mathLayout)await document.fonts.load('16px "LXGW WenKai"',Object.values(s.header||{}).join('')+'姓名班级日期');
  let missing=[];if(renderType==='hanzi'&&s.showBishun)missing=await loadStrokes(s.text);
  if(version!==renderVersion||renderType!==type)return;
  measureContext.font=E.fontString(s);model=E.build(type,s,text=>measureContext.measureText(text).width);model.sourceContext=sourceContext;
  if(observer)observer.disconnect();$('paper-stack').replaceChildren();
  observer=new IntersectionObserver(entries=>{for(const entry of entries){const c=entry.target.querySelector('canvas'),i=Number(entry.target.dataset.page);if(entry.isIntersecting)E.drawPage(c,model,i,2,strokeData);else if(c.width>0){c.width=0;c.height=0;}}},{rootMargin:'300px'});
  for(let i=0;i<model.pages;i++){const page=el('div','page-wrapper');page.dataset.page=i;const canvas=el('canvas','paper-canvas');canvas.setAttribute('aria-label',`第 ${i+1} 页字帖`);canvas.width=0;canvas.height=0;page.append(canvas);$('paper-stack').append(page);observer.observe(page);}
  // Paint the first page immediately so export and initial preview share a verified model.
  E.drawPage($('paper-stack').firstElementChild.firstElementChild,model,0,2,strokeData);
  $('page-info').textContent=`A4 · ${model.pages} 页`;$('page-info').title=model.mathPages?'每道竖式完整分页':`每页 ${model.g.rows} 行`; 
  $('data-status').textContent=model.mathPages?(model.unsupported?`${model.unsupported} 道分数、混合运算或其他题型保留原式；可列竖式的题目已生成临摹过程。`:'竖式按数位对齐，完整计算过程不跨页。设置自动保存在本浏览器。'):missing.length?'部分笔顺未收录：'+missing.slice(0,8).join('、'):s.showPinyin?'拼音已自动生成，可点击下方校正多音字。':'设置自动保存在本浏览器，各类字帖分别保存。';
}
function courseDefaults(course=activeCourse){const s=CourseLayout.defaults(course,!!CurriculumData.getLesson(course.lessonId)?.materialLibrary);return course.daily?LearningRules.dailyConfig(s):s;}
function courseState(course){
 let current=courseDefaults(course);if(!course.daily)current=defaultLayout(current,course.type,course);
 try{const saved=!course.daily&&JSON.parse(localStorage.getItem(draftKey('little-pen-course-'+course.lessonId+'-'+course.kind))||'null');if(saved&&Array.isArray(saved.padding)){const base=course.subject==='math'&&saved.mathLayout==='horizontal'?{...current,size:course.grade<=2?9:8.5,rowGap:1.5,scale:68}:current;current={...restoreLayout(base,saved,course.subject==='cn'||course.subject==='math'&&!['trace','answers'].includes(saved.mathLayout)),text:course.text};if(current.mathLayout&&!saved.mathLayout&&saved.traceColor==='#344b3d')current.traceColor='#a6afb9';}}catch{}
 return current;
}
window.WorkbookPreview={prepare:async(selection,overrides={})=>{
 const config={...courseState(selection),...overrides};await prepareFont(config,config.text);
 const context=document.createElement('canvas').getContext('2d');context.font=E.fontString(config);
 return next=>E.build(next.type,{...config,text:next.text},text=>context.measureText(text).width);
}};
async function route(){
  const requestedHash=location.hash;await WorkbookAccount.ready;await PersonalWorkspace.ready;try{await LayoutSync.refresh();}catch{/* Local drafts remain available when offline. */}if(location.hash!==requestedHash)return;
  const [key,query='']=location.hash.replace(/^#\/?/,'').split('?'),params=new URLSearchParams(query),isEditor=!!D.types[key],free=key==='free',personal=['library','review','daily','weekly','growth','family','early','share','shared','materials','works'].includes(key);activeCourse=null;activeSaved=null;activeReview=null;
  if(isEditor&&params.has('saved')){try{activeSaved=(await WorkbookAccount.request('/api/worksheet-snapshots/'+encodeURIComponent(params.get('saved')))).snapshot;if(location.hash!==requestedHash)return;if(activeSaved.type!==key)throw Error('字帖类型不匹配。');}catch(error){location.hash='#/library';toast(error.message);return;}}
  if(isEditor&&params.has('review')){activeReview=PersonalWorkspace.reviewSelection(params.get('review'));if(!activeReview||key!=='hanzi'){location.hash='#/review';toast('请选择当前薄弱字列表中的字。');return;}}
  if(isEditor&&params.has('course')){activeCourse=CurriculumData.getSelection(params.get('course'),params.get('kind'),(params.get('items')||'').split(','));if(activeCourse&&params.get('daily')==='1')activeCourse.daily=true;if(!activeCourse||activeCourse.type!==key){location.hash='#/course';toast('所选内容无效，请重新选择课次。');return;}}
  $('personal-view').hidden=!personal;$('curriculum').hidden=isEditor||free||personal;$('home').hidden=!free;$('editor').hidden=!isEditor;$('type-navigation').hidden=personal||(!free&&(!isEditor||!!activeCourse||!!activeSaved||!!activeReview));
  document.querySelectorAll('details.advanced-settings,.export-menu').forEach(n=>n.open=false);
  document.querySelectorAll('[data-route]').forEach(n=>n.classList.toggle('active',n.dataset.route===key));
  document.querySelectorAll('[data-group]').forEach(n=>n.classList.toggle('active',n.dataset.group===(activeCourse?.subject||(isEditor?D.types[key].group:params.get('subject')||'home'))));
  $('save-workbook').hidden=!isEditor;$('share-workbook').hidden=true;$('print').hidden=!isEditor;document.querySelector('.export-menu').hidden=!isEditor;$('page-info').hidden=!isEditor;document.body.classList.toggle('editor-mode',isEditor);document.body.classList.toggle('course-mode',key==='course');document.body.classList.toggle('personal-mode',personal);document.body.classList.toggle('material-mode',key==='materials');document.body.classList.toggle('landing-mode',!key);$('course-browser').hidden=!key;
  if(!isEditor){document.title='选课练字 · 小小笔尖';renderVersion++;if(observer)observer.disconnect();if(personal){if(key==='works')FamilyWorks.open();else if(key==='materials')MaterialLibrary.open(params);else if(['weekly','growth','family','early','share','shared','daily'].includes(key))FamilyWorkspace.open(key,params);else PersonalWorkspace.open(key);}else if(!free){if(key)CurriculumUI.open(params);PersonalWorkspace.dashboard();if(!key)window.scrollTo(0,0);}return;}
  let shared=null;if(params.has('share')){try{shared=(await WorkbookAccount.request('/api/shares/'+encodeURIComponent(params.get('share')))).share;if(shared.type!==key)throw Error('练习类型不匹配。');activeCourse=CurriculumData.getSelection(shared.lessonId,shared.kind,shared.itemIds);if(!activeCourse)throw Error('课次已变化，请重新选择。');}catch(error){location.hash='#/shared?'+new URLSearchParams({id:params.get('share')});toast(error.message);return;}if(location.hash!==requestedHash)return;}
  type=key;if(activeSaved){state=structuredClone(activeSaved.config);if(!D.fonts[state.font]){state.font=D.defaults(type).font;toast('原本地字体不可用，已使用默认字体，请重新核对。');}}else if(activeReview){state=D.defaults('hanzi');state.text=activeReview.text;state.size=11;state.traceNum=3;state.practiceMode='trace';}else if(activeCourse){state=courseState(activeCourse);}else state=loadState(type);
  if(shared)state=structuredClone(shared.config);
  if(activeCourse&&/^(vocabulary|phrases|extraPhrases)Bilingual$/.test(activeCourse.kind)&&PracticeTools.englishModes.some(m=>m[0]===params.get('englishMode')))state.englishMode=params.get('englishMode');
  if(params.has('starter')&&!activeCourse){const starter=FamilyWorkspace.starter(params.get('starter'),params.get('name'),type);if(starter){state=starter;try{const stored=JSON.parse(localStorage.getItem(draftKey('little-pen-starter-'+params.get('starter')))||'null');if(stored?.text===starter.text&&Array.isArray(stored.padding))state={...starter,...stored};}catch{}}} 
  if(activeCourse&&params.has('preset'))state=LearningRules.presetConfig(courseDefaults(),type,params.get('preset'),activeCourse.grade);
  $('share-workbook').hidden=!activeCourse;
  renderQuickPractice(!!activeCourse||params.has('starter'));
  if(activeCourse){PersonalWorkspace.remember(activeCourse);save();}
  document.title=(activeSaved?.title||activeReview?.title||activeCourse?.title||labels[type])+' · 小小笔尖';$('editor-title').textContent=activeSaved?activeSaved.title+' · 已保存字帖':activeReview?'薄弱字再练':activeCourse?activeCourse.title+' · '+CurriculumData.kindInfo[activeCourse.kind].label:titles[type];
  const control=type==='pen-control';$('content-open').hidden=control&&!activeCourse;$('content-edit').hidden=control&&!activeCourse;$('pattern-input').hidden=!control||!!activeCourse;$('pattern-open').hidden=!control||!!activeCourse;
  $('content-edit').textContent=activeReview?'重新选薄弱字':activeCourse?'重新选内容':'编辑内容';$('content-open').setAttribute('aria-label',activeCourse?'查看所选内容':'输入练习内容');$('input-hint').textContent=state.batchNames?'共 '+state.batchNames.length+' 个名字 · 每人独立起页 · 名单不生成公开分享链接':state.alphabetGuides?'实心点标起笔，箭头指方向；首格为示例，其余点线供描写。':state.controlGuides?'从实心起点出发，沿箭头方向运笔。':activeCourse?.daily?'每日一页初始布局；可切换练法。调整格子或留白后，请核对页数。':activeSaved?'历史配置快照；调整后可另存一份。':activeReview?'家长手动记录 · 可校正拼音后生成复习纸。':activeCourse?CurriculumData.originLabel(activeCourse.origin)+' · '+(activeCourse.grade?activeCourse.grade+'年级':'幼儿园')+' · '+CurriculumData.subjects[activeCourse.subject]:hints[type];renderControls();updateInputPreview();render();window.scrollTo(0,0);
}
function renderQuickPractice(compact){
 const box=$('editor-presets');box.replaceChildren();box.hidden=false;
 document.querySelector('.settings-ribbon').classList.toggle('simple-settings',compact);
 const age=el('button','button outline','适龄排版');age.type='button';age.onclick=()=>{const grade=activeCourse?.grade??WorkbookAccount.studyContext()?.grade??1;state=PracticeTools.ageConfig(state,type,grade,activeCourse?.subject||(state.mathLayout?'math':undefined));renderQuickPractice(compact);renderControls();schedule();toast('已按'+(grade===0?'幼儿园':grade+'年级')+'调整字号、间距和提示');};box.append(age);
 if(['hanzi','cizu'].includes(type)&&!['quiz','answer'].includes(state.practiceMode)){const coach=el('button','button outline','看笔顺 / 跟写');coach.onclick=()=>StrokeCoach.openText(state.text);box.append(coach);}
 const check=el('button','button outline','检查打印字体');check.type='button';check.onclick=async()=>{check.disabled=true;try{await render();await FontCheck.confirm(model,true);}catch(e){toast(e.message);}finally{check.disabled=false;}};box.append(check);
 if(state.mathLayout){const label=el('label','','计算排版 '),layout=el('select');layout.setAttribute('aria-label','计算排版');const answers=activeCourse?.kind==='calculationAnswers'||state.mathLayout==='answers'||activeSaved?.practiceKind==='calculationAnswers';for(const [value,text]of [[answers?'answers':'trace',answers?'竖式答案':'竖式临摹'],['horizontal',answers?'横式答案':'横式题目']]){const option=el('option','',text);option.value=value;layout.append(option);}layout.value=state.mathLayout;layout.onchange=()=>{state.mathLayout=layout.value;const grade=activeCourse?.grade??WorkbookAccount.studyContext()?.grade??3;if(layout.value==='horizontal'){state.size=grade<=2?9:8.5;state.rowGap=1.5;}else state.size=grade<=2?14:10;state=defaultLayout(state,type,activeCourse);renderControls();schedule();};label.append(layout);box.append(label);}
 if(!activeCourse){const adjust=el('button','button outline',compact?'调整纸张与字体':'收起详细设置');adjust.type='button';adjust.setAttribute('aria-expanded',String(!compact));adjust.onclick=()=>renderQuickPractice(!compact);box.append(adjust);if(state.showHeader){const header=el('button','button outline','编辑页眉');header.onclick=openHeader;box.append(header);}return;}
 box.append(el('span','','本课练法'));
 for(const option of LearningRules.presets(type)){const b=el('button','button outline',option.title);b.type='button';b.setAttribute('aria-pressed',String((state.practiceMode||'trace')===option.id&&!(option.id==='trace'&&state.fadeTrace)));b.onclick=()=>{state=LearningRules.presetConfig(courseDefaults(),type,option.id,activeCourse.grade);renderQuickPractice(true);renderControls();schedule();};box.append(b);}
 if(['hanzi','cizu'].includes(type)){const fade=el('button','button outline','渐隐练习');fade.type='button';fade.setAttribute('aria-pressed',String(!!state.fadeTrace&&(state.practiceMode||'trace')==='trace'));fade.onclick=()=>{state=LearningRules.presetConfig(courseDefaults(),type,'trace',activeCourse.grade);state.fadeTrace=true;state.fadeStyle='more-trace';state.traceNum=8;renderQuickPractice(compact);renderControls();schedule();};box.append(fade);}
 if(activeCourse.subject==='en'&&/^(vocabulary|phrases|extraPhrases)Bilingual$/.test(activeCourse.kind)){
  const label=el('label','','英语练法 '),modes=el('select');modes.setAttribute('aria-label','英语练法');
  for(const [v,t] of PracticeTools.englishModes){const o=el('option','',t);o.value=v;modes.append(o);}modes.value=state.englishMode||'copy';
  modes.onchange=()=>{state.englishMode=modes.value;state.font='wenkai';state.traceColor='#344b3d';const url=new URL(location.href);const [path,query='']=url.hash.split('?'),params=new URLSearchParams(query);params.set('englishMode',modes.value);url.hash=path+'?'+params;history.replaceState(null,'',url);MaterialLibrary.rememberEnglish(CurriculumData.getLesson(activeCourse.lessonId),modes.value);renderControls();schedule();};label.append(modes);box.append(label);
 }
 if(activeCourse.subject==='math'&&CurriculumData.getLesson(activeCourse.lessonId)?.materialLibrary){
  const swap=el('button','button outline','换一套题');swap.onclick=()=>{const lesson=CurriculumData.getLesson(activeCourse.lessonId),items=MaterialLibrary.mathItems(lesson),ids=PracticeTools.nextSet(items,activeCourse.itemIds.length,activeCourse.itemIds);if(ids.every(id=>activeCourse.itemIds.includes(id))){toast('当前条件下没有其他题目，可返回素材库调整条件或数量。');return;}location.hash=WorkflowRules.editorUrl(CurriculumData.getSelection(lesson.id,activeCourse.kind,ids));};box.append(swap);
  const answers=el('button','button outline',activeCourse.kind==='calculations'?'查看同批答案':'返回同批题目');answers.onclick=()=>{location.hash=WorkflowRules.editorUrl(CurriculumData.getSelection(activeCourse.lessonId,activeCourse.kind==='calculations'?'calculationAnswers':'calculations',activeCourse.itemIds));};box.append(answers);
 }
 const adjust=el('button','button outline',compact?'调整纸张与字体':'收起详细设置');adjust.type='button';adjust.setAttribute('aria-expanded',String(!compact));adjust.onclick=()=>renderQuickPractice(!compact);box.append(adjust);
}
function openHeader(){
 const dialog=el('dialog'),shell=el('form','dialog-shell'),title=el('h2','','页眉与姓名栏');dialog.setAttribute('aria-label','页眉与姓名栏');shell.append(title);shell.method='dialog';
 const enabled=el('input');enabled.type='checkbox';enabled.checked=!!state.showHeader;const show=el('label','', '显示页眉 ');show.prepend(enabled);shell.append(show);
 const inputs={};for(const [key,label,max,kind] of [['title','练习标题',60,'text'],['name','姓名',24,'text'],['className','班级',24,'text'],['date','日期',10,'date']]){const wrap=el('label','header-field',label),input=el('input');input.type=kind;input.maxLength=max;input.value=state.header?.[key]||(key==='title'?activeCourse?.title||'书写练习':'');input.disabled=key==='name'&&!!state.batchNames;inputs[key]=input;wrap.append(input);shell.append(wrap);}
 const note=el('p','small',state.batchNames?'每个名字单独排页，姓名栏自动对应本页名字。':'姓名、班级和日期留空时，打印填写线；公开分享会移除这些私人信息。');shell.append(note);
 const actions=el('div','dialog-footer'),cancel=el('button','button outline','取消'),apply=el('button','button primary','应用');cancel.type='button';cancel.onclick=()=>dialog.close();apply.type='submit';actions.append(cancel,apply);shell.append(actions);shell.onsubmit=e=>{e.preventDefault();state.showHeader=enabled.checked;state.header=Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,input.value.trim()]));dialog.close();renderControls();schedule();};dialog.append(shell);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}
function openContent(){
  if(state.batchNames){location.hash='#/early';return;}
  if(activeReview){location.hash='#/review';return;}
  if(activeCourse&&CurriculumData.getLesson(activeCourse.lessonId)?.materialLibrary){location.hash=MaterialLibrary.link(CurriculumData.getLesson(activeCourse.lessonId),activeCourse.kind,activeCourse.itemIds);return;}
  if(activeCourse){location.hash=CurriculumUI.link(CurriculumData.getLesson(activeCourse.lessonId))+'&'+new URLSearchParams({kind:activeCourse.kind,items:activeCourse.itemIds.join(',')});return;}
  if(type==='bihua'){strokeDraft=structuredClone(state.strokes);renderStrokeRows();$('stroke-dialog').showModal();return;}
  $('content-hint').textContent=D.types[type].placeholder;$('content-draft').value=state.text;$('tone-picker').hidden=type!=='pinyin';$('draft-count').textContent=state.text.length+' / 20000';$('content-dialog').showModal();$('content-draft').focus();
}
function renderStrokeRows(){
  $('stroke-rows').replaceChildren(...strokeDraft.map((item,i)=>{const row=el('div','stroke-row'),select=el('select'),input=el('input'),remove=el('button','', '×');select.setAttribute('aria-label','第'+(i+1)+'行笔画');const empty=el('option','','选择笔画');empty.value=0;select.append(empty);D.strokes.forEach(s=>{const op=el('option','',s.name);op.value=s.id;select.append(op);});select.value=item.id;select.onchange=()=>{item.id=Number(select.value);item.examples=D.strokes.find(s=>s.id===item.id)?.examples||'';input.value=item.examples;};input.value=item.examples;input.placeholder='例字';input.maxLength=30;input.setAttribute('aria-label','第'+(i+1)+'行例字');input.oninput=()=>item.examples=input.value.replace(/[^\u4e00-\u9fff]/g,'');remove.type='button';remove.setAttribute('aria-label','移除第'+(i+1)+'行');remove.onclick=()=>{strokeDraft.splice(i,1);renderStrokeRows();};row.append(select,input,remove);return row;}));
}
function openMargins(){const labels=['上边距','右边距','下边距','左边距'];$('margin-fields').replaceChildren(...labels.map((name,i)=>{const row=el('div','margin-field'),label=el('label','',name+'（px）'),input=el('input','margin-number');input.type='number';input.min=10;input.max=100;input.step=2;input.value=state.padding[i];input.dataset.index=i;input.setAttribute('aria-label',name);row.append(label,input);return row;}));$('margin-dialog').showModal();}
function openFonts(){
  const group=D.types[type].group,keys=group==='cn'?['kaiti','wenkai','song']:type==='pinyin'?['pinyin1','pinyin2','italic']:['italic','sans','wenkai'];if(D.fonts.local)keys.push('local');
  $('font-options').replaceChildren(...keys.map(key=>{const b=el('button','font-option');b.type='button';const sample=el('span','font-sample',group==='cn'?'你好世界':'Aa Bb 123');sample.style.fontFamily=D.fonts[key].family;b.append(el('span','',D.fonts[key].name+(key===state.font?' ✓':'')),sample);b.onclick=()=>{state.font=key;$('font-dialog').close();renderControls();schedule();};return b;}));$('font-dialog').showModal();
}
async function openReadings(){
  clearTimeout(renderTimer);await render();
  const rows=[...new Set(model.rows.filter(r=>typeof r==='string'&&r.trim()))];$('reading-fields').replaceChildren(...rows.map(row=>{const field=el('label','reading-field'),input=el('input');field.append(el('span','',row.trim()));input.value=state.readings[row]||pinyinPro.pinyin(row.trim());input.dataset.row=row;input.setAttribute('aria-label',row.trim()+'的拼音');field.append(input);return field;}));$('readings-dialog').showModal();
}
function patternPicker(){$('pattern-picker').className='pattern-picker';D.patternCodes.forEach((code,i)=>{const b=el('button'),c=el('canvas');b.type='button';c.width=64;c.height=64;b.setAttribute('aria-label',code+' '+D.patternNames[i]);b.title=code+' · '+D.patternNames[i];E.pattern(c.getContext('2d'),code,0,0,64,'#64748b');b.append(c);b.onclick=()=>{if(state.text.length>=100){toast('最多选择 100 个控笔图案');return;}state.text+=code;updateInputPreview();schedule();};$('pattern-picker').append(b);});}
function initHome(){
  const groups=[{key:'cn',title:'写好一笔，认识一个字',tag:'中文书写',desc:'汉字、词语、段落与基础笔画。'},{key:'en',title:'从一个字母，到一段表达',tag:'英文书写',desc:'字母、单词和段落，按需要准备。'},{key:'base',title:'小小的线条，也有大作用',tag:'基础练习',desc:'数字、拼音与控笔，先把基础练稳。'}];
  const examples={hanzi:'字',cizu:'词',duanluo:'文',bihua:'笔',alphabet:'Aa',word:'Word',paragraph:'Text',number:'123',pinyin:'ā', 'pen-control':'线'};
  for(const g of groups){const section=el('section','home-category'),header=el('div','home-category-heading');header.append(el('span','eyebrow',g.tag),el('h3','',g.title),el('p','',g.desc));const items=el('div','home-type-list');
    Object.entries(D.types).filter(([,t])=>t.group===g.key).forEach(([key])=>{const a=el('a','home-type');a.href='#/'+key;const text=el('div');text.append(el('strong','',labels[key]),el('span','',hints[key]));const arrow=el('img');arrow.src='assets/icons/arrow-right.svg';arrow.alt='';a.append(el('span','type-character',examples[key]),text,arrow);items.append(a);});section.append(header,items);$('home-categories').append(section);}
  for(const key of Object.keys(D.types)){const a=el('a','type-tab',labels[key]);a.href='#/'+key;a.dataset.route=key;$('type-navigation').append(a);}
  const sample=D.defaults('hanzi');sample.text='日月水火';measureContext.font=E.fontString(sample);const preview=E.build('hanzi',sample,text=>measureContext.measureText(text).width);E.drawPage($('home-paper'),preview,0,1);
  document.fonts.ready.then(()=>E.drawPage($('home-paper'),preview,0,1));
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function validateOutput(current){
  if(current.sourceContext?.owner&&current.sourceContext.owner!==WorkbookAccount.scope())throw Error('孩子档案已切换，请重新打开练习。');
  if(!current.rows.some(row=>typeof row==='string'?row.trim():row.id))throw new Error('请先选择或输入练习内容。');
  if(current.pages>20)throw new Error('每次最多20页，请拆分内容后生成。');
}
function outputName(course,current){course=current.sourceContext?.course||current.sourceContext?.saved||current.sourceContext?.review||course;const bank=CurriculumData.getLesson(course?.lessonId)?.materialLibrary;if(bank)return [course.title,CurriculumData.kindInfo[course.kind||course.practiceKind]?.label,PracticeTools.englishModes.find(m=>m[0]===current.state.englishMode)?.[1],new Date().toLocaleDateString('sv-SE')].filter(Boolean).join('-').replace(/[\\/:*?"<>|]/g,'-');return ((course?.title||activeSaved?.title||activeReview?.title||(current.state.batchNames?'姓名练习':current.state.showHeader&&current.state.header?.title)||'自主练字')+'-'+({trace:'描红',copy:'临写',quiz:'看拼音写字',answer:'答案版'}[current.state.practiceMode]||'描红')+'-'+(labels[current.type]||current.type)+'-'+new Date().toLocaleDateString('sv-SE')).replace(/[\\/:*?"<>|]/g,'-');}
async function saveOutputSnapshot(current,course,callback,silent=false){if(current.sourceContext?.owner&&current.sourceContext.owner!==WorkbookAccount.scope())throw Error('孩子档案已切换，请重新打开练习。');const saved=current.sourceContext?.saved,review=current.sourceContext?.review;course=current.sourceContext?.course||course;if(saved&&JSON.stringify(current.state)===JSON.stringify(saved.config)&&current.pages===saved.pages)return saved;if(review)await PersonalWorkspace.prepareReview(review);return WorkbookAccount.snapshot({title:saved?(saved.title+'（调整）').slice(0,80):current.state.batchNames?'姓名练习':'自主练字',sourceMode:review?'review':course?'lesson':'custom',reviewChars:review?.chars,lessonId:course?.lessonId,practiceKind:course?.kind,itemIds:course?.itemIds,type:current.type,config:current.state,pages:current.pages},callback,silent);}
async function rememberOutput(current,files){
  const owner=current.sourceContext?.owner,route=location.hash;if(!owner||owner!==WorkbookAccount.scope()||!WorkbookAccount.user()?.preferences)return;
  try{const snapshot=await saveOutputSnapshot(current,null,null,true);for(const blob of files){if(owner!==WorkbookAccount.scope())return;await WorkbookAccount.output(blob,snapshot.id,null,true);}}
  catch{if(owner===WorkbookAccount.scope()&&route===location.hash)toast('文件已生成，本次未同步到账号；可稍后保存并收藏。');}
}
function validateOutputFile(blob){if(!blob)throw Error('文件生成失败，请重试。');if(blob.size>25*1024*1024)throw Error('单个文件超过25 MiB，请减少内容后重试。');}
async function exportWorkbook(format){
  if(exporting||preparingOutput)return;preparingOutput=true;clearTimeout(renderTimer);try{await render();}catch(error){toast(error.message||'字帖准备失败，请重试。');return;}finally{preparingOutput=false;}const current=model;
  exporting=true;$('export-pdf').classList.add('busy');$('export-png').classList.add('busy');document.querySelector('.export-menu').open=false;
  const canvas=document.createElement('canvas'),course=activeCourse?structuredClone(activeCourse):null,name=outputName(course,current);
  const exportStrokes=structuredClone(strokeData),files=[];
  try{
    validateOutput(current);if(!await FontCheck.confirm(current))return;
    if(format==='pdf'){
      if(!window.jspdf){toast('PDF 组件未加载，请刷新网页后重试');return;}
      const pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      for(let page=0;page<current.pages;page++){E.drawPage(canvas,current,page,3.13,exportStrokes);if(page)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.95),'JPEG',0,0,210,297);if(page%5===0){$('data-status').textContent=`正在导出 ${page+1} / ${current.pages} 页…`;await new Promise(resolve=>setTimeout(resolve,0));}}
      const blob=new Blob([pdf.output('arraybuffer')],{type:'application/pdf'});validateOutput(current);validateOutputFile(blob);downloadBlob(blob,name+'.pdf');files.push(blob);
    }else{
      for(let page=0;page<current.pages;page++){
        E.drawPage(canvas,current,page,3.13,exportStrokes);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));validateOutput(current);validateOutputFile(blob);downloadBlob(blob,name+(current.pages>1?'-'+(page+1):'')+'.png');files.push(blob);await new Promise(resolve=>setTimeout(resolve,150));
      }
    }toast('已生成 '+current.pages+' 页 '+format.toUpperCase());void rememberOutput(current,files);
  }catch(error){console.error(error);toast(error.message||'网络连接失败，内容已保留，请重新导出。');}finally{canvas.width=0;canvas.height=0;exporting=false;$('export-pdf').classList.remove('busy');$('export-png').classList.remove('busy');$('data-status').textContent='设置自动保存在本浏览器，各类字帖分别保存。';}
}
async function printWorkbook(){
  if(exporting||preparingOutput)return;preparingOutput=true;clearTimeout(renderTimer);try{await render();}catch(error){toast(error.message||'字帖准备失败，请重试。');return;}finally{preparingOutput=false;}const current=model;exporting=true;$('print').classList.add('busy');
  const frame=el('iframe','print-frame');frame.title='字帖打印';document.body.append(frame);const doc=frame.contentDocument;
  doc.open();doc.write('<!doctype html><html><head><title>字帖打印</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{display:block;width:210mm;height:297mm;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}</style></head><body></body></html>');doc.close();
  try{
    validateOutput(current);if(!await FontCheck.confirm(current)){frame.remove();return;}const exportStrokes=structuredClone(strokeData),files=[];
    const c=el('canvas');for(let i=0;i<current.pages;i++){E.drawPage(c,current,i,3.13,exportStrokes);const img=doc.createElement('img');const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));validateOutput(current);validateOutputFile(blob);files.push(blob);const url=URL.createObjectURL(blob);img.src=url;doc.body.append(img);await img.decode();URL.revokeObjectURL(url);}c.width=0;c.height=0;
    validateOutput(current);frame.contentWindow.onafterprint=()=>frame.remove();void rememberOutput(current,files);frame.contentWindow.focus();frame.contentWindow.print();
  }catch(error){frame.remove();console.error(error);toast(error.message||'打印准备失败，内容已保留，可重试或导出 PDF。');}finally{exporting=false;$('print').classList.remove('busy');}
}
$('content-open').onclick=openContent;$('content-edit').onclick=openContent;$('pattern-open').onclick=()=> $('pattern-dialog').showModal();$('font-manage').onclick=openFonts;$('content-draft').oninput=()=> $('draft-count').textContent=$('content-draft').value.length+' / 20000';
$('content-confirm').onclick=()=>{state.text=$('content-draft').value;$('content-dialog').close();schedule();};
$('stroke-add').onclick=()=>{strokeDraft.push({id:0,examples:''});renderStrokeRows();};$('stroke-confirm').onclick=()=>{state.strokes=structuredClone(strokeDraft);$('stroke-dialog').close();schedule();};
$('margin-confirm').onclick=()=>{state.padding=Array.from($('margin-fields').querySelectorAll('input')).map(i=>Math.min(100,Math.max(10,Number(i.value)||36)));$('margin-dialog').close();renderControls();schedule();};
$('font-upload').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{const font=new FontFace('LocalPractice',await file.arrayBuffer());await font.load();document.fonts.add(font);D.fonts.local={name:'本地：'+file.name,family:'LocalPractice'};state.font='local';$('font-dialog').close();renderControls();schedule();}catch{toast('字体文件无法加载，请选择 TTF、OTF 或 WOFF 文件');}};
$('readings-open').onclick=openReadings;$('readings-confirm').onclick=()=>{for(const input of $('reading-fields').querySelectorAll('input'))state.readings[input.dataset.row]=input.value.trim();$('readings-dialog').close();schedule();};
$('pattern-input').oninput=()=>{state.text=Array.from($('pattern-input').value).filter(c=>D.patternCodes.includes(c)).join('');$('pattern-input').value=state.text;schedule();};
$('reset').onclick=()=>{state=activeSaved?structuredClone(activeSaved.config):activeReview?{...D.defaults('hanzi'),text:activeReview.text,traceNum:3,size:11}:activeCourse?courseDefaults():D.defaults(type);save();renderControls();updateInputPreview();render();toast('已恢复本类字帖的默认设置');};
function openPrintGuide(){$('help-dialog').showModal();}
$('print-help').onclick=openPrintGuide;$('print-guide-open').onclick=openPrintGuide;$('guide-pdf').onclick=()=>{$('help-dialog').close();exportWorkbook('pdf');};$('guide-print').onclick=()=>{$('help-dialog').close();printWorkbook();};$('guide-ink').onclick=()=>{state.traceColor='#888888';state.lineColor='#b0b0b0';$('help-dialog').close();renderControls();schedule();toast('已使用省墨灰度，请先试印一页确认清晰度。');};$('reference-open').onclick=()=> $('reference-dialog').showModal();$('export-pdf').onclick=()=>exportWorkbook('pdf');$('export-png').onclick=()=>exportWorkbook('png');$('print').onclick=printWorkbook;
const tones=['a ā á ǎ à','o ō ó ǒ ò','e ē é ě è','i ī í ǐ ì','u ū ú ǔ ù','ü ǖ ǘ ǚ ǜ'];tones.forEach(row=>row.split(' ').forEach(char=>{const b=el('button','',char);b.type='button';b.onmousedown=e=>e.preventDefault();b.onclick=()=>{const t=$('content-draft');t.setRangeText(char,t.selectionStart,t.selectionEnd,'end');t.focus();t.dispatchEvent(new Event('input'));};$('tone-picker').append(b);}));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
document.addEventListener('click',event=>{document.querySelectorAll('.export-menu,.account-menu').forEach(details=>{if(!details.contains(event.target))details.open=false;});});
window.addEventListener('accountchange',()=>{if(activeSaved&&!WorkbookAccount.user()){location.hash='#/library';return;}if(activeReview?.owner&&activeReview.owner!==WorkbookAccount.scope()){location.hash='#/review';return;}if(!document.body.classList.contains('editor-mode')&&!document.getElementById('curriculum').hidden){PersonalWorkspace.ready.then(()=>{if(location.hash.split('?')[0]==='#/course')CurriculumUI.open(new URLSearchParams());PersonalWorkspace.dashboard();});}});
window.addEventListener('workbooknotice',event=>toast(event.detail));
$('save-workbook').onclick=async()=>{if(!await WorkbookAccount.ensure(()=>$('save-workbook').click()))return;if(exporting||preparingOutput)return;const button=$('save-workbook');button.disabled=true;try{await render();validateOutput(model);const snapshot=await saveOutputSnapshot(model,activeCourse?structuredClone(activeCourse):null,()=>button.click());await PersonalWorkspace.favorite(snapshot.id);toast('已保存并收藏，可在“最近保存与收藏”中找回。');}catch(error){toast(error.message);}finally{button.disabled=false;}};
window.addEventListener('outputready',event=>{const resumeRoute=location.hash;toast('登录已完成，当前内容和设置已保留。');const button=el('button','button outline','继续刚才的操作');button.type='button';button.onclick=()=>{button.remove();if(location.hash!==resumeRoute){toast('练习已切换，请使用当前页面的导出按钮。');return;}event.detail?.();};$('toast').append(button);clearTimeout(toastTimer);});window.addEventListener('hashchange',route);initHome();patternPicker();route();

$('layout-preferences-open').onclick=openLayoutPreferences;
window.addEventListener('hashchange',()=>$('layout-dialog').close());
window.addEventListener('accountchange',()=>$('layout-dialog').close());
initPreviewZoom();

$('course-start').onclick=()=>WorkbookAccount.openVersions();

$('share-workbook').onclick=async()=>{if(!activeCourse)return;if(!await WorkbookAccount.ensure(()=>$('share-workbook').click()))return;const scope=WorkbookAccount.scope(),button=$('share-workbook');if(button.disabled)return;button.disabled=true;try{await render();validateOutput(model);const current=model,c=current.sourceContext.course;if(scope!==WorkbookAccount.scope())throw Error('档案已切换，请重试。');const share=await WorkbookAccount.request('/api/family/shares',{method:'POST',body:JSON.stringify({sourceMode:'lesson',lessonId:c.lessonId,practiceKind:c.kind,itemIds:c.itemIds,type:current.type,config:current.state,pages:current.pages,contentVersion:(await WorkbookAccount.request('/api/catalog/books')).contentVersion})});location.hash='#/shared?'+new URLSearchParams({id:share.id});}catch(error){toast(error.message);}finally{button.disabled=false;}};

document.addEventListener('use-verified-font',()=>{state.font='wenkai';renderControls();schedule();});

function openAccessInfo(){for(const id of ['help-dialog','account-dialog'])$(id).close();$('access-login').hidden=!!WorkbookAccount.user();$('access-dialog').showModal();}
for(const id of ['access-open','login-access-open','print-access-open'])$(id).onclick=openAccessInfo;
$('access-login').onclick=()=>{$('access-dialog').close();WorkbookAccount.openLogin();};
