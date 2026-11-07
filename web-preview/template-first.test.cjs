const assert = require("node:assert/strict");
const fs = require("node:fs");
const D = require("./data.js");
const E = require("./engine.js");
const T = require("./template-gallery.js");
const M = require("./math-sheet.js");
const C = require("./curriculum/data.js");

const SUBJECT_TYPES = {
  cn: ["hanzi", "cizu", "duanluo", "pinyin"],
  en: ["alphabet", "word", "paragraph"],
  math: ["calc"],
  pen: ["pen-control"],
};
const placeholder = /待补充|占位|TODO|lorem|xxx/i;

assert.equal(new Set(T.templates.map((t) => t.id)).size, T.templates.length);
assert.ok(T.templates.length >= 40, "at least 40 templates, got " + T.templates.length);
for (const subject of Object.keys(SUBJECT_TYPES)) {
  assert.ok(T.templates.some((t) => t.subject === subject), subject);
}
const signature = (t) => JSON.stringify({ type: t.type, config: t.config || null, topic: t.topic || "", fillMode: t.fillMode || "" });
assert.equal(new Set(T.templates.map(signature)).size, T.templates.length, "templates differ by content or practice, not only title");
assert.ok(!T.templates.some((t) => t.type === "number"));

for (const t of T.templates) {
  assert.ok(SUBJECT_TYPES[t.subject].includes(t.type), t.id);
  assert.ok(t.title && t.description && !placeholder.test(t.title + t.description), t.id);
  if (t.type === "calc") {
    const lesson = C.getLesson(t.topic);
    const items = (lesson?.packs || []).find((p) => p.kind === "calculations")?.items || [];
    assert.equal(lesson && lesson.subject, "math", t.id);
    assert.ok(items.length > 0, t.id);
    assert.equal(t.grade, lesson.grade, t.id);
  } else {
    assert.equal(typeof t.config.text, "string");
    assert.ok(t.config.text.trim() && !placeholder.test(t.config.text), t.id);
  }
}

function nearBottom(model) {
  const last = model.g.y + model.rows.length * (model.g.rowHeight + model.g.gap);
  const limit = model.g.y + model.g.rows * (model.g.rowHeight + model.g.gap);
  assert.ok(limit - last < model.g.rowHeight + model.g.gap, "last row stays near the printable bottom");
}

for (const subject of ["cn", "en", "pen"]) {
  const t = T.templates.find((item) => item.subject === subject);
  const state = T.stateFor(t.id, t.type);
  assert.equal(state.templateId, t.id);
  assert.equal(state.fillPage, true);
  assert.equal(state.text, t.config.text);
  const model = E.build(t.type, state, () => 8);
  assert.equal(model.pages, 1, t.id);
  assert.equal(model.state.size, state.size);
  assert.equal(model.g.size, state.size * E.MM);
  assert.deepEqual(model.state.padding, state.padding);
  nearBottom(model);
}
const calcCard = T.templates.find((t) => t.subject === "math");
const calc = M.build({ grade: calcCard.grade, topic: calcCard.topic, fill: true, pages: 1, key: true });
const calcBody = calc.pageList.filter((p) => !p.answers);
const calcAnswers = calc.pageList.filter((p) => p.answers);
assert.equal(calcBody.length, 1);
assert.equal(calcAnswers.length, 1);
assert.deepEqual(calcBody[0].list.map((p) => p.id), calcAnswers[0].list.map((p) => p.id));
assert.ok(calc.problems.length > 1);

