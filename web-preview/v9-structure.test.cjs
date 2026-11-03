"use strict";
// v9：各科目独立、数学只练计算、二维码=本张纸、跟课本单一入口、任何字帖可分享、古诗一等类型。
const assert = require("assert"),
  fs = require("fs");
const read = (f) => fs.readFileSync(__dirname + "/" + f, "utf8");
globalThis.window = globalThis;
require("./curriculum/public-domain.js");
const C = require("./curriculum/data.js");
globalThis.CurriculumData = C;
const N = require("./nav-map.js");
const L = require("./sheet-link.js");
const M = require("./math-sheet.js");
const P = require("./editor-panel.js");
const D = require("./data.js");
const html = read("index.html"),
  app = read("app.js"),
  hub = read("make-hub.js");
const loc = { origin: "https://pen.example", pathname: "/" };

// ---- 1. 二维码内容：编码重新生成“这张纸”的链接 ----
{
  const hash = L.hashFor("hanzi", { text: "山水", cellType: "mzg", size: 14, showPinyin: true, traceNum: 4 });
  assert.strictEqual(hash, "#/hanzi?text=%E5%B1%B1%E6%B0%B4&cell=mzg&size=14&pinyin=1&trace=4");
  const qr = L.qrUrl(hash, loc);
  assert.strictEqual(qr, "https://pen.example/#/hanzi?text=山水&cell=mzg&size=14&pinyin=1&trace=4"); // v9b：汉字原文入码
  assert.ok(L.bytes(qr) <= L.QR_MAX_BYTES);
  // 别的类型也编码（英文单词）
  assert.strictEqual(L.hashFor("word", { text: "cat dog", cellType: "fourLine", size: 9 }), "#/word?text=cat+dog&cell=fourLine&size=9");
  // 太长：退回首页，保证约 12mm 的码仍然能扫
  const long = L.hashFor("duanluo", { text: "床前明月光疑是地上霜".repeat(12), size: 10 });
  assert.strictEqual(L.qrUrl(long, loc), "https://pen.example/");
  // 配置的公开地址优先
  assert.strictEqual(L.qrUrl("#/calc?grade=2", loc, "https://xx.example"), "https://xx.example/#/calc?grade=2");
  // 课本内容：编码课次选择（短）
  assert.strictEqual(
    L.hashFor("duanluo", {}, { lessonId: "pd-cn-1-upper", kind: "sentences", itemIds: ["sentences-0"] }),
    "#/duanluo?course=pd-cn-1-upper&kind=sentences&items=sentences-0",
  );
  // 计算纸
  const calcHash = L.hashFor("calc", M.toParams(M.normalize({ grade: 1 })));
  assert.ok(calcHash.startsWith("#/calc?grade=1&topic=bank-math-1-upper-add"));
  assert.ok(L.bytes(L.qrUrl(calcHash, loc)) <= L.QR_MAX_BYTES, "calc link fits QR");
  // 引擎按 model.footerUrl 画码，二维码放大到约 10mm
  const engine = read("engine.js");
  assert.ok(/const QR_SIZE = 45;/.test(engine) && /link \|\| footerUrl\(\)/.test(engine));
  assert.ok(/model\.footerUrl = SheetLink\.qrUrl\(currentSheetHash\(\)/.test(app));
  // 从链接还原：任何类型
  const restored = L.applyParams(D.defaults("word"), new URLSearchParams("text=cat&size=9&trace=2&mode=copy"), "word");
  assert.strictEqual(JSON.stringify([restored.text, restored.size, restored.traceNum, restored.practiceMode]), JSON.stringify(["cat", 9, 2, "copy"]));
}

// ---- 2. 跟课本：顶部导航与首页按钮都进入 #/course；素材库是其中的标签，有自己的容器 ----
{
  assert.strictEqual(N.AREAS.find((a) => a.id === "textbook").href, "#/course");
  assert.ok(html.includes('<a href="#/course" data-area="textbook">'));
  assert.ok(!html.includes('data-area="textbook" href="#/materials"') && !html.includes('<a href="#/materials" data-area'));
  assert.deepStrictEqual(N.TEXTBOOK_TABS.map((t) => t.href), ["#/course", "#/materials"]);
  assert.ok(/class="hub-tabs textbook-switch"[^>]*><a class="hub-tab" href="#\/course"/.test(html), "course page tabs");
  assert.ok(read("material-library.js").includes("by('materials-view')"), "materials own container");
  assert.ok(html.includes('<main id="materials-view" hidden></main>'));
  const personal = app.slice(app.indexOf("personal = ["), app.indexOf("].includes(key);"));
  assert.ok(!personal.includes('"materials"'), "materials no longer rendered in personal-view");
  assert.strictEqual(N.areaOf("course"), "textbook");
  assert.strictEqual(N.areaOf("materials"), "textbook");
  assert.ok(!hub.includes('"#/materials" + (s.id'), "make hub footer goes to #/course");
}

// ---- 3. 分享：任何字帖都显示分享按钮，自己做的生成链接（游客可用） ----
{
  assert.ok(app.includes('$("share-workbook").hidden = false;'));
  assert.ok(!app.includes('$("share-workbook").hidden = !activeCourse;'));
  const handler = app.slice(app.indexOf('$("share-workbook").onclick'), app.indexOf("WorkbookAccount.ensure(() => $(\"share-workbook\")"));
  assert.ok(/if \(!activeCourse \|\| !WorkbookAccount\.user\(\)\)/.test(handler) && handler.includes("SheetLink.shareUrl"));
  const url = L.shareUrl(L.hashFor("cizu", { text: "春天 花朵", cellType: "tzg", size: 12 }), loc);
  assert.strictEqual(url, "https://pen.example/#/cizu?text=%E6%98%A5%E5%A4%A9+%E8%8A%B1%E6%9C%B5&cell=tzg&size=12");
  assert.strictEqual(L.shareUrl("#/duanluo?text=" + "a".repeat(3000), loc), null);
}

// ---- 4. 古诗：语文下的一等类型 ----
{
  const cn = N.MAKE_SUBJECTS.find((s) => s.id === "cn");
  assert.ok(cn.types.includes("gushi"));
  assert.strictEqual(N.areaOf("gushi"), "make");
  globalThis.D = D;
  const H = (() => {
    globalThis.document = { getElementById: () => null };
    globalThis.addEventListener = () => {};
    globalThis.NavMap = N;
    delete require.cache[require.resolve("./make-hub.js")];
    require("./make-hub.js");
    return globalThis.Hubs;
  })();
  const poems = H.gushiList();
  assert.strictEqual(poems.length, 12);
  assert.ok(poems.some((p) => p.title === "静夜思" && p.text.includes("床前明月光")));
  const href = H.gushiHref(poems[0]);
  assert.strictEqual(href, "#/duanluo?course=pd-cn-1-upper&kind=sentences&items=sentences-0&from=gushi");
  const sel = C.getSelection("pd-cn-1-upper", "sentences", ["sentences-0"]);
  assert.strictEqual(sel.type, "duanluo");
  assert.ok(app.includes('params.get("from") === "gushi"'), "gushi sheet stays under 做字帖");
}

// ---- 5. 数学只练计算：没有数字书写类型，旧链接跳转 ----
{
  const math = N.MAKE_SUBJECTS.find((s) => s.id === "math");
  assert.deepStrictEqual(math.types, ["calc"]);
  assert.strictEqual(math.module, "calc");
  assert.ok(!N.MAKE_SUBJECTS.some((s) => s.types.includes("number")));
  assert.strictEqual(N.redirectOf("number"), "calc");
  assert.strictEqual(N.areaOf("number"), "make");
  assert.ok(/if \(NavMap\.redirectOf\(key\)\)/.test(app));
  // 课本 / 素材库里的数学计算也进入计算练习页
  assert.ok(app.includes("MathRoute.isCalc(activeCourse)"));
  assert.ok(!(math.extra || []).some((e) => e[1].includes("#/materials")), "直接进计算页，不经过素材库");
}

// ---- 6. 数字答案格 ----
{
  assert.strictEqual(M.defaultBox(1), "fg");
  assert.strictEqual(M.defaultBox(2), "fg");
  assert.strictEqual(M.defaultBox(3), "line");
  assert.strictEqual(M.normalize({ grade: 2, box: "line" }).box, "line", "横线可选");
  const p = M.parse({ id: "q", text: "24 ÷ 9 = ____ 余 ____", answer: "2 余 6" });
  assert.strictEqual(JSON.stringify(p), JSON.stringify({ id: "q", parts: ["24 ÷ 9 =", "余", ""], blanks: [{ answer: "2", cells: 2 }, { answer: "6", cells: 2 }] }));
  assert.strictEqual(M.parse({ id: "q", text: "484 × 4 = ____", answer: "1936" }).blanks[0].cells, 4);
  const model = M.build({ grade: 1, n: 20, pages: 2, key: true });
  assert.strictEqual(model.problems.length, 40);
  assert.strictEqual(model.pageList.length, 4, "2 题目页 + 2 答案页");
  assert.strictEqual(model.cols, 2);
  // 画布：题目页每题至少 2 个方格；答案页把答案写进格子
  const calls = { rect: 0, text: [] };
  const ctx = new Proxy(
    { measureText: (t) => ({ width: String(t).length * 10 }), strokeRect() { calls.rect++; }, fillText(t) { calls.text.push(t); } },
    { get: (o, k) => (k in o ? o[k] : () => {}), set: () => true },
  );
  M.draw({ getContext: () => ctx }, model, 0, 1, "x");
  assert.ok(calls.rect >= 40, "digit boxes drawn: " + calls.rect);
  calls.text.length = 0;
  M.draw({ getContext: () => ctx }, model, 2, 1, "x");
  const first = model.pageList[2].list[0].blanks[0].answer;
  assert.ok(calls.text.includes(Array.from(first).pop()), "answer digit in box");
  // 参数往返
  const back = M.fromParams(new URLSearchParams(new URLSearchParams(M.toParams(model.settings)).toString()));
  assert.strictEqual(JSON.stringify(back), JSON.stringify(model.settings));
  // 课次链接
  assert.strictEqual(M.fromParams(new URLSearchParams("lesson=bank-math-2-upper-mul")).topic, "bank-math-2-upper-mul");
  assert.strictEqual(M.fromParams(new URLSearchParams("lesson=bank-math-2-upper-mul")).grade, 2);
  for (const g of [1, 2, 3, 4, 5, 6]) assert.ok(M.topics(g).length >= 5, "grade " + g);
}

// ---- 7. 科目之间不串设置 ----
{
  assert.strictEqual(P.subjectOf("paragraph"), "en");
  assert.strictEqual(P.subjectOf("number"), null);
  const leaked = { ...D.defaults("paragraph"), mathLayout: "trace", showPinyin: true, showBishun: true };
  const clean = P.isolate("paragraph", leaked, D.defaults("paragraph"));
  assert.ok(!("mathLayout" in clean));
  assert.strictEqual(clean.showPinyin, D.defaults("paragraph").showPinyin);
  const pen = P.isolate("pen-control", { ...D.defaults("pen-control"), pair: true, alphabetGuides: true }, D.defaults("pen-control"));
  assert.strictEqual(pen.pair, D.defaults("pen-control").pair);
  const cn = P.isolate("hanzi", { ...D.defaults("hanzi"), showPinyin: true }, D.defaults("hanzi"));
  assert.strictEqual(cn.showPinyin, true, "语文自己的设置保留");
  assert.ok(app.includes("s = EditorPanel.isolate(key, s, D.defaults(key));"));
  // 每个科目声明自己的模块
  assert.deepStrictEqual(N.MAKE_SUBJECTS.map((s) => s.id + ":" + s.module), ["cn:editor", "en:editor", "math:calc", "pen:editor"]);
}

// ---- 一周练习包：免登录预览下载，保存需登录（说明一致） ----
{
  assert.strictEqual(N.ME_TABS.find((t) => t.id === "weekly").desc, "免登录预览、下载；保存计划需登录");
  assert.ok(hub.includes("一周练习包可免登录预览和下载，保存计划需登录"));
}
console.log("v9-structure ok");
