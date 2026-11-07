const assert = require("assert");
const fs = require("fs");
const css = fs.readFileSync(__dirname + "/theme.css", "utf8");

function mediaBlock(source, header) {
  const at = source.indexOf(header);
  assert.ok(at >= 0, header);
  let depth = 0;
  for (let i = at; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(at, i + 1);
  }
  throw new Error("unclosed " + header);
}

const mobile = mediaBlock(css, "@media(max-width:700px)");
const ruleAt = mobile.indexOf(".account-actions .account-menu>div{");
assert.ok(ruleAt >= 0, "header account menu rule");
const rule = mobile.slice(ruleAt, mobile.indexOf("}", ruleAt) + 1);
assert.match(rule, /bottom:\s*auto/);
assert.match(rule, /top:\s*calc\(100% \+ 8px\)/);
assert.match(rule, /max-height:\s*min\(70dvh,\s*calc\(100dvh - 96px\)\)/);
assert.match(rule, /overflow:\s*auto/);
assert.match(rule, /width:\s*min\(200px,\s*calc\(100vw - 24px\)\)/);
const desktop = mediaBlock(css, "@media(min-width:1200px)");
assert.ok(!desktop.includes("account-menu>div"), "desktop account menu stays downward");
console.log("PASS: mobile header account menu opens downward and scrolls inside the viewport");
