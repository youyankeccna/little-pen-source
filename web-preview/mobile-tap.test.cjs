"use strict";
// v10 手机端可点性回归：静态规则始终检查；有 playwright-core + Chrome 时再用 390x844 触屏真实点按。
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
const css = read("theme.css"), html = read("index.html");
assert.match(html, /viewport-fit=cover/, "viewport 需 viewport-fit=cover 才能拿到安全区");
assert.match(css, /#toast\{pointer-events:none\}/, "提示条不能拦截底栏点按");
assert.match(css, /font-size:16px!important/, "手机输入框需≥16px 防 iOS 自动放大");
assert.match(css, /min-height:44px!important/, "手机触控目标需≥44px");
assert.match(css, /safe-area-inset-bottom/);

function loadPw() {
  for (const p of [process.env.PW_PATH, "playwright-core", "/workspace/pw/node_modules/playwright-core"].filter(Boolean)) {
    try { return require(p); } catch (e) {}
  }
  return null;
}
const pw = loadPw();
const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome";
if (!pw || !fs.existsSync(chrome)) {
  console.log("mobile-tap: 静态检查通过；未找到 playwright-core/Chrome，跳过真机模拟点按");
  process.exit(0);
}
const port = 5300 + Math.floor(Math.random() * 500);
const srv = spawn("python3", [path.join(__dirname, "..", "server", "app.py"), "--port", String(port)], { stdio: "ignore", cwd: path.join(__dirname, "..") });
const base = `http://127.0.0.1:${port}/`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let browser;
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch (e) {} await wait(200); }
    browser = await pw.chromium.launch({ executablePath: chrome });
    const ctx = await browser.newContext({ ...pw.devices["iPhone 13"], viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    const go = async (h) => { await page.goto(base + h); await page.waitForTimeout(900); await page.evaluate(() => document.getElementById("version-skip")?.click()); };
    // 真实触屏点按：中心点最上层元素必须是目标本身
    const tap = async (sel) => {
      const p = await page.evaluate((sel) => {
        const e = document.querySelector(sel); e.scrollIntoView({ block: "center", behavior: "instant" });
        const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        return { x, y, ok: e.contains(document.elementFromPoint(x, y)), top: document.elementFromPoint(x, y)?.className };
      }, sel);
      assert.ok(p.ok, `${sel} 被 ${p.top} 挡住`);
      await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(500);
    };
    const audit = async (h) => {
      await go(h);
      const bad = await page.evaluate(() => {
        const out = [];
        if (document.documentElement.scrollWidth > innerWidth + 1) out.push("横向溢出");
        for (const e of document.querySelectorAll("button,a.chip,.chip,.hub-tab,.calc-chip,input:not([type=checkbox]):not([type=radio]):not([type=range]),select")) {
          if (!e.offsetParent || e.closest("details:not([open]),[hidden],.sr-only,dialog:not([open])")) continue;
          e.scrollIntoView({ block: "center", behavior: "instant" });
          const r = e.getBoundingClientRect(); if (!r.width) continue;
          const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (t && !e.contains(t) && !t.contains(e)) out.push("挡住:" + e.textContent.trim().slice(0, 10) + "←" + t.className);
          if (/^(INPUT|SELECT)$/.test(e.tagName) && parseFloat(getComputedStyle(e).fontSize) < 16) out.push("小字输入:" + (e.id || e.name));
          if (e.matches(".chip,.hub-tab,.calc-chip") && r.height < 44) out.push("小目标:" + e.textContent.trim().slice(0, 8) + r.height);
        }
        return out;
      });
      assert.deepStrictEqual(bad, [], h + " " + bad.join(" | "));
    };
    for (const h of ["#/", "#/make?subject=en", "#/calc", "#/course", "#/materials", "#/me", "#/weekly", "#/hanzi?text=%E8%A1%8C%E9%95%BF"]) await audit(h);
    // 编辑器：提示出现时底栏仍可点；点字帖改读音
    await go("#/hanzi?text=%E8%A1%8C%E9%95%BF&pinyin=1");
    await page.evaluate(() => toast("测试提示"));
    await tap("#print");
    await tap(".page-wrapper.tap-reading");
    assert.ok(await page.evaluate(() => document.getElementById("readings-dialog").open), "点字帖应打开读音");
    await tap("#readings-dialog .reading-chip:nth-child(2)");
    await tap("#readings-dialog .close");
    assert.ok(!(await page.evaluate(() => !!document.querySelector("dialog[open]"))), "关闭后不应残留弹窗");
    // 底部导航
    await go("#/");
    for (const a of ["make", "textbook", "me", "home"]) { await tap(`.rail-navigation a[data-area=${a}]`); await page.evaluate(() => document.getElementById("version-skip")?.click()); }
    assert.ok(page.url().endsWith("#/"));
    await go("#/materials"); await tap("#bank-preview"); assert.match(page.url(), /#\/hanzi/);
    assert.deepStrictEqual(errs, []);
    console.log("mobile-tap: 390x844 触屏点按全部通过");
  } finally { if (browser) await browser.close(); srv.kill(); }
})().catch((e) => { console.error(e); srv.kill(); process.exit(1); });
