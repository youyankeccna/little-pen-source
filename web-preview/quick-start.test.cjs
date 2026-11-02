const assert = require("assert");
globalThis.WorkbookData = require("./data.js");
const Q = require("./quick-start.js");
assert.strictEqual(Q.cleanText("春abc夏!秋123冬"), "春夏秋冬");
assert.strictEqual(Array.from(Q.cleanText("字".repeat(200))).length, Q.MAX_CHARS);
assert.deepStrictEqual(Q.normalize({ text: "山", cell: "bad", size: 99 }), {
  text: "山",
  cell: "tzg",
  size: 30,
  pinyin: false,
});
const h = Q.hashFor({ text: "日月", cell: "mzg", size: 18, pinyin: true });
assert.ok(h.startsWith("#/hanzi?"));
const p = new URLSearchParams(h.split("?")[1]);
const s = Q.applyParams({ text: "x", cellType: "tzg", size: 10 }, p);
assert.deepStrictEqual([s.text, s.cellType, s.size, s.showPinyin], ["日月", "mzg", 18, true]);
assert.strictEqual(Q.applyParams({ text: "x" }, new URLSearchParams("")).text, "x");
assert.strictEqual(Q.applyParams({ text: "x" }, new URLSearchParams("text=abc")).text, "x");
const dirty = {
  ...WorkbookData.defaults("hanzi"),
  text: "旧内容",
  cellType: "mzg",
  size: 18,
  showPinyin: false,
  fillPage: true,
  traceNum: 20,
  practiceMode: "answer",
  fadeTrace: true,
  fadeStyle: "more-write",
  showBishun: true,
  leading: false,
  blankRow: true,
  font: "wenkai",
  scale: 90,
};
const other = { ...dirty, practiceMode: "copy", fadeTrace: false, showBishun: false, font: "song", traceNum: 1 };
const quick = { text: "春夏秋冬", cell: "fg", size: 14, pinyin: true };
const preview = Q.sheetState(quick);
for (const prior of [dirty, other]) {
  const generated = Q.applyParams(prior, new URLSearchParams(Q.hashFor(quick).split("?")[1]));
  assert.deepStrictEqual(generated, preview);
}
assert.equal(preview.cellType, "fg");
assert.equal(preview.size, 14);
assert.equal(preview.showPinyin, true);
assert.equal(preview.text, "春夏秋冬");
assert.equal(preview.traceNum, 4);
assert.equal(preview.leading, true);
assert.equal(preview.fillPage, false);
assert.equal(preview.practiceMode, "trace");
assert.equal(preview.fadeTrace, false);
assert.equal(preview.showBishun, false);
assert.equal(preview.blankRow, false);
assert.equal(preview.font, "kaiti");
assert.equal(dirty.fadeTrace, true);
assert.equal(dirty.font, "wenkai");
const E = require("./engine.js");
assert.strictEqual(E.fitFontSize(50, 20, 100), 20);
assert.ok(Math.abs(E.fitFontSize(200, 20, 100) - 11) < 1e-9);
assert.strictEqual(E.fitFontSize(1000, 20, 100), 11);
console.log("PASS: quick start params, text cleaning, pinyin fit");
