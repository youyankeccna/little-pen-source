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
// 所有 10 种练习类型都在做字帖里出现且只出现一次
const D = require("fs").readFileSync(__dirname + "/data.js", "utf8");
const types = [...D.matchAll(/^\s+'?([a-z-]+)'?:\{name:/gm)].map((m) => m[1]);
const listed = N.MAKE_SUBJECTS.flatMap((s) => s.types);
assert.strictEqual(types.length, 10);
assert.deepStrictEqual([...listed].sort(), [...types].sort());
// “我的”标签名唯一（旧版存在 每日练习/每日一页/每日安排 三种叫法）
const labels = N.ME_TABS.map((t) => t.label);
assert.strictEqual(new Set(labels).size, labels.length);
console.log("nav-map ok");
