"use strict";
// 站点配置：页脚二维码指向的地址。留空时使用当前网址的 origin（部署到正式域名后可在此改成固定地址）。
(function (root) {
  const config = { shareUrl: "", footerText: "小小笔尖 · 扫码再出一张" };
  root.LittlePenConfig = config;
  if (typeof module !== "undefined") module.exports = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
