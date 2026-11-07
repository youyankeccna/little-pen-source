(function (root) {
  "use strict";
  const D = root.WorkbookData || (typeof require === "function" ? require("./data.js") : null);
  const templates = [
    { id: "pinyin-trace", subject: "cn", type: "hanzi", title: "拼音描红", description: "看拼音 · 描三遍 · 自己写", config: { text: "春夏秋冬", size: 14, showPinyin: true } },
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
    { id: "control-shapes", subject: "pen", type: "pen-control", title: "趣味小图形", description: "从简单图形练习控笔", config: { text: "STUW", size: 18, controlGuides: true } }
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
    return { ...base, practiceMode: 'trace', fadeTrace: false, blankRow: false, showPinyin: false, showBishun: false, englishMode: 'copy', ...config, text: base.text, readings: base.readings || {} };
  }
  function contentLink(t, source) {
    const count = t.type === 'hanzi' ? 6 : t.type === 'cizu' ? 4 : t.type === 'word' ? 5 : 3;
    return '#/' + t.type + '?' + new URLSearchParams({ course: source.lesson.id, kind: source.pack.kind, items: source.pack.items.slice(0,count).map(i => i.id).join(','), template: t.id });
  }
  function find(id, type) { return templates.find(t => t.id === id && t.type === type); }
  function stateFor(id, type) {
    const t = find(id, type);
    return t ? { ...D.defaults(type), practiceMode: "trace", fillPage: false, ...t.config } : null;
  }
  function href(t) { return "#/" + t.type + "?template=" + encodeURIComponent(t.id); }
  // Preview the actual renderer output, cropped to the first two exercise rows.
  function paint(canvas, t, previewState) {
    const E = root.WorkbookEngine, s = previewState || stateFor(t.id, t.type);
    const paper = document.createElement("canvas"), ctx = paper.getContext("2d");
    ctx.font = E.fontString(s);
    const model = E.build(t.type, s, text => ctx.measureText(text).width);
    E.drawPage(paper, model, 0, 1, {});
    const g = model.g, height = Math.min(paper.height - g.y, 2 * (g.rowHeight + g.gap));
    canvas.width = Math.ceil(g.width); canvas.height = Math.ceil(height);
    canvas.getContext("2d").drawImage(paper, g.x, g.y, g.width, height, 0, 0, canvas.width, canvas.height);
  }
  const api = { templates, find, stateFor, href, paint, sources, courseConfig, contentLink };
  root.TemplateGallery = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
