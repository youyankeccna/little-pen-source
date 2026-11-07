(function(root){
'use strict';
// Topic-aligned editorial exercises; these are not claimed as the textbook writing list.
const topics=[
 ['天地人','天地人你我他','天地 大地 人们 你我','我和你一起看天空。|我们爱护脚下的土地。'],
 ['金木水火土','一二三四五金木水火土','木头 河水 火苗 土地','我在小河边看见一棵树。|小树长在土地上。'],
 ['口耳目手足','口耳目手足','开口 耳朵 双手 手足','我用双手把书放好。|先听清，再开口说。'],
 ['日月山川','日月山川水火田禾','日月 山川 水田 禾苗','一轮月亮挂在山边。|田里的禾苗长高了。'],
 ['秋天','秋天叶子大小人','秋天 叶子 大雁 天气','秋风吹来，树叶轻轻摇动。|我捡起一片金黄的落叶。'],
 ['雪地里的小画家','雪竹马牙用几','雪地 竹叶 月牙 小马','我在雪地里看见一串脚印。|弯弯的月牙挂在天边。'],
 ['四季','春夏秋冬天地','春天 夏天 秋天 冬天','春天的小草绿绿的。|冬天，我们穿上暖和的衣服。'],
 ['对韵歌','云雨雪风花鸟山水','白云 雨水 山水 花鸟','白云慢慢飘过山顶。|小鸟停在开花的树枝上。'],
 ['日月明','日月明木林森人众','明亮 树林 森林 众人','阳光照进屋里，四周明亮起来。|树林里传来小鸟的叫声。']
];
const phonics=[
 ['a o e',['a ā á ǎ à','o ō ó ǒ ò','e ē é ě è']],
 ['i u ü',['i ī í ǐ ì','u ū ú ǔ ù','ü ǖ ǘ ǚ ǜ']],
 ['b p m f',['b p m f','bā pá mā fó']],
 ['d t n l',['d t n l','dà tā nǐ lái']],
 ['g k h',['g k h','gē kè hé']],
 ['j q x',['j q x','jī qí xǐ','ju qu xu']],
 ['z c s',['z c s','zì cì sī']],
 ['zh ch sh r',['zh ch sh r','zhī chī shī rì']],
 ['y w',['y w','yī wǔ yǔ']],
 ['ai ei ui',['ai ei ui','ài běi shuǐ']],
 ['ao ou iu',['ao ou iu','ǎo ǒu liù']],
 ['ie üe er',['ie üe er','yè yuè èr']],
 ['an en in un ün',['an en in un ün','ān ēn yīn wén yún']],
 ['ang eng ing ong',['ang eng ing ong','yáng fēng xīng zhōng']]
];
function group(kind,values){return {kind,origin:'self-authored',items:values.map((text,i)=>({id:kind+'-'+i,text}))};}
function apply(lessons){
 const found=[];
 for(const [title,chars,words,sentences] of topics){
  const l=lessons.find(l=>l.grade===1&&l.subject==='cn'&&l.term==='upper'&&l.title===title);if(!l)throw Error('Sample topic missing: '+title);
  l.packs=[group('characters',[...new Set(chars)]),group('words',words.split(' ')),group('sentences',sentences.split('|'))];
  l.note='本站按课题逐项整理的练习选字、词语与自编短句。';found.push(l);
 }
 for(const [title,values] of phonics){
  const l=lessons.find(l=>l.grade===1&&l.subject==='cn'&&l.term==='upper'&&(l.title===title||(title==='ang eng ing ong'&&l.title==='ang en ing ong')));if(!l)throw Error('Phonics topic missing: '+title);
  l.title=title;l.packs=[group('pinyin',values)];l.note='本站整理的声韵母和音节书写练习；已修正目录中 eng 的拼写，不是教材原题。';found.push(l);
 }
 const poem=lessons.find(l=>l.id==='pd-cn-1-upper');if(poem)found.push(poem);
 for(const l of found)l.curation={batch:'grade1-upper-topic-pilot-1',status:'editorial-topic-sample',textbookWritingListVerified:false,note:'按课题整理的练习样本。'};
 const order=['天地人','金木水火土','口耳目手足','日月山川',...phonics.map(p=>p[0]),'秋天','江南','雪地里的小画家','四季','对韵歌','日月明'];
 found.forEach(l=>l.teachingOrder=order.indexOf(l.title));
 return found;
}
root.FirstGradeSample={apply};if(typeof module!=='undefined')module.exports=root.FirstGradeSample;
})(typeof globalThis!=='undefined'?globalThis:this);
