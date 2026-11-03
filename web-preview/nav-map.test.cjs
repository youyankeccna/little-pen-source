const assert = require("assert");
const N = require("./nav-map.js");
assert.deepStrictEqual(
  N.AREAS.map((a) => a.label),
  ["首页", "做字帖", "跟课本", "我的"],
);
assert.strictEqual(N.areaOf(""), "home");
for (const k of ["make", "free", "hanzi", "pinyin", "word", "number", "pen-control", "early"])
  assert.strictEqual(N.areaOf(k), "make", k);
for (const k of ["materials", "course", "shared"]) assert.strictEqual(N.areaOf(k), "textbook", k);
for (const k of ["me", "daily", "weekly", "review", "library", "growth", "works", "share", "family"])
  assert.strictEqual(N.areaOf(k), "me", k);
assert.strictEqual(N.resolve("free"), "make");
assert.strictEqual(N.AREAS.find((area) => area.id === "textbook").href, "#/course", "跟课本始终进入课次选择页");
// v9：除“数字书写”（number，已移除，旧链接跳到计算练习）外，所有编辑器类型都在做字帖里出现且只出现一次；
// 另有两个独立页面：古诗（gushi）与计算练习（calc）。
const D = require("fs").readFileSync(__dirname + "/data.js", "utf8");
const types = [...D.matchAll(/^\s+'?([a-z-]+)'?:\{name:/gm)].map((m) => m[1]);
const listed = N.MAKE_SUBJECTS.flatMap((s) => s.types);
assert.strictEqual(types.length, 10);
assert.deepStrictEqual(
  [...listed].sort(),
  [...types.filter((t) => t !== "number"), ...Object.keys(N.MAKE_PAGES)].sort(),
);
assert.strictEqual(N.redirectOf("number"), "calc");
assert.strictEqual(N.AREAS.find((a) => a.id === "textbook").href, "#/course");
// “我的”标签名唯一（旧版存在 每日练习/每日一页/每日安排 三种叫法）
const labels = N.ME_TABS.map((t) => t.label);
assert.strictEqual(new Set(labels).size, labels.length);
console.log("nav-map ok");
