"use strict";
(function (root) {
  const gradeNames = ["幼儿园", "一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];
  function row(name, values, value, onChange) {
    const row = document.createElement("div"), title = document.createElement("span"), group = document.createElement("div");
    row.className = "picker-row";
    title.className = "picker-name";
    title.textContent = name;
    group.className = "picker-chips";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", name);
    for (const [key, label, disabled, tag] of values) {
      const button = document.createElement("button"), text = document.createElement("span");
      const active = String(key) === String(value);
      button.type = "button";
      button.className = active ? "chip active" : "chip";
      button.dataset.value = key;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(active));
      button.disabled = !!disabled;
      if (disabled) button.setAttribute("aria-disabled", "true");
      text.textContent = label;
      button.append(text);
      if (tag) {
        const hint = document.createElement("small");
        hint.className = "chip-tag";
        hint.textContent = tag;
        button.append(hint);
      }
      button.onclick = () => { if (!active && !disabled) onChange(key); };
      group.append(button);
    }
    row.append(title, group);
    return row;
  }
  root.TextbookPicker = { row, gradeNames };
  if (typeof module !== "undefined") module.exports = root.TextbookPicker;
})(typeof globalThis !== "undefined" ? globalThis : this);