for (const t of T.templates.filter((item) => item.type !== "calc")) {
  const state = T.stateFor(t.id, t.type);
  const model = E.build(t.type, state, () => 8);
  assert.equal(model.pages, 1, t.id + " one body page");
  assert.equal(model.state.size, t.config.size || D.defaults(t.type).size);
  assert.deepEqual(model.state.padding, D.defaults(t.type).padding);
  if (t.fillMode === "verse") {
    const lines = state.text.split("\n").map((line) => line.trim()).filter(Boolean);
    assert.equal(state.cellType, "hxg");
    for (const row of model.rows) assert.ok(lines.includes(row), t.id + " cut a verse: " + row);
    for (const line of lines) assert.ok(model.rows.includes(line), t.id + " dropped " + line);
    for (const ch of state.text.replace(/\s/g, "")) assert.ok(model.rows.join("").includes(ch));
    assert.ok(model.g.rows - model.rows.length < lines.length);
  } else nearBottom(model);
}

const sample = M.build({ grade: 1, topic: "bank-math-1-upper-add", fill: true, pages: 1, key: true });
const body = sample.pageList.filter((p) => !p.answers);
assert.equal(body.length, 1);
const texts = body[0].list.map((p) => p.parts.join(""));
assert.equal(new Set(texts).size, texts.length, "no duplicate on one page");
const metrics = M.pageMetrics(sample);
assert.equal(metrics.pad, 15 * (791.8 / 210));
assert.ok(Math.abs(metrics.box - metrics.target) < 0.2, "answer boxes keep the grade size");
const second = M.build({ ...sample.settings, start: sample.next });
const secondTexts = second.pageList.find((p) => !p.answers).list.map((p) => p.parts.join(""));
assert.ok(secondTexts.length > 0);
assert.ok(secondTexts.every((text) => !texts.includes(text)));
const empty = M.build({ grade: 1, topic: "bank-math-1-upper-add", fill: true, start: 100000 });
assert.equal(empty.problems.length, 0);
assert.equal(empty.exhausted, true);
assert.ok(empty.next >= 100000);
const again = M.build({ grade: 1, topic: "bank-math-1-upper-add", fill: true, start: empty.next });
assert.equal(again.problems.length, 0);

const custom = T.stateFor("pinyin-trace", "hanzi");
custom.size = 16;
custom.cellType = "fg";
custom.traceNum = 2;
custom.showPinyin = false;
const changed = T.nextContent(custom, "pinyin-trace", "hanzi", 1);
assert.equal(changed.exhausted, false);
assert.equal(changed.state.size, 16);
assert.equal(changed.state.cellType, "fg");
assert.equal(changed.state.traceNum, 2);
assert.equal(changed.state.showPinyin, false);
assert.notEqual(changed.state.text, custom.text);
assert.equal(changed.state.templateId, "pinyin-trace");
const done = T.nextContent(changed.state, "pinyin-trace", "hanzi", 2);
assert.equal(done.exhausted, true);
assert.equal(done.state.text, changed.state.text);
const switched = T.stateFor("letter-trace", "alphabet");
assert.equal(switched.templateId, "letter-trace");
assert.equal(switched.text, "ABCDEF");
const isolated = T.nextContent(custom, "letter-trace", "alphabet", 0);
assert.equal(isolated.state.templateId, "letter-trace");
assert.equal(isolated.state.text, "ABCDEF");
assert.notEqual(isolated.state.cellType, "fg");

const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const css = fs.readFileSync(__dirname + "/theme.css", "utf8");
const hub = fs.readFileSync(__dirname + "/make-hub.js", "utf8");
assert.ok(html.includes('id="next-sheet"'));
assert.ok(html.includes("viewport-fit=cover"));
assert.ok(html.includes(">首页<") && html.includes(">做字帖<") && html.includes(">跟课本<") && html.includes(">我的<"));
assert.ok(html.includes("自己输入内容（可选）"));
assert.ok(css.includes("#next-sheet") && css.includes("#calc-next"));
assert.ok(css.includes("#toast{pointer-events:none}"));
assert.ok(hub.includes('t.type === "calc"') || hub.includes("t.type === 'calc'"));
assert.ok(!hub.includes('x.module === "calc" ? "#/calc'));

console.log("PASS: template count, one-page fill, poem lines, calc batches and next-sheet settings");
