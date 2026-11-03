(function(root){
'use strict';
const subjects={cn:'语文',math:'数学',en:'英语'};
const sources={cn:'https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202506/W020250624684887950733.pdf',math:'https://www.pep.com.cn/xw/zt/hd/12/xjcjs/xx/202409/t20240920_1995566.html'};
const kindInfo={characters:{label:'字',type:'hanzi'},words:{label:'词语',type:'cizu'},sentences:{label:'句段',type:'duanluo'},digits:{label:'数字',type:'number'},terms:{label:'数学用语',type:'cizu'},formulas:{label:'算式',type:'word'},letters:{label:'字母',type:'alphabet'},vocabulary:{label:'单词',type:'word'},englishSentences:{label:'句段',type:'paragraph'},pinyin:{label:'拼音',type:'pinyin'},patterns:{label:'控笔',type:'pen-control'}};
Object.assign(kindInfo,{extraTexts:{label:'原创阅读短文',type:'duanluo'},extraCharacters:{label:'补充字库',type:'hanzi'},extraWords:{label:'补充词语',type:'cizu'},extraSentences:{label:'补充句段',type:'duanluo'},chineseTexts:{label:'课文片段',type:'duanluo'},poems:{label:'古诗',type:'duanluo'},phrases:{label:'教材短语',type:'word'},extraPhrases:{label:'主题短语',type:'word'},englishExcerpts:{label:'课文摘句',type:'paragraph'},englishTexts:{label:'原创短文',type:'paragraph'},calculations:{label:'计算练习',type:'paragraph'},calculationAnswers:{label:'计算答案',type:'paragraph'},vocabularyBilingual:{label:'单词 · 中英对照',type:'paragraph'},phrasesBilingual:{label:'教材短语 · 中英对照',type:'paragraph'},extraPhrasesBilingual:{label:'主题短语 · 中英对照',type:'paragraph'},englishSentencesBilingual:{label:'主题句子 · 中英对照',type:'paragraph'},englishExcerptsBilingual:{label:'课文摘句 · 中英对照',type:'paragraph'},englishTextsBilingual:{label:'原创短文 · 中英对照',type:'paragraph'}});
function pack(kind,values,origin='self-authored'){return {kind,origin,items:values.map((text,i)=>({id:kind+'-'+i,text}))};}
function cn(id,title,chars,words,sentences){return {id,grade:1,subject:'cn',term:'upper',unit:'识字 · 首批课题',title,source:sources.cn,catalogStatus:'cross-checked-topic',edition:'统编语文 · 人教出版 · 修订课题参考，具体版次待核对',packs:[pack('characters',Array.from(chars)),pack('words',words),pack('sentences',sentences)],note:'字词句段为课题相关的自编巩固内容，不是教材写字表或课文原文。'};}
const lessons=[
 cn('cn-1u-tiandiren','天地人','天地人你我他',['天地','大地','人们','你我'],['我和你一起看蓝天。','我们在大地上快乐地生活。']),
 cn('cn-1u-wuxing','金木水火土','一二三四五金木水火土',['金色','木头','河水','火苗','土地'],['一片叶子落在土地上。','小河里的水清清的。']),
 cn('cn-1u-kouer','口耳目手足','口耳目手足',['开口','耳朵','双手','手足'],['我用双手整理书本。','听清楚，再慢慢说。']),
 cn('cn-1u-riyue','日月山川','日月山川水火田禾',['日月','山川','水田','禾苗'],['月亮升起来了。','田里的禾苗绿绿的。']),
 {id:'math-1u-five',grade:1,subject:'math',term:'upper',unit:'5以内数的认识和加、减法',title:'5以内数的认识和加、减法',source:sources.math,catalogStatus:'official-topic',edition:'人教数学 · 2024 新教材主题参考',packs:[pack('digits',['0','1','2','3','4','5']),pack('terms',['加法','减法','多少','大小','相等']),pack('formulas',['1 + 1 = 2','2 + 1 = 3','3 + 2 = 5','5 - 1 = 4','4 - 2 = 2'])],note:'按本单元主题设计的书写巩固；算式是自编示例，不是教材例题。'},
 {id:'math-1u-ten',grade:1,subject:'math',term:'upper',unit:'6～10的认识和加、减法',title:'6～10的认识和加、减法',source:sources.math,catalogStatus:'official-topic',edition:'人教数学 · 2024 新教材主题参考',packs:[pack('digits',['6','7','8','9','10']),pack('terms',['加法','减法','分成','合起来']),pack('formulas',['5 + 1 = 6','4 + 3 = 7','6 + 2 = 8','9 - 3 = 6','10 - 5 = 5'])],note:'按本单元主题设计的自编书写巩固，不是教材例题。'},
 {id:'kg-lines',grade:0,subject:'cn',term:'upper',unit:'线条启蒙',title:'直线和曲线',catalogStatus:'self-authored',edition:'幼儿园启蒙 · 自编活动，非人教教材',packs:[pack('patterns',['1','2','3','4','J','K'])],note:'少量控笔练习，按孩子的状态调整。'},
 {id:'kg-nature',grade:0,subject:'cn',term:'upper',unit:'认识身边',title:'太阳、月亮与大山',catalogStatus:'self-authored',edition:'幼儿园启蒙 · 自编活动，非人教教材',packs:[pack('characters',['日','月','山','水']),pack('words',['太阳','月亮','大山'])],note:'以观察和认识为主，书写量由家长自行决定。'},
 {id:'kg-digits',grade:0,subject:'math',term:'upper',unit:'数量启蒙',title:'从1数到5',catalogStatus:'self-authored',edition:'幼儿园启蒙 · 自编活动，非人教教材',packs:[pack('digits',['1','2','3','4','5'])],note:'认识数字和数量，不作为幼儿园教材课次。'},
 {id:'kg-ten',grade:0,subject:'math',term:'upper',unit:'数量启蒙',title:'从6数到10',catalogStatus:'self-authored',edition:'幼儿园启蒙 · 自编活动，非人教教材',packs:[pack('digits',['6','7','8','9','10'])],note:'按孩子的兴趣选择少量练习。'},
 {id:'kg-letters',grade:0,subject:'en',term:'upper',unit:'字母启蒙',title:'认识 A B C',catalogStatus:'self-authored',edition:'幼儿园启蒙 · 自编活动，非人教教材',packs:[pack('letters',['A','B','C','D'])],note:'字母接触活动，不标作教材课文。'},
 {id:'kg-colours',grade:0,subject:'en',term:'upper',unit:'颜色启蒙',title:'看看身边的颜色',catalogStatus:'self-authored',edition:'幼儿园启蒙 · 自编活动，非人教教材',packs:[pack('vocabulary',['red','blue','green','yellow'])],note:'结合日常观察，按需选择书写。'}
];
const vocabularyTopics=[
 {test:/Making friends/,words:['hello','friend','name','share','kind'],sentences:['Hello. I am Lin.','We are friends.','I can share my toys.'],letters:['A','B','C','D']},
 {test:/Different families|Meet my family/,words:['family','mother','father','sister','brother'],sentences:['This is my family.','My sister and I read together.']},
 {test:/Amazing animals/,words:['cat','dog','bird','fish','rabbit'],sentences:['I see a little bird.','The rabbit has long ears.']},
 {test:/Plants around us|nature park/,words:['tree','flower','grass','leaf','park'],sentences:['The tree has green leaves.','We walk in the park.']},
 {test:/colourful world/,words:['red','yellow','green','blue','white'],sentences:['My bag is blue.','I like the green leaf.']},
 {test:/Useful numbers/,words:['one','two','three','four','five','six','seven','eight','nine','ten'],sentences:['I have three pencils.','We can count to ten.']},
 {test:/classroom/,words:['classroom','desk','chair','window','door'],sentences:['Our classroom is bright.','I put my book on the desk.']},
 {test:/schoolbag/,words:['schoolbag','book','pencil','pen','ruler'],sentences:['My ruler is in my bag.','I take a book to school.']},
 {test:/My friends/,words:['friend','helpful','kind','quiet','tall'],sentences:['My friend is kind.','We help each other.']},
 {test:/My home|big bed/,words:['home','room','bed','table','sofa'],sentences:['I tidy my room.','There is a table near my bed.']},
 {test:/Dinner|would you like/,words:['rice','bread','milk','water','noodles'],sentences:['I would like some rice.','I drink water with my meal.']},
 {test:/My school/,words:['school','library','classroom','playground','teacher'],sentences:['I read in the library.','We play on the playground.']},
 {test:/What time/,words:['time','morning','afternoon','evening','breakfast'],sentences:['I have breakfast in the morning.','It is time to read.']},
 {test:/Weather/,words:['sunny','rainy','cloudy','warm','cold'],sentences:['It is sunny today.','I take my coat on a cold day.']},
 {test:/farm/,words:['farm','cow','sheep','horse','tomato'],sentences:['I see sheep on the farm.','The tomatoes are red.']},
 {test:/clothes/,words:['shirt','coat','hat','dress','shoes'],sentences:['I wear my blue shirt.','My shoes are by the door.']},
 {test:/Shopping/,words:['shop','price','buy','small','large'],sentences:['I go to the shop with my family.','This hat is small.']},
 {test:/What's he like/,words:['kind','helpful','young','old','polite'],sentences:['A polite child says thank you.','My teacher is helpful.']},
 {test:/My week/,words:['Monday','Tuesday','Wednesday','Thursday','Friday'],sentences:['I read a story on Monday.','We play games on Friday.']},
 {test:/What can you do/,words:['sing','dance','draw','swim','cook'],sentences:['I can draw a tree.','We sing together.']},
 {test:/How can I get there/,words:['left','right','straight','street','library'],sentences:['Turn left at the corner.','The library is on the right.']},
 {test:/Ways to go to school/,words:['walk','bus','bike','train','school'],sentences:['I walk to school with my friend.','We wait for the bus.']},
 {test:/weekend plan/,words:['weekend','visit','read','plan','tomorrow'],sentences:['I plan to read this weekend.','We visit our friends tomorrow.']},
 {test:/pen pal/,words:['friend','letter','hobby','read','write'],sentences:['I write a letter to my friend.','We both enjoy reading.']},
 {test:/What does he do/,words:['teacher','doctor','driver','worker','farmer'],sentences:['A farmer grows food.','A driver takes us to school.']},
 {test:/How do you feel/,words:['happy','sad','worried','angry','calm'],sentences:['I feel happy when I help others.','I take a deep breath to stay calm.']}
];


const currentCatalog=root.PepCurrentCatalog||(typeof require==='function'?require('./pep-current.js'):null);
const officialEnglishUnits=currentCatalog?currentCatalog.books.filter(book=>book.status==='publisher-unit-headings').flatMap(book=>book.units.map((title,index)=>({id:'en-current-'+book.grade+(book.term==='upper'?'s':'x')+'-'+(index+1),grade:book.grade,subject:'en',term:book.term,unit:title,title,source:book.source,catalogStatus:'official-current-companion',edition:'人教 PEP 三年级起点 · 官方当前配套目录，版权页版次待核对'}))):[];
for(const row of officialEnglishUnits){const topic=vocabularyTopics.find(x=>x.test.test(row.title));row.packs=topic?[pack('vocabulary',topic.words),pack('englishSentences',topic.sentences)]:[];if(topic?.letters)row.packs.unshift(pack('letters',topic.letters));row.note=topic?'目录名称取自人教官方配套页；词句为同主题自编巩固，不是教材词表或原文。':'目录已记录，本单元的练习内容待核对补充。';lessons.push(row);}
const publicDomain=root.PublicDomainLibrary||(typeof require==='function'?require('./public-domain.js'):null);
if(publicDomain)lessons.push(...publicDomain.lessons.map(l=>structuredClone(l)));
const topicCatalog=root.TopicCatalog||(typeof require==='function'?require('./topic-catalog.js'):null);
const topicPractice=root.TopicPractice||(typeof require==='function'?require('./topic-practice.js'):null);
if(topicCatalog&&topicPractice){
  for(const row of lessons)if(row.subject==='en'&&!row.packs.length)topicPractice.enrich(row);
  const key=row=>[row.grade,row.subject,row.term,row.title.replace(/[\s·・，、]/g,'')].join('|');
  const existing=new Set(lessons.map(key));
  for(const source of topicCatalog.lessons){if(existing.has(key(source)))continue;const row=topicPractice.enrich({...source});if(row.packs.length){lessons.push(row);existing.add(key(row));}}
}
function originLabel(origin){return origin==='user-provided-ocr'?'内容待核对':origin==='authorized-textbook'?'教材内容（审核记录见来源）':origin==='cross-checked-list'?'教材写字表（已与公开来源核对）':origin==='public-domain'?'古诗公版原作':origin==='selected-from-public-domain'?'诗中选字词（本站整理）':origin==='selected-from-title'?'课题选字词（非教材字词表）':'自编巩固内容';}
function getBook(grade,subject,term,editionId='pep'){
  if(Number(grade)!==0&&editionId!=='pep'&&!imported.editions[subject]?.some(e=>e[0]===editionId))return {grade:Number(grade),subject,term,name:Number(grade)+'年级',lessons:[],edition:({bnu:'北师大版',sujiao:'苏教版',fltrp:'外研版（三年级起点）',yilin:'译林版（三年级起点）'})[editionId]||'所选版本',notice:'所选教材版本的内容尚未收录，可切换人教版浏览现有内容。'};
  const found=lessons.filter(x=>!x.materialLibrary&&x.grade===Number(grade)&&x.subject===subject&&(Number(grade)===0||(x.series||'pep')===editionId)&&(Number(grade)===0||x.term===term)).sort((a,b)=>(a.teachingOrder??999)-(b.teachingOrder??999));
  const hasImported=found.some(l=>l.contentStatus==='ocr-draft');
  const name=Number(grade)===0?'幼儿园':Number(grade)+'年级';
  const englishNotIncluded=subject==='en'&&[1,2].includes(Number(grade))&&!found.length;
  return {grade:Number(grade),subject,term,name,lessons:found,edition:found[0]?.edition|| (englishNotIncluded?'当前范围：人教 PEP 三年级起点':'人教版 · 本册目录待核对'),notice:hasImported?'部分课次内容待核对。':englishNotIncluded?'当前英语先按 PEP 三年级起点整理，一、二年级的其他英语教材系列暂未接入。':found.length?'当前不限定新版，版次待核验。课题选字、主题自编练习与公版古诗分别标注，不等同于教材指定字词表或完整课文。':'本册尚未录入目录及练习内容。'};
}
function getLesson(id){return lessons.find(x=>x.id===id);}
const sample=root.FirstGradeSample||(typeof require==='function'?require('./first-grade-sample.js'):null);if(sample)sample.apply(lessons);
const second=root.SecondBatch||(typeof require==='function'?require('./second-batch.js'):null);if(second)second.apply(lessons);
const imported=root.ImportedMaterials||(typeof require==='function'?require('./imported/materials.js'):{editions:{},lessons:[]});lessons.push(...structuredClone(imported.lessons));
const pilot=root.CoursePilot||(typeof require==='function'?require('./course-pilot.js'):null);if(pilot)pilot.apply(lessons);
function getCourseBook(...args){const book=getBook(...args);return pilot?pilot.organize(book):{...book,extras:[],variants:{},pilot:false};}
const reviewed=root.ReviewedContent||(typeof require==='function'?require('./reviewed-content.js'):[]);
for(const change of reviewed){
 const index=lessons.findIndex(l=>l.id===change.id);if(index<0)continue;
 if(change.status==='withdrawn'){lessons.splice(index,1);continue;}
 if(change.status==='approved')lessons[index]={...lessons[index],title:change.title,packs:structuredClone(change.packs),source:change.source,note:'内容已按本课审核记录整理；具体版次见来源。',reviewStatus:'approved',review:{reviewer:change.reviewer,reviewedAt:change.reviewedAt,rightsBasis:change.rightsBasis},contentStatus:'reviewed-content'};
}
const bank=root.MaterialBankData||(typeof require==='function'?require('./material-bank.js'):null);if(bank)lessons.push(...structuredClone(bank.lessons));
{const gate=root.ReviewGate||(typeof require==='function'?require('./review-gate.js'):null);if(gate){const gated=gate.apply(lessons);lessons.splice(0,lessons.length,...gated);}}
for(const lesson of lessons){
 lesson.revisionId=lesson.revisionId||[lesson.subject,lesson.grade,lesson.grade?lesson.term:'activity',lesson.catalogStatus==='official-current-companion'?'companion-reference':lesson.catalogStatus==='legacy-topic-reference'?'historical-reference':'supplement-reference'].join('-');
 lesson.reviewStatus=lesson.reviewStatus||'reference-only';
 for(const group of lesson.packs)for(const item of group.items)item.stableId=lesson.id+'/'+group.kind+'/'+item.id;
}
function getSelection(lessonId,kind,ids){const lesson=getLesson(lessonId),group=lesson?.packs.find(x=>x.kind===kind);if(!lesson||!group)return null;if(!Array.isArray(ids)||ids.some(id=>!group.items.some(item=>item.id===id)))return null;const wanted=new Set(ids),items=group.items.filter(x=>wanted.has(x.id));if(!items.length)return null;return {lessonId,kind,itemIds:items.map(x=>x.id),type:kindInfo[kind].type,text:items.map(x=>x.text).join(['characters','extraCharacters','letters','patterns'].includes(kind)?'':'\n'),grade:lesson.grade,subject:lesson.subject,term:lesson.term,title:lesson.title,unit:lesson.unit,edition:lesson.edition,origin:group.origin};}
root.CurriculumData={editionOptions:imported.editions,subjects,kindInfo,lessons,getBook,getCourseBook,getLesson,getSelection,originLabel};if(typeof module!=='undefined')module.exports=root.CurriculumData;
})(typeof globalThis!=='undefined'?globalThis:this);
