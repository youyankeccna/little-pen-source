"use strict";
// v5：两个新的汇总页 —— 做字帖（科目标签 + 练习类型卡片）与 我的（统一入口）。
window.Hubs = (() => {
  const N = window.NavMap;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const sample = {
    hanzi: "字",
    cizu: "词",
    duanluo: "文",
    bihua: "笔",
    pinyin: "ā",
    alphabet: "Aa",
    word: "Word",
    paragraph: "Text",
    number: "123",
    "pen-control": "线",
  };
  function card(href, mark, title, desc) {
    const a = el("a", "hub-card");
    a.href = href;
    const m = el("span", "hub-mark", mark),
      copy = el("span", "hub-copy");
    copy.append(el("strong", "", title), el("span", "", desc));
    a.append(m, copy);
    return a;
  }
  function make(subject) {
    const box = document.getElementById("make-hub");
    const s = N.MAKE_SUBJECTS.find((x) => x.id === subject) || N.MAKE_SUBJECTS[0];
    box.replaceChildren();
    const head = el("header", "hub-heading");
    head.append(
      el("span", "eyebrow", "做字帖"),
      el("h1", "", "选科目，再选练习方式"),
      el("p", "", "所有类型都进入同一个编辑器：输入内容 → 调格子和描红 → 打印或导出 PDF。"),
    );
    const tabs = el("nav", "hub-tabs");
    tabs.setAttribute("aria-label", "科目");
    for (const x of N.MAKE_SUBJECTS) {
      const a = el("a", "hub-tab", x.label);
      a.href = "#/make?subject=" + x.id;
      if (x.id === s.id) a.setAttribute("aria-current", "page");
      tabs.append(a);
    }
    const grid = el("div", "hub-grid");
    for (const t of s.types) {
      const info = D.types[t];
      grid.append(card("#/" + t, sample[t] || "字", info.name.replace(/^.*· /, ""), info.description));
    }
    for (const [title, href, desc] of s.extra || []) grid.append(card(href, "→", title, desc));
    const foot = el("p", "hub-foot");
    foot.append("想按课本年级挑字？去 ");
    const link = el("a", "", "跟课本");
    link.href = "#/materials" + (s.id === "pen" ? "" : "?subject=" + s.id);
    foot.append(link, "。");
    box.append(head, tabs, el("p", "hub-sub", s.desc), grid, foot);
  }
  function me() {
    const box = document.getElementById("personal-view");
    box.replaceChildren();
    const user = window.WorkbookAccount?.user?.();
    const head = el("header", "personal-heading hub-heading");
    head.append(
      el("span", "eyebrow", "我的"),
      el("h1", "", user?.childName ? user.childName + " 的练习" : "我的练习"),
      el(
        "p",
        "",
        user
          ? "安排、记录、收藏与孩子档案都在这里。"
          : "前三项无需登录，记录保存在本浏览器；其余项目登录后按孩子分别保存。",
      ),
    );
    box.append(head);
    const grid = el("div", "hub-grid me-grid");
    N.ME_TABS.forEach((t, i) => {
      const c = card("#/" + t.id, String(i + 1), t.label, t.desc);
      if (t.login && !user) c.append(el("small", "hub-lock", "需登录"));
      grid.append(c);
    });
    box.append(grid);
  }
  // “我的”区域内统一的子导航（替代旧版两套不一致的标签）
  function meTabs(current) {
    const nav = el("nav", "family-tabs me-tabs");
    nav.setAttribute("aria-label", "我的");
    const all = [{ id: "me", label: "全部" }, ...N.ME_TABS];
    for (const t of all) {
      const a = el("a", "", t.label);
      a.href = "#/" + t.id;
      if (t.id === current) a.setAttribute("aria-current", "page");
      nav.append(a);
    }
    return nav;
  }
  return { make, me, meTabs };
})();
