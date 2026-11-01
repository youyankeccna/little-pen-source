(function(root){
'use strict';
const enTopics=[
 [/Meeting new|Making friends|guest/i,'hello friend name meet welcome','Hello, my name is Lily.|I am glad to meet you.'],
 [/famil|Helping at home/i,'family mother father sister brother help','I help my father wash the cups.|Our family reads together.'],
 [/animal|pet|dog/i,'cat dog rabbit bird fish animal','The small dog runs on the grass.|I give my pet clean water.'],
 [/plant|nature|farm/i,'tree leaf flower grass seed farm','I water the young tree.|The seeds need water and light.'],
 [/colour/i,'red green blue yellow white black','I draw a blue boat.|The leaves are green.'],
 [/number/i,'one two three four five six seven eight nine ten','I count eight stars.|There are six cups on the table.'],
 [/Expressing|feeling|feel/i,'happy sad tired worried calm smile','I feel calm after a walk.|I tell my friend how I feel.'],
 [/Learning|school|class rules/i,'school teacher book read write listen','I listen before I answer.|We keep our classroom tidy.'],
 [/food|healthy life|habits/i,'rice bread milk fruit water healthy','I drink water after running.|I eat fruit with my lunch.'],
 [/toys/i,'toy ball doll car old share','I put my toys in a box.|We share a red ball.'],
 [/friends/i,'friend kind helpful quiet tall','My friend helps me find my pen.|We enjoy drawing together.'],
 [/Places|hometown|community/i,'home street park shop library town','There is a park near my home.|I return my books to the library.'],
 [/weather|season/i,'spring summer autumn winter sunny rainy','I wear a hat on sunny days.|Leaves fall in autumn.'],
 [/Family rules|Following|Work quietly/i,'rule wait clean quiet safe polite','I wait for my turn.|We speak quietly in the library.'],
 [/Time|day|week|calendar|art show/i,'morning afternoon evening Monday Tuesday time','I read for ten minutes after school.|We draw pictures on Tuesday.'],
 [/shopping|money/i,'buy price money save shop coin','I save money in a small box.|I check the price before I buy.'],
 [/Work and play|can you do/i,'work play swim draw sing dance','I draw a fish after class.|We play ball in the park.'],
 [/Travell|travel plan|weekend|Getting together/i,'travel plan bus train visit family','We plan a short trip by train.|I visit my family on Sunday.'],
 [/space/i,'space Earth moon sun star planet','The Earth moves around the sun.|I look at the moon at night.'],
 [/Energy/i,'energy light water wind save clean','I turn off the light when I leave.|We save water at home.'],
 [/How tall/i,'tall short long metre centimetre compare','My pencil is longer than yours.|We measure the desk together.'],
 [/Last weekend/i,'cleaned washed watched played visited','I washed my shoes on Saturday.|We played chess last weekend.'],
 [/Where did/i,'went saw ate took trip beach','I took a photo of a tree.|We went to the park yesterday.'],
 [/Then and now/i,'before now change grow different','The small tree is tall now.|Our town has a new library.'],
 [/Revision|Recycle/i,'read write listen speak review practise','I check my work after writing.|I practise a little every day.']
];
const cnTopics=[
 [/春|花|草|树|荷|植物|种子/,'春天 花草 树叶 生长','小草从泥土里探出头来。|我们给新栽的小树浇水。'],
 [/秋|落叶/,'秋天 果实 金黄 收获','秋风吹过，几片叶子轻轻落下。|果园里的果子渐渐成熟了。'],
 [/雪|冬|冰/,'冬天 雪花 温暖 洁白','雪花落在树枝上。|出门前，我穿好了暖和的外套。'],
 [/月|星|夜/,'月亮 星光 夜晚 安静','夜空中，几颗星星闪着光。|我和家人一起看月亮。'],
 [/水|雨|海|江|河|浪/,'雨水 河流 浪花 清澈','雨后的小路湿湿的。|小河绕过村庄，流向远方。'],
 [/鸟|鸭|鸡|鹅|燕|乌鸦/,'小鸟 翅膀 飞翔 羽毛','一只小鸟停在窗外的树枝上。|我们安静地观察，不惊动它。'],
 [/猫|狗|兔|猴|狐|虎|动物/,'动物 脚印 森林 保护','草地上留下了一串小脚印。|我们观察动物，也保护它们的家园。'],
 [/家|母|父|亲|奶奶|爷爷/,'家人 陪伴 关心 温暖','我帮家人把碗筷摆整齐。|一句关心的话，让人心里暖暖的。'],
 [/学校|学生|书|文具|铅笔|写字|读/,'读书 认真 整齐 爱护','写字前，我把本子放平。|读完一本书，我把它放回书架。'],
 [/祖国|中国|国旗|北京|长城/,'祖国 中国 国旗 山河','我想去看看祖国不同地方的风景。|我们认真了解家乡的变化。'],
 [/朋友|伙伴|友谊|一起/,'朋友 合作 分享 帮助','遇到困难时，我们一起想办法。|我把自己的发现告诉伙伴。'],
 [/时间|分钟|匆匆|星期天/,'时间 珍惜 计划 今天','我先安排好今天要做的事。|每天坚持一点，就会慢慢进步。']
];
function makePack(kind,values,origin='self-authored'){return {kind,origin,items:[...new Set(values)].filter(Boolean).map((text,i)=>({id:kind+'-'+i,text}))};}
function enrich(row){
 if(row.subject==='cn'){
  const title=row.title.replace(/（[^）]*）|\([^)]*\)/g,'').replace(/^(口语交际|快乐读书吧|习作|语文园地)[：: ·]*/,'');
  const chars=[...new Set(Array.from(title).filter(c=>/[\u4e00-\u9fff]/.test(c)))];
  const topic=cnTopics.find(t=>t[0].test(title));
  row.packs=chars.length?[makePack('characters',chars,'selected-from-title')]:[];
  if(topic){row.packs.push(makePack('words',topic[1].split(' ')),makePack('sentences',topic[2].split('|')));}
  else if(title.length>=2&&title.length<=6&&/^[\u4e00-\u9fff]+$/.test(title))row.packs.push(makePack('words',[title],'selected-from-title'));
  if(!chars.length&&/^[a-zü\s]+$/.test(title))row.packs=[makePack('pinyin',title.split(/\s+/),'selected-from-title')];
  row.note='课题选字用于书写课题；主题词句为本站自编，可能供同主题多课共用，不是教材写字表、词语表或课文原文。';
 }else if(row.subject==='en'){
  const topic=enTopics.find(t=>t[0].test(row.title));
  row.packs=topic?[makePack('vocabulary',topic[1].split(' ')),makePack('englishSentences',topic[2].split('|'))]:[];
  row.note='沿用目录课题；单词与例句为本站按主题自编的巩固练习，不是教材指定词表或课文原文。';
 }else{
  const context=row.title+' '+row.unit;
  const rules=[
   [/分数|百分数|比和|比例|比的|认识比/,'分数 分子 分母 比值',['1/2','1/4','3/4','1/2 + 1/4 = 3/4']],
   [/小数/,'小数 整数 小数点 数位',['0.1','0.5','1.25','0.3 + 0.2 = 0.5']],
   [/面积|平方|圆环/,'面积 平方厘米 平方米',['1 cm²','1 m²','3 × 4 = 12']],
   [/体积|容积|立方/,'体积 容积 立方厘米 升',['1 cm³','1 L','1 L = 1000 mL']],
   [/周长|长度|厘米|米的|测量/,'长度 周长 厘米 米',['1 cm','1 m = 100 cm','(3 + 4) × 2 = 14']],
   [/时间|钟|时分|年月日/,'小时 分钟 秒 年 月 日',['1时 = 60分','1分 = 60秒','1年 = 12个月']],
   [/角|图形|位置|方向|对称|平移|旋转/,'图形 位置 方向 对称',['△','□','○','90°']],
   [/统计|数据|可能|平均/,'数据 统计 平均数 比较',['(2 + 4 + 6) ÷ 3 = 4','2 < 4','6 > 4']],
   [/人民币|购物/,'人民币 元 角 分',['1元 = 10角','1角 = 10分','5元 + 3元 = 8元']],
   [/方程|字母/,'等式 方程 未知数 解',['x + 3 = 8','x = 5','2 × x = 10']],
   [/乘|倍/,'乘数 乘法 乘积 倍',['2 × 3 = 6','4 × 5 = 20','6 × 7 = 42']],
   [/除|余数/,'除数 被除数 商 余数',['6 ÷ 2 = 3','20 ÷ 5 = 4','17 ÷ 5 = 3……2']],
   [/减|退位/,'减法 被减数 减数 差',['8 - 3 = 5','15 - 7 = 8','32 - 14 = 18']],
   [/加|进位/,'加法 加数 和 计算',['2 + 3 = 5','8 + 7 = 15','24 + 18 = 42']]
  ];
  const topic=rules.find(t=>t[0].test(row.title))||rules.find(t=>t[0].test(context));
  if(topic&&row.grade===1){
   if(/加法/.test(topic[1]))topic[2]=/20|进位/.test(context)?['8 + 7 = 15','9 + 6 = 15','7 + 5 = 12']:['1 + 2 = 3','2 + 3 = 5','4 + 1 = 5'];
   if(/减法/.test(topic[1]))topic[2]=/退位|20/.test(context)?['12 - 5 = 7','15 - 7 = 8','13 - 6 = 7']:['5 - 1 = 4','4 - 2 = 2','3 - 1 = 2'];
  }
  row.packs=topic?[makePack('terms',topic[1].split(' ')),makePack('formulas',topic[2])]:[makePack('digits',row.grade<3?['0','1','2','3','4','5','6','7','8','9','10']:['10','100','1000','10000'])];
  row.note='按课题设计的本站自编书写巩固，算式是基础示例，不是教材例题。';
 }
 return row;
}
root.TopicPractice={enrich};if(typeof module!=='undefined')module.exports=root.TopicPractice;
})(typeof globalThis!=='undefined'?globalThis:this);
