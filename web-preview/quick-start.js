(function (root) {
  "use strict";
  const GRIDS = [
    ["tzg", "田字格"],
    ["mzg", "米字格"],
    ["hgg", "回宫格"],
    ["fg", "方格"],
  ];
  const SIZES = [
    [10, "小 1cm"],
    [14, "中 1.4cm"],
    [18, "大 1.8cm"],
  ];
  const MAX_CHARS = 80;
  // Keep CJK characters plus line breaks / spaces; drop everything else so the sheet never renders tofu.
  function cleanText(input) {
    const out = Array.from(String(input || ""))
      .filter((c) => /[\u3400-\u9fff\uf900-\ufaff\n ]/.test(c))
      .join("")
      .replace(/ {2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return Array.from(out).slice(0, MAX_CHARS).join("");
  }
  function normalize(opts) {
    const cell = GRIDS.some((g) => g[0] === opts.cell) ? opts.cell : "tzg";
    const size = Math.min(30, Math.max(6, Number(opts.size) || 14));
    return { text: cleanText(opts.text), cell, size, pinyin: !!opts.pinyin };
  }
  function hashFor(opts) {
    const n = normalize(opts);
    const q = new URLSearchParams({ text: n.text, cell: n.cell, size: String(n.size) });
    if (n.pinyin) q.set("pinyin", "1");
    return "#/hanzi?" + q.toString();
  }
  // Applies quick-generate URL params onto an editor state; returns a new object.
  function applyParams(state, params) {
    if (!params.has("text")) return state;
    const n = normalize({
      text: params.get("text"),
      cell: params.get("cell"),
      size: params.get("size"),
      pinyin: params.get("pinyin") === "1",
    });
    if (!n.text) return state;
    return {
      ...state,
      text: n.text,
      cellType: n.cell,
      size: n.size,
      showPinyin: n.pinyin,
      fillPage: false,
      traceNum: 4,
      practiceMode: "trace",
    };
  }
  const api = { GRIDS, SIZES, MAX_CHARS, cleanText, normalize, hashFor, applyParams };
  root.QuickStart = api;
  if (typeof module !== "undefined") module.exports = api;

  if (typeof document === "undefined") return;
  function init() {
    const form = document.getElementById("quick-form");
    if (!form || !root.WorkbookEngine) return;
    const E = root.WorkbookEngine,
      D = root.WorkbookData;
    const input = document.getElementById("quick-text"),
      canvas = document.getElementById("quick-paper"),
      measure = document.createElement("canvas").getContext("2d");
    const opts = { text: "春夏秋冬", cell: "tzg", size: 14, pinyin: true };
    const chips = (id, list, key) => {
      const box = document.getElementById(id);
      list.forEach(([value, label]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = label;
        b.dataset.value = value;
        b.onclick = () => {
          opts[key] = value;
          draw();
        };
        box.append(b);
      });
    };
    chips("quick-grids", GRIDS, "cell");
    chips("quick-sizes", SIZES, "size");
    document.querySelectorAll("[data-quick-text]").forEach((b) => {
      b.onclick = () => {
        input.value = b.dataset.quickText;
        opts.text = b.dataset.quickText;
        draw();
      };
    });
    const pinyin = document.getElementById("quick-pinyin");
    pinyin.onchange = () => {
      opts.pinyin = pinyin.checked;
      draw();
    };
    let timer;
    input.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        opts.text = input.value;
        draw();
      }, 150);
    };
    function draw() {
      const n = normalize(opts);
      document
        .querySelectorAll("#quick-grids .chip")
        .forEach((c) => c.classList.toggle("active", c.dataset.value === n.cell));
      document
        .querySelectorAll("#quick-sizes .chip")
        .forEach((c) => c.classList.toggle("active", Number(c.dataset.value) === n.size));
      document.getElementById("quick-hint").textContent = n.text
        ? `共 ${Array.from(n.text.replace(/\s/g, "")).length} 个字 · A4 纸 · 默认描红 + 留空练写`
        : "请输入汉字（只保留汉字，最多 80 个）";
      document.getElementById("quick-go").disabled = !n.text;
      const s = {
        ...D.defaults("hanzi"),
        text: n.text || "春夏秋冬",
        cellType: n.cell,
        size: n.size,
        showPinyin: n.pinyin,
        fillPage: false,
        traceNum: 4,
        practiceMode: "trace",
      };
      measure.font = E.fontString(s);
      E.drawPage(
        canvas,
        E.build("hanzi", s, (t) => measure.measureText(t).width),
        0,
        1,
      );
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      opts.text = input.value;
      if (normalize(opts).text) location.hash = hashFor(opts);
    };
    input.value = opts.text;
    pinyin.checked = opts.pinyin;
    draw();
    document.fonts && document.fonts.ready.then(draw);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof globalThis !== "undefined" ? globalThis : this);
