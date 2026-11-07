const assert = require("assert");
const P = require("./editor-panel.js");
assert.strictEqual(P.modeOf({}), "trace");
assert.strictEqual(P.modeOf({ practiceMode: "trace", fadeTrace: true }), "fade");
assert.strictEqual(P.modeOf({ practiceMode: "answer" }), "quiz");
let s = P.applyMode({ practiceMode: "copy", traceNum: 20, fadeTrace: true }, "trace");
assert.deepStrictEqual([s.practiceMode, s.traceNum, s.fadeTrace], ["trace", 4, false]);
s = P.applyMode({ traceNum: 2 }, "fade");
assert.deepStrictEqual(
  [s.practiceMode, s.fadeTrace, s.traceNum, s.fadeStyle],
  ["trace", true, 8, "more-trace"],
);
s = P.applyMode({ showPinyin: false, showBishun: true }, "quiz");
assert.deepStrictEqual([s.practiceMode, s.showPinyin, s.showBishun], ["quiz", true, false]);
assert.strictEqual(P.applyMode({ practiceMode: "trace", traceNum: 5 }, "trace").traceNum, 5);
const orig = { a: 1 };
assert.strictEqual(P.applyMode(orig, "nope"), orig);
for (const [k, v] of Object.entries(P.PLACEMENT))
  assert.ok(["primary", "paper", "font", "trace"].includes(v), k);
assert.strictEqual(Object.values(P.PLACEMENT).filter((v) => v === "primary").length, 7);
console.log("PASS: editor panel modes and placement");
