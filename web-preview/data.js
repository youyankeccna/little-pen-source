(function(root){
  const chineseGrids = [['zwg','作文格'],['tzg','田字格'],['mzg','米字格'],['hgg','回宫格'],['jgg','九宫格'],['htg','回田格'],['hmg','回米格']];
  const englishGrids = [['sxg','四线格'],['lxg','两线格'],['dxg','单线格']];
  const types = {
    hanzi:{name:'语文 · 汉字字帖',group:'cn',description:'逐字练写，打牢书写基本功',placeholder:'请输入要练习的汉字，例如“你好世界”，支持插入空白行。',text:'你好世界',cellType:'tzg',scale:75,offset:0},
    cizu:{name:'语文 · 词组字帖',group:'cn',description:'边写边记，练字识词两不误',placeholder:'请输入词组，用空格或逗号分隔，例如“你好 世界”，支持插入空白行。',text:'你好 世界',cellType:'tzg',scale:75,offset:0},
    duanluo:{name:'语文 · 段落字帖',group:'cn',description:'粘贴任意文本，即刻生成字帖',placeholder:'请输入段落或文章内容',text:'  昨夜雨疏风骤，浓睡不消残酒，试问卷帘人，却道海棠依旧。知否，知否，应是绿肥红瘦。',cellType:'hxg',scale:68,offset:0},
    bihua:{name:'语文 · 笔画字帖',group:'cn',description:'横竖撇捺，从零开始',placeholder:'点击输入笔画和例字',text:'',cellType:'tzg',scale:68,offset:0},
    alphabet:{name:'英文 · 字母字帖',group:'en',description:'逐个练写，练习字母书写',placeholder:'请输入要练习的英文字母，例如“ABC”，支持插入空白行。',text:'ABCDEFGH',cellType:'sxg',scale:85,offset:0},
    word:{name:'英文 · 单词字帖',group:'en',description:'练字兼顾记词，一举两得',placeholder:'请输入单词，用换行或逗号分隔，支持插入空白行。',text:'Lily\n\nbook, pencil, ruler, bag',cellType:'sxg',scale:85,offset:0},
    paragraph:{name:'英文 · 段落字帖',group:'en',description:'整段书写，提升流畅度',placeholder:'请输入英文文章、段落或语句，所输即所得。',text:"If you can do what you do best and be happy, you're further along in life than most people.",cellType:'sxg',scale:85,offset:0},
    number:{name:'数字字帖',group:'base',description:'0—9 反复练写，数字工整不潦草',placeholder:'请输入数字，每行一个数字或一组数字',text:'1\n2\n3\n4\n5\n6\n7\n8\n9\n0\n\n1234567890',cellType:'num',scale:85,offset:20},
    pinyin:{name:'拼音字帖',group:'base',description:'声母韵母逐个练，拼音书写更规范',placeholder:'请输入拼音，点击可快速输入带声调韵母',text:'a\no\ne\ni\nu\nü\nā á ǎ à\nnǐ\nwǒ',cellType:'sxg',scale:60,offset:-12},
    'pen-control':{name:'控笔练习',group:'base',description:'线条描摹练手感，下笔更加稳又准',placeholder:'请从下面选择形状',text:'123456',cellType:'zwg',scale:90,offset:0}
  };
  const strokeNames=['右点','相向点','合三点','左点','相背点','连四点','上下点','长横','斜横','短横','横折','横折2','横折折','横折折折','横撇','横撇2','横折折撇','横折折折钩','横折弯','横折提','右横撇弯钩','左横撇弯钩','垂露竖','悬针竖','斜竖','竖提','竖折','竖折2','竖折折','竖弯','竖折撇','斜撇','竖撇','短撇','平撇','撇提','撇折','撇点','长捺','中捺','短捺','平捺','斜提','挑提','横钩','竖钩','弯钩','斜钩','卧钩','竖弯钩','横斜钩','横折钩','横折钩2','横折弯钩','横折弯钩2','斜横折钩','横折折折钩','竖折折钩'];
  const strokePaths=[
    'M44 28 Q52 37 56 47','M30 32 L40 43 M70 32 L60 43','M24 30 L33 42 M45 23 L53 38 M74 26 L65 44','M50 28 Q43 38 39 49','M34 32 L27 44 M65 32 L73 44','M20 42 L17 52 M38 40 L40 52 M55 40 L59 52 M74 39 L80 52','M44 25 L55 36 M43 57 L58 69',
    'M15 51 Q50 46 85 48','M20 55 L76 41','M33 51 L66 49','M22 26 L75 23 L73 80','M28 25 L70 24 L67 78','M23 24 L70 24 L70 51 L44 51 L44 80','M22 27 L53 26 L53 52 L77 51 L76 79','M23 27 L77 25 Q60 62 25 80','M25 24 L76 23 Q66 38 52 47 Q49 65 29 78','M23 25 L68 24 L51 46 L73 45 Q56 69 26 80','M24 22 L66 20 L49 41 L75 39 L56 66 L77 65 Q70 84 55 83 L50 78','M21 23 L67 22 L60 56 Q60 74 79 72','M20 25 L58 23 L54 75 L80 59','M24 23 L66 23 Q58 42 48 47 Q73 60 56 77 L45 76','M26 22 L70 22 Q60 43 49 47 Q62 62 47 76 L35 71',
    'M50 19 L50 82','M50 18 Q51 57 49 84','M58 19 L47 82','M42 20 L38 80 L76 61','M32 23 L31 76 L79 74','M28 23 L29 76 L73 77','M27 24 L28 69 L64 67 L65 84','M32 23 L30 60 Q31 80 77 75','M28 24 L27 65 L71 62 Q58 75 33 85',
    'M74 18 Q50 61 20 81','M57 18 Q61 58 23 81','M64 27 Q49 49 34 56','M78 34 L24 48','M63 21 L29 61 L77 46','M63 21 L29 60 L77 65','M62 21 L35 56 L77 80',
    'M22 20 Q41 57 81 82','M28 27 Q43 54 76 72','M38 35 Q51 48 67 60','M20 37 Q24 64 40 69 Q61 78 84 78','M25 67 L70 30','M31 59 L65 40','M19 31 L82 27 L68 45','M52 20 L53 72 Q53 86 33 72','M39 20 Q62 60 49 80 L32 68','M27 19 Q54 84 79 78 L76 57','M20 40 Q36 81 74 66 L78 48','M31 20 L31 66 Q32 85 74 77 L75 55','M20 25 L60 23 Q66 78 80 77 L82 56','M25 25 L75 23 L70 73 Q64 87 49 73','M29 23 L68 23 L69 75 L54 72','M20 24 L56 23 L50 58 Q49 85 79 77 L79 61','M25 24 L64 24 L59 56 Q57 77 77 76 L78 62','M22 37 L75 24 L71 70 L53 64','M21 23 L73 21 L58 41 L77 40 L55 68 L74 67 L64 83 L45 77','M30 20 L29 48 L75 46 L67 78 L48 70'
  ];
  const strokeExamples=['主立','羊火','学兴','小心','共父','点黑','冬斗','丁土','七毛','二三','口马','日白','凹兕','凸','又友','了子','及级','乃奶','朵没','认计','那都','队陈','木上','十中','田甲','长衣','山出','区巨','鼎','四西','专转','人文','广伊','生白','千禾','云乡','车至','女如','入八','大天','头不','之走','地红','冷次','字皮','可才','手乎','我成','心必','儿元','飞气','为而','月门','九几','忆艺','也他','杨汤','鸟弓'];
  const strokes=strokeNames.map((name,i)=>({id:i+1,name,path:strokePaths[i],examples:strokeExamples[i]}));
  const patternNames=['平行横线','平行竖线','横折线','竖折线','向内螺旋','向外螺旋','网格线','菱形网格','折角线','交错折角','交错竖线','交错横线','方形螺旋','反向方形螺旋','阶梯线','反向阶梯线','上折线','下折线','横波浪','竖波浪','斜线','反向斜线','横向连圈','竖向连圈','向下弧线','斜方框','向上弧线','圆形组合','方形组合','五角星','连写八字','爱心'];
  const patternCodes=Array.from('123456789ABCDEFGHIJKLMNOPQRSTUVW');
  function defaults(type){const t=types[type];return {text:t.text,size:t.group==='cn'?(type==='duanluo'?8:type==='bihua'?11:10):['number','pinyin'].includes(type)?9:10,rowGap:type==='pen-control'?0:t.group==='cn'||['number','pinyin'].includes(type)?1.5:2,padding:[36,36,36,36],cellType:t.cellType,font:t.group==='cn'?'kaiti':type==='pinyin'?'pinyin1':'italic',fontWeight:type==='pen-control'?'bold':'normal',scale:t.scale,offset:t.offset,traceNum:type==='bihua'?5:20,traceColor:'#94a3b8',lineColor:'#64748b',leading:true,blankRow:false,blankCol:false,showPinyin:false,showBishun:false,pair:false,letterSpace:0,readings:{},strokes:Array.from({length:5},()=>({id:0,examples:''}))};}
  const fonts={kaiti:{name:'楷体（系统）',family:'STKaiti, KaiTi, "Kaiti SC", "LXGW WenKai", serif'},wenkai:{name:'霞鹜文楷（开源）',family:'"LXGW WenKai", serif'},song:{name:'宋体（系统）',family:'Songti SC, SimSun, serif'},italic:{name:'意大利体（开源替代）',family:'"Practice Italic", Georgia, serif'},sans:{name:'印刷体（系统）',family:'Arial, sans-serif'},pinyin1:{name:'拼音字体-1（系统替代）',family:'Arial, sans-serif'},pinyin2:{name:'拼音字体-2（文楷）',family:'"LXGW WenKai", serif'}};
  const api={types,chineseGrids,englishGrids,strokes,patternCodes,patternNames,defaults,fonts};root.WorkbookData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
