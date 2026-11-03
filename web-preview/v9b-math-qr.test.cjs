"use strict";
// v9b：①数学只练计算——跟课本/素材库里任何数学入口都进入 #/calc；②二维码 12mm、360 字节内可解码。
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const C = require("./curriculum/data.js");
globalThis.CurriculumData = C;
const MathSheet = require("./math-sheet.js");
const SheetLink = require("./sheet-link.js");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

// ① 每个数学课次（含数字、算式、用语书写包）都映射到计算页，并预选年级与专项
const mathLessons = C.lessons.filter((l) => l.subject === "math");
assert.ok(mathLessons.length > 10);
for (const l of mathLessons) {
  const h = MathSheet.hashForLesson(l);
  assert.ok(h.startsWith("#/calc?"), l.id);
  const q = new URLSearchParams(h.split("?")[1]);
  const g = Number(q.get("grade"));
  assert.ok(g >= 1 && g <= 6, l.id);
  if (l.grade >= 1) assert.strictEqual(g, l.grade, l.id);
  const list = MathSheet.topics(g);
  if (list.length) assert.ok(list.some((t) => t.id === q.get("topic")), l.id + " topic");
  // 通过 lesson= 进入时也落在同一个专项
  assert.strictEqual(MathSheet.fromParams(new URLSearchParams({ lesson: l.id })).topic, MathSheet.normalize({ grade: g, topic: q.get("topic") }).topic);
}
// 课题相近：一年级"20以内的进位加法"类课次应选到加法专项而非随便第一个
const add = mathLessons.find((l) => l.grade === 1 && /加/.test(l.title) && !l.materialLibrary);
if (add) assert.ok(/加/.test(MathSheet.topics(1).find((t) => t.id === MathSheet.topicForLesson(add)).title));

const app = read("app.js");
assert.ok(/isCalc: \(c\) => c\?\.subject === "math",/.test(app), "任何数学课次都进计算页");
assert.ok(/key === "materials" && params\.get\("subject"\) === "math"/.test(app), "素材库数学重定向");
const ui = read("curriculum/ui.js");
assert.ok(/if\(subject==='math'\)\{box\.append\(mathCard\(lesson\)\);return;\}/.test(ui), "课次页数学不列书写包");
assert.ok(ui.indexOf("mathCard(lesson)") < ui.indexOf("const tabs=make('div',undefined,'course-kinds')"));
const ml = read("material-library.js");
assert.ok(/if\(subject==='math'\)\{history\.replaceState\(null,'','#\/calc\?grade=/.test(ml));
assert.ok(/id==='math'\?'#\/calc\?grade='/.test(ml));
// 做字帖里的数学也只有计算
const N = require("./nav-map.js");
assert.deepStrictEqual(N.MAKE_SUBJECTS.find((s) => s.id === "math").types, ["calc"]);
assert.strictEqual(N.redirectOf("number"), "calc");

// ② 二维码：360 字节、UTF-8 原文、纠错 L、12mm
assert.strictEqual(SheetLink.QR_MAX_BYTES, 360);
const engine = read("engine.js");
assert.ok(/const QR_SIZE = 45;/.test(engine) && /qrcode\(0, "L"\)/.test(engine) && /stringToBytesFuncs\["UTF-8"\]/.test(engine));
const W = 791.8, mmOf = (u) => (u * 210) / W;
const mm = mmOf(45);
assert.ok(mm > 11.5 && mm < 12.5, "约 12mm");
const poem = "床前明月光疑是地上霜举头望明月低头思故乡春眠不觉晓处处闻啼鸟夜来风雨声花落知多少白日依山尽黄河入海流欲穷千里目更上一层楼";
const loc = { origin: "https://littlepen.example.com", pathname: "/" };
const textOf = (n) => Array.from({ length: n }, (_, i) => poem[i % poem.length]).join("");
let maxChars = 0;
for (let n = 1; n < 400; n++) {
  const u = SheetLink.qrUrl(SheetLink.hashFor("duanluo", { text: textOf(n), cellType: "tian", size: 12 }), loc);
  if (u === "https://littlepen.example.com/") break;
  maxChars = n;
}
assert.ok(maxChars >= 90, "约 100 个汉字内仍编码本张纸，实际 " + maxChars);
const longUrl = SheetLink.qrUrl(SheetLink.hashFor("duanluo", { text: textOf(maxChars), cellType: "tian", size: 12 }), loc);
assert.ok(/text=床前明月光/.test(longUrl), "汉字原文入码");
assert.strictEqual(new URLSearchParams(new URL(longUrl).hash.split("?")[1]).get("text"), textOf(maxChars), "扫码后能还原文本");

let jsQR = null;
for (const p of ["jsqr", "/workspace/pw/node_modules/jsqr"]) {
  try { jsQR = require(p); break; } catch {}
}
if (!jsQR) {
  console.log("v9b-math-qr ok (jsQR 未安装，跳过解码)；最大汉字数 " + maxChars);
  return;
}
const qrcode = require("./vendor/qrcode.js");
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
function decodeAt(text, sizeMm, dpi, blur) {
  const q = qrcode(0, "L");
  q.addData(text, "Byte");
  q.make();
  const n = q.getModuleCount(), px = Math.round((sizeMm / 25.4) * dpi), pad = Math.round((px * 4) / n), tot = px + 2 * pad, cell = px / n;
  let g = new Float32Array(tot * tot);
  for (let y = 0; y < tot; y++)
    for (let x = 0; x < tot; x++) {
      let s = 0;
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const c = Math.floor((x + (sx + 0.5) / 4 - pad) / cell), r = Math.floor((y + (sy + 0.5) / 4 - pad) / cell);
          s += r >= 0 && c >= 0 && r < n && c < n && q.isDark(r, c) ? 0 : 255;
        }
      g[y * tot + x] = s / 16;
    }
  if (blur) {
    const h = new Float32Array(g.length);
    for (let y = 0; y < tot; y++)
      for (let x = 0; x < tot; x++) {
        let s = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < tot && xx < tot) { s += g[yy * tot + xx]; k++; } }
        h[y * tot + x] = s / k;
      }
    g = h;
  }
  const up = 3, Wd = tot * up, out = new Uint8ClampedArray(Wd * Wd * 4);
  for (let y = 0; y < Wd; y++) for (let x = 0; x < Wd; x++) { const v = g[Math.floor(y / up) * tot + Math.floor(x / up)], i = (y * Wd + x) * 4; out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255; }
  const r = jsQR(out, Wd, Wd);
  return { modules: n, ok: !!r && r.data === text };
}
const results = [[600, 0], [600, 1], [300, 0]].map(([dpi, blur]) => decodeAt(longUrl, mm, dpi, blur));
assert.ok(results.every((r) => r.ok), "最长链接在 12mm 可解码：" + JSON.stringify(results));
assert.ok(decodeAt(SheetLink.qrUrl("#/calc?grade=1&topic=x", loc), mm, 300, 1).ok, "短链接即使模糊也可解码");
console.log("v9b-math-qr ok；最长 " + maxChars + " 个汉字，" + SheetLink.bytes(longUrl) + " 字节，" + results[0].modules + " 模块，" + mm.toFixed(1) + "mm");
