(function (root) {
  "use strict";
  const D = root.WorkbookData || (typeof require === "function" ? require("./data.js") : null);
  const templates = [
    { id: "pinyin-trace", subject: "cn", type: "hanzi", title: "拼音描红", description: "看拼音 · 描三遍 · 自己写", config: { text: "春夏秋冬", size: 14, showPinyin: true } },
    { id: "stroke-trace", subject: "cn", type: "hanzi", title: "笔顺入门", description: "选好字后，自动加载笔顺提示", config: { text: "天地人", size: 14, showBishun: true } },
    { id: "independent-copy", subject: "cn", type: "hanzi", title: "独立临写", description: "看一个范字，留空自己写", config: { text: "日月山川", size: 12, practiceMode: "copy", traceNum: 1 } },
    { id: "word-trace", subject: "cn", type: "cizu", title: "词语积累", description: "整词描写，边写边记", config: { text: "春天 阳光 快乐", size: 12, traceNum: 3 } },
    { id: "letter-trace", subject: "en", type: "alphabet", title: "字母启蒙", description: "四线格 · 大小写成对", config: { text: "ABCDEF", size: 14, pair: true, font: "sans", offset: 0 } },
    { id: "english-words", subject: "en", type: "word", title: "单词描红", description: "常用单词示例，可换成本课单词", config: { text: "book\npencil\nschool", size: 12, traceNum: 3, font: "sans", offset: 0 } },
    { id: "control-lines", subject: "pen", type: "pen-control", title: "直线控笔", description: "从横线、竖线与转折开始", config: { text: "123", size: 18, controlGuides: true } },
  ];
  function find(id, type) { return templates.find(t => t.id === id && t.type === type); }
  function stateFor(id, type) {
    const t = find(id, type);
    return t ? { ...D.defaults(type), practiceMode: "trace", fillPage: false, ...t.config } : null;
  }
  function href(t) { return "#/" + t.type + "?template=" + encodeURIComponent(t.id); }
  // Preview the actual renderer output, cropped to the first two exercise rows.
  function paint(canvas, t) {
    const E = root.WorkbookEngine, s = stateFor(t.id, t.type);
    const paper = document.createElement("canvas"), ctx = paper.getContext("2d");
    ctx.font = E.fontString(s);
    const model = E.build(t.type, s, text => ctx.measureText(text).width);
    E.drawPage(paper, model, 0, 1, {});
    const g = model.g, height = Math.min(paper.height - g.y, 2 * (g.rowHeight + g.gap));
    canvas.width = Math.ceil(g.width); canvas.height = Math.ceil(height);
    canvas.getContext("2d").drawImage(paper, g.x, g.y, g.width, height, 0, 0, canvas.width, canvas.height);
  }
  const api = { templates, find, stateFor, href, paint };
  root.TemplateGallery = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
