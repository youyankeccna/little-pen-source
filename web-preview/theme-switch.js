"use strict";
// v5 主题切换：?theme=ink|bright|notebook（优先）→ localStorage → 默认 ink（纸与墨）。
(function () {
  const THEMES = { ink: "纸与墨", bright: "明亮课堂", notebook: "手帐本" };
  const key = "little-pen-theme";
  let t = new URLSearchParams(location.search).get("theme");
  try {
    if (THEMES[t]) localStorage.setItem(key, t);
    else t = localStorage.getItem(key);
  } catch {}
  if (!THEMES[t]) t = "ink";
  document.documentElement.dataset.theme = t;
  document.addEventListener("DOMContentLoaded", () => {
    const foot = document.querySelector(".studio-footer");
    if (!foot) return;
    const box = document.createElement("span");
    box.className = "theme-picker";
    box.setAttribute("aria-label", "界面风格");
    for (const [id, label] of Object.entries(THEMES)) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.setAttribute("aria-pressed", String(id === t));
      b.onclick = () => {
        try { localStorage.setItem(key, id); } catch {}
        const u = new URL(location.href);
        u.searchParams.set("theme", id);
        location.href = u.toString();
      };
      box.append(b);
    }
    foot.append(box);
  });
})();
