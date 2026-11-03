"use strict";
// v9：每张练习纸自己的“再出一张”链接。页脚二维码、分享按钮都用它。
// 纯函数，可在 Node 中测试。
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SheetLink = api;
})(typeof self !== "undefined" ? self : this, function () {
  // v9b：二维码约 12mm、纠错 L；内容按 UTF-8 原文编码（汉字 3 字节而非 %XX 的 9 字节）。
  // 实测（jsQR，600dpi/300dpi 光栅化）超过约 360 字节模块过密，解码不稳，改用首页地址。
  const QR_MAX_BYTES = 360;
  const SHARE_MAX_BYTES = 1800;
  const CELL = { hanzi: 1, cizu: 1, duanluo: 1, pinyin: 1, word: 1, paragraph: 1, alphabet: 1 };
  // 只编码能完整还原这张纸的少量字段
  function hashFor(type, state = {}, course = null) {
    if (course && course.lessonId && course.kind && course.itemIds?.length) {
      const q = new URLSearchParams({ course: course.lessonId, kind: course.kind, items: course.itemIds.join(",") });
      return "#/" + type + "?" + q;
    }
    if (type === "calc") {
      const q = new URLSearchParams();
      for (const k of ["grade", "topic", "n", "pages", "box", "key"]) if (state[k] !== undefined && state[k] !== "") q.set(k, String(state[k]));
      return "#/calc" + (String(q) ? "?" + q : "");
    }
    const q = new URLSearchParams();
    if (state.text) q.set("text", String(state.text));
    if (CELL[type] && state.cellType) q.set("cell", state.cellType);
    if (state.size) q.set("size", String(state.size));
    if (["hanzi", "cizu"].includes(type) && state.showPinyin) q.set("pinyin", "1");
    if (Number.isFinite(state.traceNum)) q.set("trace", String(state.traceNum));
    if (state.practiceMode && state.practiceMode !== "trace") q.set("mode", state.practiceMode);
    return "#/" + type + (String(q) ? "?" + q : "");
  }
  function base(loc, configured) {
    if (configured) return String(configured).replace(/#.*$/, "").replace(/\/$/, "") + "/";
    if (!loc) return "";
    return loc.origin + (loc.pathname || "/");
  }
  function bytes(s) {
    return typeof Buffer !== "undefined" ? Buffer.byteLength(s) : new TextEncoder().encode(s).length;
  }
  function absolute(hash, loc, configured) {
    return base(loc, configured) + hash;
  }
  // 二维码内容：本张纸的链接；太长则退回首页
  // 把 %E5%BA%8A 这类非 ASCII 转义还原成原字（IRI），扫码后浏览器会自动重新转义
  function compact(url) {
    return url.replace(/(?:%[89a-f][0-9a-f])+/gi, (m) => {
      try {
        return decodeURIComponent(m);
      } catch {
        return m;
      }
    });
  }
  function qrUrl(hash, loc, configured) {
    const full = compact(absolute(hash, loc, configured));
    return bytes(full) <= QR_MAX_BYTES ? full : base(loc, configured);
  }
  function shareUrl(hash, loc, configured) {
    const full = absolute(hash, loc, configured);
    return bytes(full) <= SHARE_MAX_BYTES ? full : null;
  }
  // 从链接还原编辑器状态（所有类型通用）
  function applyParams(defaults, params, type) {
    if (!params.has("text")) return null;
    const text = String(params.get("text") || "").slice(0, 2000);
    if (!text.trim()) return null;
    const s = { ...defaults, text };
    if (params.get("cell")) s.cellType = params.get("cell");
    const size = Number(params.get("size"));
    if (size >= 4 && size <= 40) s.size = size;
    const trace = Number(params.get("trace"));
    if (params.has("trace") && trace >= 0 && trace <= 40) s.traceNum = trace;
    if (["trace", "copy", "quiz", "fade"].includes(params.get("mode"))) s.practiceMode = params.get("mode");
    if (["hanzi", "cizu"].includes(type)) s.showPinyin = params.get("pinyin") === "1";
    return s;
  }
  return { QR_MAX_BYTES, hashFor, compact, absolute, qrUrl, shareUrl, applyParams, bytes };
});
