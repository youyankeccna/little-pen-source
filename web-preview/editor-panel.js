(function (root) {
  "use strict";
  // One-tap practice modes shown as cards above the preview (hanzi / cizu only).
  const MODES = [
    { id: "trace", title: "初学描红", desc: "1 个范字 + 3 个描红，其余留空" },
    { id: "copy", title: "独立临写", desc: "看范字，自己写" },
    { id: "quiz", title: "看拼音写字", desc: "复习自测，可出答案版" },
    { id: "fade", title: "渐隐描红", desc: "描红一格比一格淡" },
  ];
  function modeOf(state) {
    const m = state.practiceMode || "trace";
    if (m === "answer") return "quiz";
    if (m === "trace" && state.fadeTrace) return "fade";
    return m;
  }
  function applyMode(state, id) {
    const s = { ...state, fadeTrace: false };
    if (id === "trace") {
      s.practiceMode = "trace";
      if (!(s.traceNum > 0 && s.traceNum < 10)) s.traceNum = 4;
    } else if (id === "copy") s.practiceMode = "copy";
    else if (id === "quiz") {
      s.practiceMode = "quiz";
      s.showPinyin = true;
      s.showBishun = false;
    } else if (id === "fade") {
      s.practiceMode = "trace";
      s.fadeTrace = true;
      s.fadeStyle = s.fadeStyle || "more-trace";
      s.traceNum = Math.max(8, s.traceNum || 0);
    } else return state;
    return s;
  }
  // Where every editor control lives. "primary" = always visible next to the preview;
  // the rest go into the collapsed 更多设置 drawer, grouped by section.
  const PLACEMENT = {
    text: "primary",
    mode: "primary",
    cellChips: "primary",
    sizeChips: "primary",
    traceNum: "primary",
    showPinyin: "primary",
    fillPage: "primary",
    cellType: "paper",
    size: "paper",
    rowGap: "paper",
    padding: "paper",
    header: "paper",
    blankRow: "paper",
    blankCol: "paper",
    lineColor: "paper",
    font: "font",
    scale: "font",
    fontWeight: "font",
    offset: "font",
    letterSpace: "font",
    traceColor: "trace",
    leading: "trace",
    showBishun: "trace",
    fadeStyle: "trace",
    answer: "trace",
  };
  const REMOVED = {
    traceLayout: "“描红布局”下拉与“描红个数”重复，直接调个数即可",
    fadeTraceToggle: "已由“渐隐描红”模式卡片代替",
    practiceSelect: "已由模式卡片代替；答案版移到更多设置",
    compactToggle: "“调整纸张与字体/收起详细设置”按钮由折叠的“更多设置”代替",
  };
  // v9：每个科目是独立模块。这些设置只属于一个科目；出现在别的科目时恢复为该类型默认值。
  // 数学不再使用字帖编辑器（计算练习页自有设置），所以 mathLayout 不属于任何编辑器科目。
  const SUBJECT_ONLY = {
    showPinyin: ["cn"],
    showBishun: ["cn"],
    pair: ["en"],
    alphabetGuides: ["en"],
    guideStyle: ["en"],
    controlGuides: ["pen"],
    mathLayout: [],
  };
  const TYPE_SUBJECT = {
    hanzi: "cn",
    cizu: "cn",
    duanluo: "cn",
    bihua: "cn",
    pinyin: "cn",
    alphabet: "en",
    word: "en",
    paragraph: "en",
    "pen-control": "pen",
  };
  function subjectOf(type) {
    return TYPE_SUBJECT[type] || null;
  }
  function isolate(type, state, defaults = {}) {
    const subject = subjectOf(type),
      out = { ...state };
    for (const [key, owners] of Object.entries(SUBJECT_ONLY)) {
      if (!(key in out) || owners.includes(subject)) continue;
      if (key in defaults) out[key] = defaults[key];
      else delete out[key];
    }
    return out;
  }
  const api = { MODES, modeOf, applyMode, PLACEMENT, REMOVED, SUBJECT_ONLY, subjectOf, isolate };
  root.EditorPanel = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
