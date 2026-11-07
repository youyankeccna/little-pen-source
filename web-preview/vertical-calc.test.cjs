const assert = require("node:assert/strict");
const M = require("./math-sheet.js");
const L = require("./sheet-link.js");
const T = require("./template-gallery.js");

const oralLink = L.hashFor("calc", M.toParams(M.normalize({ grade: 1, topic: "bank-math-1-upper-add" })));
assert.ok(!oralLink.includes("layout"), oralLink);
assert.equal(M.fromParams(new URLSearchParams("grade=1&topic=bank-math-1-upper-add")).layout, undefined);
const oral = M.build({ grade: 1, topic: "bank-math-1-upper-add", fill: true, pages: 1, key: true });
assert.ok(oral.problems.length >= 20, "oral density stays");
assert.ok(!oral.pageList[0].cards);

function pageOf(model, answers) {
  return model.pageList.find((page) => page.answers === answers);
}
const add = M.build({ grade: 2, topic: "bank-math-2-upper-carry", layout: "vertical", fill: true, pages: 1, key: true });
assert.equal(add.settings.layout, "vertical");
assert.equal(add.settings.grade, 2);
assert.equal(add.settings.topic, "bank-math-2-upper-carry");
assert.equal(add.unsupported, undefined);
const addBody = pageOf(add, false);
const addKey = pageOf(add, true);
assert.equal(add.pageList.filter((page) => !page.answers).length, 1);
assert.deepEqual(addBody.list.map((item) => item.id), addKey.list.map((item) => item.id));
assert.ok(add.problems.length >= 4 && add.problems.length <= 12, "vertical is not packed like 28 oral problems: " + add.problems.length);
assert.equal(new Set(add.problems.map((item) => item.text)).size, add.problems.length);
for (const item of add.problems) {
  assert.equal(item.vertical.result, item.answer, item.text);
  assert.equal(item.vertical.op, "+");
  const student = M.stemGlyphs(item.vertical, false);
  assert.ok(student.length);
  assert.ok(student.every((glyph) => glyph.y < 2));
  assert.ok(item.vertical.glyphs.some((glyph) => glyph.y >= 2));
  const places = (y) => item.vertical.glyphs.filter((glyph) => glyph.y === y && glyph.c !== "+").map((glyph) => glyph.x);
  assert.equal(Math.max(...places(0)), Math.max(...places(1)), item.text);
}
const metrics = M.pageMetrics(add);
assert.equal(metrics.cell, 30);
for (const card of addBody.cards) {
  assert.ok(card.y >= metrics.top);
  assert.ok(card.y + card.h <= metrics.bottom + 0.1);
}
assert.ok(metrics.bottom - metrics.lastBottom < 220, "last problem stays near the printable bottom");
const addNext = M.build({ ...add.settings, start: add.next });
assert.ok(addNext.problems.length > 0);
assert.ok(addNext.problems.every((item) => !add.problems.some((prev) => prev.text === item.text)));
assert.equal(addNext.settings.layout, "vertical");
assert.equal(addNext.settings.box, add.settings.box);
const addEnd = M.build({ grade: 2, topic: "bank-math-2-upper-carry", layout: "vertical", fill: true, start: 100000 });
assert.equal(addEnd.problems.length, 0);
assert.equal(addEnd.exhausted, true);
assert.equal(addEnd.unsupported, undefined);
assert.ok(addEnd.next >= 100000);

const sub = M.build({ grade: 2, topic: "bank-math-2-upper-borrow", layout: "vertical", fill: true, key: true });
assert.ok(sub.problems.every((item) => item.vertical.op === "-" && item.vertical.result === item.answer));
assert.ok(sub.problems.every((item) => M.stemGlyphs(item.vertical, false).every((glyph) => glyph.y < 2)));

const mul = M.build({ grade: 3, topic: "bank-math-3-lower-mul-two", layout: "vertical", fill: true, key: true });
assert.ok(mul.problems.length >= 2 && mul.problems.length <= 10);
for (const item of mul.problems) {
  assert.equal(item.vertical.op, "×");
  assert.equal(item.vertical.result, item.answer);
  assert.ok(M.stemGlyphs(item.vertical, false).every((glyph) => glyph.y < 2));
  assert.ok(M.stemGlyphs(item.vertical, true).some((glyph) => glyph.y >= 2));
}

const div = M.build({ grade: 3, topic: "bank-math-3-lower-div-one", layout: "vertical", fill: true, key: true });
for (const item of div.problems) {
  assert.equal(item.vertical.op, "÷");
  assert.equal(item.vertical.result, item.answer);
  assert.ok(item.vertical.lines.some((line) => line.x1 !== line.x2), "division uses a bracket");
  assert.ok(!item.vertical.glyphs.some((glyph) => glyph.c === "÷"));
  const student = M.stemGlyphs(item.vertical, false);
  assert.ok(student.every((glyph) => glyph.y === 1));
  assert.ok(item.vertical.glyphs.some((glyph) => glyph.y === 0));
}
for (const card of pageOf(div, false).cards) assert.ok(card.y + card.h <= M.pageMetrics(div).bottom + 0.1);

for (const [grade, topic] of [[6, "bank-math-6-upper-fraction-mul"], [2, "bank-math-2-upper-chain"], [5, "bank-math-5-upper-equation"], [6, "bank-math-6-upper-percent"]]) {
  const blocked = M.build({ grade, topic, layout: "vertical", fill: true });
  assert.equal(blocked.problems.length, 0, topic);
  assert.equal(blocked.unsupported, true, topic);
}

const cards = T.templates.filter((item) => item.layout === "vertical");
assert.ok(cards.length >= 4);
assert.ok(cards.every((item) => item.type === "calc" && item.subject === "math"));
for (const id of ["calc-g2-carry-vertical", "calc-g2-borrow-vertical", "calc-g3-mul-vertical", "calc-g3-div-vertical"]) {
  const card = T.templates.find((item) => item.id === id);
  assert.equal(card.layout, "vertical");
  assert.match(T.href(card), /layout=vertical/);
  const opened = M.fromParams(new URLSearchParams(T.href(card).split("?")[1]));
  assert.equal(opened.layout, "vertical");
  assert.equal(opened.topic, card.topic);
}
const round = M.fromParams(new URLSearchParams(L.hashFor("calc", M.toParams(add.settings)).split("?")[1]));
assert.equal(round.layout, "vertical");
assert.equal(round.topic, add.settings.topic);
assert.equal(round.grade, 2);

console.log("PASS: vertical stems, hidden answers, division bracket, exhaustion and oral links");
