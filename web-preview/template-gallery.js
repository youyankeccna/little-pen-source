(function (root) {
  "use strict";
  const D = root.WorkbookData || (typeof require === "function" ? require("./data.js") : null);
  const templates = [
    { id: "pinyin-trace", subject: "cn", type: "hanzi", title: "拼音描红", description: "看拼音 · 描三遍 · 自己写", config: { text: "春夏秋冬", size: 14, showPinyin: true }, sets: ["春夏秋冬", "风花雪月"] },
    { id: "stroke-trace", subject: "cn", type: "hanzi", title: "笔顺入门", description: "观察笔顺，再按顺序描写", config: { text: "天地人", size: 14, showBishun: true } },
    { id: "independent-copy", subject: "cn", type: "hanzi", title: "独立临写", description: "看一个范字，留空自己写", config: { text: "日月山川", size: 12, practiceMode: "copy", traceNum: 1 } },
    { id: "word-trace", subject: "cn", type: "cizu", title: "词语积累", description: "整词描写，边写边记", config: { text: "春天 阳光 快乐", size: 12, traceNum: 3 } },
    { id: "letter-trace", subject: "en", type: "alphabet", title: "字母启蒙", description: "四线格 · 大小写成对", config: { text: "ABCDEF", size: 14, pair: true, font: "sans", offset: 0 } },
    { id: "english-words", subject: "en", type: "word", title: "单词描红", description: "常用单词一组，直接开始描写", config: { text: "book\npencil\nschool", size: 12, traceNum: 3, font: "sans", offset: 0 } },
    { id: "control-lines", subject: "pen", type: "pen-control", title: "直线控笔", description: "从横线、竖线与转折开始", config: { text: "123", size: 18, controlGuides: true } },
  ];
  templates.push(
    { id: "rice-grid", subject: "cn", type: "hanzi", title: "米字格生字", description: "借助对角线，把字写端正", config: { text: "天地日月山水", cellType: "mzg", size: 14 } },
    { id: "large-grid", subject: "cn", type: "hanzi", title: "大格起步", description: "少量字，大格慢慢写", config: { text: "人口手足", size: 18, traceNum: 3 } },
    { id: "pinyin-quiz", subject: "cn", type: "hanzi", title: "看拼音写字", description: "先认读，再独立回忆汉字", config: { text: "春夏秋冬", size: 14, showPinyin: true, practiceMode: "quiz" } },
    { id: "word-copy", subject: "cn", type: "cizu", title: "词语隔行临写", description: "一行范词，一行自己写", config: { text: "阳光 朋友 学校", size: 12, practiceMode: "copy", blankRow: true } },
    { id: "word-quiz", subject: "cn", type: "cizu", title: "看拼音写词", description: "整词复习，不必逐个输入", config: { text: "快乐 学校 朋友", size: 12, showPinyin: true, practiceMode: "quiz" } },
    { id: "sentence-copy", subject: "cn", type: "duanluo", title: "短句抄写", description: "读一句，认真写一句", config: { text: "每天认真写好几个字。\n我和朋友一起读书。", size: 10, cellType: "tzg", practiceMode: "copy" } },
    { id: "pinyin-vowels", subject: "cn", type: "pinyin", title: "单韵母描写", description: "a o e i u ü，练好基本形", config: { text: "a\no\ne\ni\nu\nü", size: 10, traceNum: 4 } },
    { id: "pinyin-tones", subject: "cn", type: "pinyin", title: "四声练习", description: "六个单韵母的四声对照", config: { text: "ā á ǎ à\nō ó ǒ ò\nē é ě è\nī í ǐ ì\nū ú ǔ ù\nǖ ǘ ǚ ǜ", size: 10, traceNum: 2 } },
    { id: "letter-lower", subject: "en", type: "alphabet", title: "小写字母", description: "a—h，先练一小组", config: { text: "abcdefgh", size: 12, font: "sans", offset: 0 } },
    { id: "letter-guide", subject: "en", type: "alphabet", title: "字母起笔引导", description: "起点与方向提示，点线描写", config: { text: "ABCD", size: 14, font: "sans", offset: 0, alphabetGuides: true, guideStyle: "dotted", traceNum: 4 } },
    { id: "letter-pairs", subject: "en", type: "alphabet", title: "易混字母对照", description: "b d p q，观察再书写", config: { text: "bdpq", size: 14, font: "sans", offset: 0 } },
    { id: "english-fade", subject: "en", type: "word", title: "单词渐隐练习", description: "提示逐渐减少，慢慢独立写", config: { text: "book\npencil\nschool", size: 12, traceNum: 5, fadeTrace: true, font: "sans", offset: 0 } },
    { id: "english-bilingual", subject: "en", type: "paragraph", title: "单词中英对照", description: "读词义，再描写英文", config: { text: "book  /  书\npencil  /  铅笔\nschool  /  学校", size: 10, font: "wenkai", offset: 0 } },
    { id: "english-recall", subject: "en", type: "paragraph", title: "看中文写英文", description: "给出词义，留空回忆单词", config: { text: "book  /  书\npencil  /  铅笔\nschool  /  学校", size: 10, font: "wenkai", offset: 0, englishMode: "to-en" } },
    { id: "english-sentences", subject: "en", type: "paragraph", title: "英语短句抄写", description: "短句连贯书写，练习间距", config: { text: "I like my school.\nThis is my book.", size: 10, font: "sans", offset: 0 } },
    { id: "control-curves", subject: "pen", type: "pen-control", title: "曲线与波浪", description: "沿着曲线走，轻轻转弯", config: { text: "JKP", size: 18, controlGuides: true } },
    { id: "control-turns", subject: "pen", type: "pen-control", title: "转折与阶梯", description: "练习停顿和换方向", config: { text: "9FGH", size: 18, controlGuides: true } },
    { id: "control-loops", subject: "pen", type: "pen-control", title: "连圈与螺旋", description: "保持线条连贯、均匀", config: { text: "56NO", size: 18, controlGuides: true } },
    { id: "control-shapes", subject: "pen", type: "pen-control", title: "趣味小图形", description: "从简单图形练习控笔", config: { text: "STUW", size: 18, controlGuides: true } },
    { id: "square-daily", subject: "cn", type: "hanzi", title: "方格生字", description: "一年级 · 方格 · 四个常用字", config: { text: "日月水火", cellType: "fg", size: 14 }, sets: ["日月水火", "风雨雷电"] },
    { id: "palace-grid", subject: "cn", type: "hanzi", title: "回宫格端正", description: "一年级 · 回宫格 · 看准中心再写", config: { text: "木林森土", cellType: "hgg", size: 14 }, sets: ["木林森土", "江河湖海"] },
    { id: "fade-practice", subject: "cn", type: "hanzi", title: "渐隐独立写", description: "二年级 · 提示逐渐变淡", config: { text: "上下左右", size: 14, fadeTrace: true, traceNum: 5 }, sets: ["上下左右", "东西南北"] },
    { id: "column-gap", subject: "cn", type: "hanzi", title: "隔列对照", description: "看一列，空一列自己写", config: { text: "大小多少", size: 14, blankCol: true }, sets: ["大小多少", "多少远近"] },
    { id: "verse-classic", subject: "cn", type: "duanluo", title: "古诗整首", description: "完整诗句，换一张再换一首", fillMode: "verse", config: { text: "床前明月光，疑是地上霜。\n举头望明月，低头思故乡。", cellType: "hxg", size: 12 }, sets: ["床前明月光，疑是地上霜。\n举头望明月，低头思故乡。", "鹅，鹅，鹅，曲项向天歌。\n白毛浮绿水，红掌拨清波。"] },
    { id: "verse-season", subject: "cn", type: "duanluo", title: "古诗四季", description: "整首抄写，放不下一句就留白", fillMode: "verse", config: { text: "春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。", cellType: "hxg", size: 12 }, sets: ["春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。", "锄禾日当午，汗滴禾下土。\n谁知盘中餐，粒粒皆辛苦。"] },
    { id: "sentence-trace", subject: "cn", type: "duanluo", title: "句子描红", description: "二年级 · 短句重复描写", config: { text: "小鸟在树上唱歌。\n我们一起去公园。", size: 10, cellType: "tzg" }, sets: ["小鸟在树上唱歌。\n我们一起去公园。", "今天的天气真好。\n我喜欢安静地读书。"] },
    { id: "campus-words", subject: "cn", type: "cizu", title: "校园词语", description: "二年级 · 一组校园词语", config: { text: "校园 教室 操场", size: 12, traceNum: 3 }, sets: ["校园 教室 操场", "语文 数学 音乐"] },
    { id: "letter-last", subject: "en", type: "alphabet", title: "字母末组", description: "三年级 · 先写 w x y z", config: { text: "wxyz", size: 14, font: "sans", offset: 0 }, sets: ["wxyz", "ijkl"] },
    { id: "word-home", subject: "en", type: "word", title: "家庭单词", description: "三年级 · 一组家庭与动物单词", config: { text: "cat\ndog\nbird", size: 12, traceNum: 3, font: "sans", offset: 0 }, sets: ["cat\ndog\nbird", "mom\ndad\nbaby"] },
    { id: "english-to-cn", subject: "en", type: "paragraph", title: "看英文写中文", description: "三年级 · 看单词回忆词义", config: { text: "apple  /  苹果\nwater  /  水", size: 10, font: "wenkai", offset: 0, englishMode: "to-cn" }, sets: ["apple  /  苹果\nwater  /  水", "cat  /  猫\ndog  /  狗"] },
    { id: "english-questions", subject: "en", type: "paragraph", title: "英语问句", description: "四年级 · 问答短句抄写", config: { text: "What is your name?\nI am a student.", size: 10, font: "sans", offset: 0 }, sets: ["What is your name?\nI am a student.", "How are you?\nI am fine."] },
    { id: "control-cross", subject: "pen", type: "pen-control", title: "交叉线条", description: "横竖交叉，练稳定停笔", config: { text: "4AB", size: 18, controlGuides: true }, sets: ["4AB", "CDE"] },
    { id: "control-hooks", subject: "pen", type: "pen-control", title: "钩与折角", description: "短钩和折角，铺满练习区", config: { text: "8LM", size: 18, controlGuides: true }, sets: ["8LM", "QRV"] },
    { id: "calc-g1-add", subject: "math", type: "calc", grade: 1, topic: "bank-math-1-upper-add", title: "十以内加法", description: "一年级 · 不同加法铺满一页", sample: "2 + 4" },
    { id: "calc-g1-sub", subject: "math", type: "calc", grade: 1, topic: "bank-math-1-upper-sub", title: "十以内减法", description: "一年级 · 不同减法铺满一页", sample: "8 - 3" },
    { id: "calc-g1-carry", subject: "math", type: "calc", grade: 1, topic: "bank-math-1-upper-carry", title: "进位加法", description: "一年级 · 二十以内进位加法", sample: "8 + 5" },
    { id: "calc-g2-add", subject: "math", type: "calc", grade: 2, topic: "bank-math-2-upper-carry", title: "一百以内进位加", description: "二年级 · 进位加法，附答案", sample: "36 + 27" },
    { id: "calc-g3-add", subject: "math", type: "calc", grade: 3, topic: "bank-math-3-upper-add", title: "三位数加法", description: "三年级 · 三位数加法", sample: "246 + 138" },
    { id: "calc-g4-mul", subject: "math", type: "calc", grade: 4, topic: "bank-math-4-upper-mul-two", title: "三位数乘两位数", description: "四年级 · 乘法计算", sample: "128 × 16" },
    { id: "calc-g5-decimal", subject: "math", type: "calc", grade: 5, topic: "bank-math-5-upper-decimal-mul-int", title: "小数乘整数", description: "五年级 · 小数乘法", sample: "1.2 × 4" },
    { id: "calc-g6-fraction", subject: "math", type: "calc", grade: 6, topic: "bank-math-6-upper-fraction-mul", title: "分数乘法", description: "六年级 · 分数乘法", sample: "1/2 × 1/3" }
  );
  const kinds = { hanzi: ['characters','extraCharacters'], cizu: ['words','extraWords'], duanluo: ['sentences','extraSentences'], word: ['vocabulary','phrases','extraPhrases'], paragraph: ['vocabularyBilingual','englishSentencesBilingual','englishExcerptsBilingual','englishSentences','englishExcerpts'] };
  function sources(t, context, lessons) {
    if (!context || !kinds[t.type] || t.subject === 'pen') return [];
    const wanted = t.id === 'english-sentences' ? ['englishSentencesBilingual','englishExcerptsBilingual','englishSentences','englishExcerpts'] : ['english-bilingual','english-recall'].includes(t.id) ? ['vocabularyBilingual'] : kinds[t.type];
    return lessons.filter(l => l.materialLibrary && !l.pending && l.subject === t.subject && l.grade === context.grade && l.term === context.term && (l.series || 'pep') === context.edition)
      .flatMap(lesson => wanted.flatMap(kind => lesson.packs.filter(pack => pack.kind === kind && pack.items.length).map(pack => ({ lesson, pack }))));
  }
  function courseConfig(base, id, type) {
    const t = find(id, type);
    if (!t) return base;
    const { text, ...config } = t.config;
    return { ...base, practiceMode: 'trace', fadeTrace: false, blankRow: false, showPinyin: false, showBishun: false, englishMode: 'copy', ...config, text: base.text, readings: base.readings || {}, fillPage: true, fillMode: t.fillMode || 'repeat', templateId: t.id };
  }
  function contentLink(t, source) {
    const count = t.type === 'hanzi' ? 6 : t.type === 'cizu' ? 4 : t.type === 'word' ? 5 : 3;
    return '#/' + t.type + '?' + new URLSearchParams({ course: source.lesson.id, kind: source.pack.kind, items: source.pack.items.slice(0,count).map(i => i.id).join(','), template: t.id });
  }
  function find(id, type) { return templates.find(t => t.id === id && t.type === type); }
  const layoutKeys = ["size", "cellType", "traceNum", "practiceMode", "showPinyin", "showBishun", "fadeTrace", "fadeStyle", "leading", "blankRow", "blankCol", "font", "scale", "rowGap", "padding", "lineColor", "traceColor", "englishMode", "pair", "alphabetGuides", "guideStyle", "offset", "fontWeight", "letterSpace", "controlGuides"];
  function stateFor(id, type) {
    const t = find(id, type);
    if (!t || t.type === "calc") return null;
    return {
      ...D.defaults(type),
      practiceMode: "trace",
      ...t.config,
      fillMode: t.fillMode || (t.type === "pen-control" ? "pattern" : "repeat"),
      fillPage: true,
      templateId: t.id,
      templateOffset: 0,
    };
  }
  function keepLayout(previous, fresh) {
    const next = { ...fresh };
    if (previous && fresh && previous.templateId && previous.templateId === fresh.templateId) {
      for (const key of layoutKeys) if (key in previous) next[key] = previous[key];
      next.text = fresh.text;
      next.readings = fresh.readings || {};
      next.templateId = fresh.templateId;
      next.templateOffset = fresh.templateOffset ?? previous.templateOffset ?? 0;
    }
    return next;
  }
  function nextContent(state, id, type, offset) {
    const t = find(id, type);
    const fresh = stateFor(id, type);
    if (!t || !fresh) return { exhausted: true, state };
    const sets = t.sets && t.sets.length ? t.sets : [t.config.text];
    const index = Number(offset) || 0;
    if (index < 0 || index >= sets.length) return { exhausted: true, state };
    return { exhausted: false, state: keepLayout(state, { ...fresh, text: sets[index], templateOffset: index }) };
  }
  function href(t) {
    if (t.type === "calc") {
      const q = new URLSearchParams({ template: t.id, grade: String(t.grade), topic: t.topic, fill: "1", pages: "1" });
      return "#/calc?" + q;
    }
    return "#/" + t.type + "?template=" + encodeURIComponent(t.id);
  }
  // Preview the actual renderer output, cropped to the first two exercise rows.
  function paint(canvas, t, previewState) {
    if (t.type === "calc") {
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#24614f";
      ctx.strokeRect(12, 12, 296, 156);
      ctx.fillStyle = "#2b2722";
      ctx.font = "20px sans-serif";
      ctx.fillText(t.title, 28, 58);
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#5d554a";
      ctx.fillText((t.sample || "计算") + "    铺满一页", 28, 96);
      return;
    }
    const E = root.WorkbookEngine, s = previewState || stateFor(t.id, t.type);
    const paper = document.createElement("canvas"), ctx = paper.getContext("2d");
    ctx.font = E.fontString(s);
    const model = E.build(t.type, s, text => ctx.measureText(text).width);
    E.drawPage(paper, model, 0, 1, {});
    const g = model.g, height = Math.min(paper.height - g.y, 2 * (g.rowHeight + g.gap));
    canvas.width = Math.ceil(g.width); canvas.height = Math.ceil(height);
    canvas.getContext("2d").drawImage(paper, g.x, g.y, g.width, height, 0, 0, canvas.width, canvas.height);
  }
  const api = { templates, find, stateFor, keepLayout, nextContent, href, paint, sources, courseConfig, contentLink };
  root.TemplateGallery = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
