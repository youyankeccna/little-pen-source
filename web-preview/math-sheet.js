"use strict";
// v9 数学模块：只练计算。按年级或专项出题，答案写进数字格（方格/田字格），写数字就在计算中练。
// 纯数据部分（topics/parse/build）可在 Node 中测试；页面部分只在浏览器运行。
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MathSheet = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  const W = 791.8,
    H = 1118.66,
    MM = W / 210;
  const BOXES = [
    ["fg", "方格"],
    ["tzg", "田字格"],
    ["line", "横线"],
  ];
  const PER_PAGE = [10, 20];
  function C() {
    return root.CurriculumData || (typeof require === "function" ? require("./curriculum/data.js") : null);
  }
  // 低年级默认数字格，高年级默认横线（可改）
  function defaultBox(grade) {
    return Number(grade) <= 2 ? "fg" : "line";
  }
  function topics(grade) {
    return (C()?.lessons || [])
      .filter((l) => l.subject === "math" && l.materialLibrary && l.grade === Number(grade))
      .filter((l) => (l.packs || []).some((p) => p.kind === "calculations"))
      .map((l) => ({ id: l.id, title: l.title, term: l.term, grade: l.grade }));
  }
  // 课次链接（#/calc?lesson=）也能进来：非素材库课次时按年级找第一个专项
  function resolveTopic(grade, topic) {
    const list = topics(grade);
    return list.find((t) => t.id === topic) || list[0] || null;
  }
  // "24 ÷ 9 = ____ 余 ____" -> 题干片段 + 每个空的答案
  function parse(item) {
    const parts = String(item.text).split(/_{2,}/);
    const blanks = parts.length - 1;
    const answers = blanks > 1 ? String(item.answer).split(/\s*(?:余|:)\s*/) : [String(item.answer)];
    return {
      id: item.id,
      parts: parts.map((p) => p.trim()),
      blanks: answers.slice(0, Math.max(blanks, 1)).map((a) => {
        const chars = Array.from(a.replace(/\s+/g, ""));
        return { answer: chars.join(""), cells: Math.max(2, chars.length) };
      }),
    };
  }
  function contentBand() {
    const pad = 15 * MM;
    return { pad, top: pad + 70, bottom: H - pad - 30 };
  }
  function capacity(s, wide) {
    const band = contentBand();
    const target = (s.grade <= 2 ? 10 : 8) * MM;
    const rows = Math.max(1, Math.floor((band.bottom - band.top) / (target / 0.62)));
    return rows * (wide ? 1 : 2);
  }
  function normalize(opts = {}) {
    const grade = Math.min(6, Math.max(1, Number(opts.grade) || 1));
    const t = resolveTopic(grade, opts.topic);
    return {
      grade,
      topic: t ? t.id : "",
      n: PER_PAGE.includes(Number(opts.n)) ? Number(opts.n) : 20,
      pages: Math.min(3, Math.max(1, Number(opts.pages) || 1)),
      box: BOXES.some((b) => b[0] === opts.box) ? opts.box : defaultBox(grade),
      key: opts.key === undefined ? true : !(opts.key === false || opts.key === "0"),
      fill: opts.fill === true || opts.fill === "1" || opts.fill === 1,
      start: Math.max(0, Math.floor(Number(opts.start) || 0)),
    };
  }
  function fromParams(params) {
    const o = {};
    for (const k of ["grade", "topic", "n", "pages", "box", "key", "start", "fill"]) if (params.has(k)) o[k] = params.get(k);
    const templateId = params.get("template");
    if (templateId) {
      const gallery = root.TemplateGallery || (typeof require === "function" ? require("./template-gallery.js") : null);
      const card = gallery && gallery.templates.find((item) => item.id === templateId && item.type === "calc");
      if (card) {
        if (!params.has("grade")) o.grade = card.grade;
        if (!params.has("topic")) o.topic = card.topic;
        if (!params.has("fill") && !params.has("n")) o.fill = true;
        if (!params.has("pages")) o.pages = 1;
      }
    }
    const lesson = params.get("lesson") && C()?.getLesson(params.get("lesson"));
    if (lesson && lesson.subject === "math") {
      o.grade = o.grade || Math.max(1, lesson.grade);
      if (!o.topic) o.topic = topicForLesson(lesson);
    }
    return normalize(o);
  }
  // v9b：任何数学课次都对应一个计算专项（同年级同册、课题最相近；找不到用本年级第一个）
  function topicForLesson(lesson) {
    if (!lesson || lesson.subject !== "math") return "";
    const grade = Math.min(6, Math.max(1, Number(lesson.grade) || 1));
    const list = topics(grade);
    if (list.some((t) => t.id === lesson.id)) return lesson.id;
    const words = new Set(Array.from(String(lesson.title || "") + String(lesson.unit || "")).filter((ch) => /[\u4e00-\u9fff0-9]/.test(ch)));
    const score = (t) => Array.from(t.title).filter((ch) => words.has(ch)).length + (t.term === lesson.term ? 0.5 : 0);
    let best = null;
    for (const t of list) if (!best || score(t) > score(best)) best = t;
    return best ? best.id : "";
  }
  function hashForLesson(lesson, extra = {}) {
    const q = new URLSearchParams({ grade: String(Math.min(6, Math.max(1, Number(lesson?.grade) || 1))) });
    const topic = topicForLesson(lesson);
    if (topic) q.set("topic", topic);
    for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
    return "#/calc?" + q;
  }
  function toParams(s) {
    const params = { grade: s.grade, topic: s.topic, pages: s.pages, box: s.box, key: s.key ? "1" : "0" };
    if (s.fill) params.fill = "1";
    else params.n = s.n;
    if (s.start) params.start = s.start;
    return params;
  }
  function bank(topic) {
    const lesson = topic && C()?.getLesson(topic);
    const items = (lesson?.packs || []).find((p) => p.kind === "calculations")?.items || [];
    const seen = new Set();
    const unique = [];
    for (const item of items) {
      if (seen.has(item.text)) continue;
      seen.add(item.text);
      unique.push(item);
    }
    return unique;
  }
  function build(opts) {
    const s = normalize(opts);
    const lesson = s.topic && C()?.getLesson(s.topic);
    const items = bank(s.topic);
    const probe = items[Math.min(s.start, Math.max(items.length - 1, 0))];
    const wide = !!probe && (String(probe.text).length > 18 || String(probe.text).includes("余"));
    const perPage = s.fill ? capacity(s, wide) : s.n;
    const count = perPage * s.pages;
    const taken = s.start >= items.length ? [] : items.slice(s.start, s.start + count);
    const problems = taken.map(parse);
    const widePage = problems.some((p) => p.parts.join("").length > 16 || p.blanks.length > 1 || p.blanks.some((b) => b.cells >= 5));
    const cols = widePage || (!s.fill && s.n === 10) ? 1 : 2;
    const sheets = [];
    for (let i = 0; i < problems.length; i += perPage) sheets.push(problems.slice(i, i + perPage));
    const pageList = sheets.map((list, i) => ({ list, answers: false, index: i }));
    if (s.key && sheets.length) sheets.forEach((list, i) => pageList.push({ list, answers: true, index: i }));
    const next = s.start >= items.length ? s.start : s.start + problems.length;
    return {
      settings: { ...s, n: perPage },
      title: lesson?.title || "计算练习",
      cols,
      pageList,
      problems,
      next,
      exhausted: next >= items.length,
      bank: items.length,
    };
  }
  function pageMetrics(model) {
    const band = contentBand();
    const page = model.pageList.find((p) => !p.answers);
    const target = (model.settings.grade <= 2 ? 10 : 8) * MM;
    if (!page || !page.list.length) return { ...band, rows: 0, rowH: 0, box: 0, target };
    const rows = Math.ceil(page.list.length / model.cols);
    const rowH = Math.min(80, (band.bottom - band.top) / Math.max(rows, 1));
    return { ...band, rows, rowH, box: Math.min(target, rowH * 0.62), target };
  }
  // ---------- 绘制 ----------
  function drawBox(ctx, x, y, size, style) {
    ctx.save();
    ctx.strokeStyle = "#24614f";
    ctx.lineWidth = 1.1;
    if (style === "line") {
      ctx.beginPath();
      ctx.moveTo(x, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, size, size);
      if (style === "tzg") {
        ctx.setLineDash([2.5, 2.5]);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size / 2, y + size);
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size, y + size / 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function draw(canvas, model, pageIndex, scale = 2, footerUrl) {
    const page = model.pageList[pageIndex],
      s = model.settings;
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    const pad = 15 * MM,
      font = '"LXGW WenKai", KaiTi, serif';
    ctx.fillStyle = "#2b2722";
    ctx.font = "bold 22px " + font;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(model.title + (page.answers ? " · 答案" : ""), pad, pad + 10);
    ctx.font = "14px " + font;
    ctx.fillStyle = "#5d554a";
    ctx.fillText(`${s.grade} 年级 · 第 ${page.index + 1} 页    姓名________  日期________  用时______`, pad, pad + 36);
    ctx.strokeStyle = "#e6dccb";
    ctx.beginPath();
    ctx.moveTo(pad, pad + 48);
    ctx.lineTo(W - pad, pad + 48);
    ctx.stroke();
    const top = pad + 70,
      bottom = H - pad - 30,
      rows = Math.ceil(page.list.length / model.cols),
      rowH = Math.min(80, (bottom - top) / Math.max(rows, 1)),
      colW = (W - pad * 2) / model.cols,
      box = Math.min(s.grade <= 2 ? 10 * MM : 8 * MM, rowH * 0.62),
      textSize = Math.min(24, box * 0.7);
    page.list.forEach((p, i) => {
      const col = model.cols === 1 ? 0 : i % model.cols,
        row = model.cols === 1 ? i : Math.floor(i / model.cols),
        x0 = pad + col * colW,
        y = top + row * rowH;
      let x = x0;
      ctx.font = textSize + "px " + font;
      ctx.fillStyle = "#2b2722";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#786e60";
      ctx.fillText("(" + (page.index * s.n + i + 1) + ")", x, y + box / 2);
      x += textSize * 2.5;
      ctx.fillStyle = "#2b2722";
      p.parts.forEach((part, k) => {
        if (part) {
          ctx.fillText(part, x, y + box / 2);
          x += ctx.measureText(part).width + 8;
        }
        const b = p.blanks[k];
        if (!b) return;
        for (let c = 0; c < b.cells; c++) {
          const bx = x + c * (box + 3);
          drawBox(ctx, bx, y, box, s.box);
          if (page.answers) {
            const ch = Array.from(b.answer)[b.answer.length >= b.cells ? c : c - (b.cells - Array.from(b.answer).length)];
            if (ch) {
              ctx.fillStyle = "#b4442b";
              ctx.textAlign = "center";
              ctx.fillText(ch, bx + box / 2, y + box / 2 + 1);
              ctx.textAlign = "left";
              ctx.fillStyle = "#2b2722";
            }
          }
        }
        x += b.cells * (box + 3) + 8;
      });
    });
    const E = root.WorkbookEngine;
    if (E && E.drawFooter) E.drawFooter(ctx, footerUrl);
    return canvas;
  }
  // ---------- 页面 ----------
  let current = null;
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function hash(s) {
    return root.SheetLink.hashFor("calc", toParams(s));
  }
  function link(s) {
    return root.SheetLink.absolute(hash(s), location, root.LittlePenConfig?.shareUrl);
  }
  function chips(label, values, value, onPick) {
    const wrap = el("div", "calc-field");
    wrap.append(el("span", "calc-label", label));
    const row = el("div", "calc-chips");
    row.setAttribute("role", "radiogroup");
    row.setAttribute("aria-label", label);
    for (const [v, text] of values) {
      const b = el("button", "calc-chip", text);
      b.type = "button";
      b.setAttribute("aria-pressed", String(String(v) === String(value)));
      b.onclick = () => onPick(v);
      row.append(b);
    }
    wrap.append(row);
    return wrap;
  }
  function open(params) {
    const view = document.getElementById("calc-view");
    const s = fromParams(params || new URLSearchParams());
    const want = hash(s);
    if (location.hash !== want) history.replaceState(null, "", want);
    const model = build(s);
    current = model;
    view.replaceChildren();
    const layout = el("div", "calc-layout");
    const panel = el("aside", "calc-panel");
    panel.setAttribute("aria-label", "计算练习设置");
    const head = el("header", "calc-head");
    const back = el("a", "hub-back", "← 做字帖 · 数学");
    back.href = "#/make?subject=math";
    head.append(back, el("h1", "", "计算练习"), el("p", "", "只练计算：答案写进数字格，写数字就在计算里练。"));
    panel.append(head);
    const go = (patch) => (location.hash = hash({ ...s, ...patch }));
    panel.append(
      chips("年级", [1, 2, 3, 4, 5, 6].map((g) => [g, g + " 年级"]), s.grade, (g) => go({ grade: g, topic: "", box: defaultBox(g), start: 0 })),
    );
    const topicField = el("label", "calc-field");
    topicField.append(el("span", "calc-label", "专项"));
    const sel = el("select", "calc-select");
    sel.id = "calc-topic";
    sel.setAttribute("aria-label", "专项");
    for (const t of topics(s.grade)) {
      const o = el("option", "", t.title + (t.term === "upper" ? "（上册）" : "（下册）"));
      o.value = t.id;
      sel.append(o);
    }
    sel.value = s.topic;
    sel.onchange = () => go({ topic: sel.value, start: 0 });
    topicField.append(sel);
    panel.append(topicField);
    panel.append(chips("每页题数", [...PER_PAGE.map((n) => [n, n + " 题"]), ["fill", "铺满一页"]], s.fill ? "fill" : s.n, (n) => {
      if (n === "fill") go({ fill: true, start: 0 });
      else go({ n, fill: false, start: 0 });
    }));
    panel.append(chips("页数", [1, 2, 3].map((n) => [n, n + " 页"]), s.pages, (pages) => go({ pages, start: 0 })));
    panel.append(chips("答案格", BOXES, s.box, (box) => go({ box })));
    panel.append(chips("答案页", [["1", "附答案页"], ["0", "不附"]], s.key ? "1" : "0", (k) => go({ key: k === "1" })));
    const actions = el("div", "calc-actions");
    const next = el("button", "button outline", "换一张");
    next.type = "button";
    next.id = "calc-next";
    next.onclick = () => {
      if (model.exhausted) {
        root.SheetShare?.toast("这一专项的题目已经用完，没有再重复出题。");
        return;
      }
      go({ start: model.next });
    };
    const print = el("button", "button primary", "打印");
    print.type = "button";
    print.id = "calc-print";
    print.onclick = () => window.print();
    const pdf = el("button", "button outline", "下载 PDF");
    pdf.type = "button";
    pdf.id = "calc-pdf";
    pdf.onclick = () => exportPdf(model, s);
    const share = el("button", "button outline", "分享链接");
    share.type = "button";
    share.id = "calc-share";
    share.onclick = () => root.SheetShare?.copy(link(s), "计算练习链接已复制，任何人打开都能得到同一张纸。");
    actions.append(next, print, pdf, share);
    panel.append(actions);
    const answerPages = model.pageList.filter((p) => p.answers).length;
    const bodyPages = model.pageList.length - answerPages;
    panel.append(el("p", "calc-note", model.problems.length
      ? `共 ${model.problems.length} 题 · 正文 ${bodyPages} 页${answerPages ? "，另附答案 " + answerPages + " 页" : ""}。换一张保留年级、专项、格子和答案开关。`
      : "这一专项的题目已经用完，没有再重复出题。"));
    const stack = el("section", "calc-stack");
    stack.id = "calc-stack";
    stack.setAttribute("aria-label", "计算练习预览");
    const qr = root.SheetLink.qrUrl(hash(s), location, root.LittlePenConfig?.shareUrl);
    model.pageList.forEach((_, i) => {
      const c = el("canvas", "calc-page");
      draw(c, model, i, 2, qr);
      stack.append(c);
    });
    layout.append(panel, stack);
    view.append(layout);
  }
  async function exportPdf(model, s) {
    if (!root.jspdf) return root.SheetShare?.toast("PDF 组件未加载，请刷新网页后重试");
    const pdf = new root.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const c = document.createElement("canvas"),
      qr = root.SheetLink.qrUrl(hash(s), location, root.LittlePenConfig?.shareUrl);
    model.pageList.forEach((_, i) => {
      draw(c, model, i, 3.13, qr);
      if (i) pdf.addPage();
      pdf.addImage(c.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297);
    });
    pdf.save(`计算练习-${s.grade}年级-${model.title}.pdf`);
  }
  return { BOXES, defaultBox, topics, topicForLesson, hashForLesson, parse, normalize, fromParams, toParams, build, pageMetrics, draw, open };
});
