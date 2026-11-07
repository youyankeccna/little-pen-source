(function(root){
'use strict';
// Editorial corrections are separate from the generated OCR import and survive re-imports.
const units=[
 ['第一单元 识字',['天地人','金木水火土','口耳目手足','日月山川']],
 ['第二单元 汉语拼音',['a o e','i u ü','b p m f','d t n l']],
 ['第三单元 汉语拼音',['g k h','j q x','z c s','zh ch sh r','y w']],
 ['第四单元 汉语拼音',['ai ei ui','ao ou iu','ie üe er','an en in un ün','ang eng ing ong']],
 ['第五单元 阅读',['秋天','江南','雪地里的小画家','四季']],
 ['第六单元 识字',['对韵歌','日月明','小书包','升国旗']],
 ['第七单元 阅读',['小小的船','影子','两件宝']],
 ['第八单元 阅读',['比尾巴','乌鸦喝水','雨点儿']]
];
const additions=[
 ['小书包','书包尺子本小少','书包 尺子 书本','我把书本放进书包。|小尺子放在笔袋里。'],
 ['升国旗','升国旗中红五星','国旗 五星 红色','我们一起爱护国旗。|红色的旗帜在风中飘动。'],
 ['小小的船','小船月儿两头里','小船 月儿 两头','弯弯的小船停在岸边。|我抬头看见了月亮。'],
 ['影子','影子前后左右我','影子 前后 左右','阳光下，我看见自己的影子。|我向左走，影子也跟着走。'],
 ['两件宝','人手脑用心会做','双手 用心 动脑','我用双手整理书桌。|遇到问题，我先动脑想一想。'],
 ['比尾巴','比尾巴长短把伞','尾巴 长短 雨伞','小兔子的尾巴短短的。|下雨了，我撑起一把伞。'],
 ['乌鸦喝水','乌鸦喝水石子多','乌鸦 喝水 石子','小鸟飞到水边喝水。|路边有许多小石子。'],
 ['雨点儿','雨点儿半空问有','雨点 半空 开花','小雨点落在叶子上。|花园里的花开了。']
];
function eligible(l){return l.grade===1&&l.subject==='cn'&&l.term==='upper'&&(l.series||'pep')==='pep';}
function key(title){return title.replace(/^\d+\s*/,'').replace(/[\s·•]/g,'');}
function apply(lessons){
 for(const [title,chars,words,sentences] of additions){
  const l=lessons.find(l=>eligible(l)&&l.title===title&&l.contentStatus!=='ocr-draft');if(!l)continue;
  const previous=l.packs;
  l.packs=[['characters',[...new Set(chars)]],['words',words.split(' ')],['sentences',sentences.split('|')]].map(([kind,values])=>({kind,origin:'self-authored',items:values.map((text,i)=>({id:previous.find(p=>p.kind===kind)?.items.find(item=>item.text===text)?.id||'pilot-'+kind+'-'+i,text}))}));
  l.curation={batch:'grade1-upper-pilot-3',status:'editorial-topic-sample',textbookWritingListVerified:false};
  l.note='按课题整理的选字、词语和本站自编短句；不是教材指定识字表、写字表或课文原文。';
 }
 // Only the explicit character lines of the first four lessons were checked against
 // the user-provided Markdown. Do not infer writing/recognition requirements from OCR.
 for(const [id,chars] of [[2,'天地人你我他'],[3,'一二三四五上下'],[4,'口耳目手足站坐'],[5,'日月山川水火田禾']]){
  const l=lessons.find(l=>l.id==='import-5cc784e0ce98dc8c-'+id);if(!l)continue;
  const original=l.packs.find(p=>p.kind==='characters');
  l.packs=[{...original,items:[...chars].map(char=>original.items.find(i=>i.text===char)).filter(Boolean)}];
  l.editorialCorrection={date:'2026-10-23',scope:'按本地素材中本课独立选字行清理；移除图片说明、教学指令和跨课混入内容。',basis:'语文/统编版/一年级/语文-一年级上册·练字素材.md',textbookWritingListVerified:false};
  l.note='本课选字已按用户提供素材中的独立选字行整理；原识字表与写字表仍需对照教材页面确认，不将这些字标为必写字。';
 }
 const flag=lessons.find(l=>l.id==='import-5cc784e0ce98dc8c-21');if(flag){flag.title='8 升国旗';flag.editorialCorrection={date:'2026-10-23',originalTitle:'8 笄国旗',scope:'仅校正课名。',basis:'与现有目录条目 topic-cn-1-upper-42 交叉核对'};}
}
function organize(book){
 if(book.grade!==1||book.subject!=='cn'||book.term!=='upper'||!book.lessons.some(l=>l.id==='cn-1u-tiandiren'))return {...book,extras:[],variants:{},pilot:false};
 const primary=[],variants={},used=new Set();
 for(const [unit,titles] of units)for(const title of titles){
  const matches=book.lessons.filter(l=>key(l.title)===key(title));
  const chosen=matches.find(l=>l.curation)||matches.find(l=>l.contentStatus!=='ocr-draft');if(!chosen)continue;
  primary.push({...chosen,unit});variants[chosen.id]=matches.filter(l=>l.id!==chosen.id);matches.forEach(l=>used.add(l.id));
 }
 return {...book,lessons:primary,extras:book.lessons.filter(l=>!used.has(l.id)),variants,pilot:true,notice:'默认展示逐课整理的选编练习；写字表已核对的册次可在“素材库”中直接选字。'};
}
root.CoursePilot={apply,organize};if(typeof module!=='undefined')module.exports=root.CoursePilot;
})(typeof globalThis!=='undefined'?globalThis:this);
