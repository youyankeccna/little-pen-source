const assert = require("assert");
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
const E = ((globalThis.WorkbookData = require("./data.js")), require("./engine.js"));
assert.strictEqual(E.fitFontSize(50, 20, 100), 20);
assert.ok(Math.abs(E.fitFontSize(200, 20, 100) - 11) < 1e-9);
assert.strictEqual(E.fitFontSize(1000, 20, 100), 11);
console.log("PASS: quick start params, text cleaning, pinyin fit");
