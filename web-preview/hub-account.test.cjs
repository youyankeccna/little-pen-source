const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const N = require("./nav-map.js");

function node() {
  const el = { className: "", textContent: "", href: "", children: [], attrs: {} };
  el.append = (...kids) => el.children.push(...kids);
  el.setAttribute = (key, value) => {
    el.attrs[key] = value;
  };
  el.replaceChildren = () => {
    el.children = [];
  };
  return el;
}
function textOf(el) {
  return [el.textContent || "", ...(el.children || []).map(textOf)].join("\n");
}
function badgeCount(el) {
  let n = el.textContent === "需登录" ? 1 : 0;
  for (const kid of el.children || []) n += badgeCount(kid);
  return n;
}

const personal = node();
const listeners = {};
let user = null;
const sandbox = {
  window: {
    NavMap: N,
    WorkbookAccount: { user: () => user },
    addEventListener(type, fn) {
      (listeners[type] ||= []).push(fn);
    },
  },
  document: {
    createElement: () => node(),
    getElementById(id) {
      return id === "personal-view" ? personal : null;
    },
  },
  location: { hash: "#/me" },
};
vm.runInContext(fs.readFileSync(__dirname + "/make-hub.js", "utf8"), vm.createContext(sandbox));
assert.equal(listeners.accountchange.length, 1);

function paint() {
  listeners.accountchange.forEach((fn) => fn());
  return textOf(personal);
}

user = null;
let text = paint();
assert.match(text, /薄弱字再练无需登录/);
assert.equal(badgeCount(personal), 5);

user = { username: "parent", childName: "小明" };
text = paint();
assert.match(text, /小明 的练习/);
assert.match(text, /安排、记录、收藏与孩子档案都在这里/);
assert.equal(badgeCount(personal), 0);

user = null;
text = paint();
assert.match(text, /薄弱字再练无需登录/);
assert.equal(badgeCount(personal), 5);

personal.children = [];
sandbox.location.hash = "#/library";
user = { username: "parent", childName: "小明" };
paint();
assert.equal(personal.children.length, 0, "other pages are not replaced");
console.log("PASS: 我的 hub refreshes on login and logout");
