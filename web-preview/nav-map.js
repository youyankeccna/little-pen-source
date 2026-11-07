"use strict";
// v5 信息架构：四个顶层区域 + 统一的“我的”子导航 + 做字帖科目分组。纯数据，可在 Node 中测试。
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NavMap = api;
})(typeof self !== "undefined" ? self : this, function () {
  const AREAS = [
    { id: "home", label: "首页", href: "#/", icon: "home" },
    { id: "make", label: "做字帖", href: "#/make", icon: "pencil-mark" },
    { id: "textbook", label: "跟课本", href: "#/course", icon: "book" },
    { id: "me", label: "我的", href: "#/me", icon: "folder" },
  ];
  // 做字帖：v9 每个科目是独立模块（各自入口、流程与设置）。
  // 语文/英语/控笔使用字帖编辑器（设置按类型独立保存）；数学只练计算，走独立的计算练习页 #/calc。
  // module: "editor" | "calc"
  const MAKE_SUBJECTS = [
    {
      id: "cn",
      label: "语文",
      module: "editor",
      desc: "汉字、词语、古诗、段落、笔画、拼音",
      types: ["hanzi", "cizu", "gushi", "duanluo", "bihua", "pinyin"],
    },
    {
      id: "en",
      label: "英语",
      module: "editor",
      desc: "字母、单词、整段英文",
      types: ["alphabet", "word", "paragraph"],
    },
    {
      id: "math",
      label: "数学",
      module: "calc",
      desc: "只练计算：按年级或专项出题，答案写进数字格里，写数字就在计算中练",
      types: ["calc"],
    },
    {
      id: "pen",
      label: "控笔启蒙",
      module: "editor",
      desc: "线条控笔与幼儿四步启蒙",
      types: ["pen-control"],
      extra: [["幼儿启蒙四步", "#/early", "直线、曲线、转折、小图形"]],
    },
  ];
  // 我的：所有需要“记住”的东西（安排、记录、收藏、档案）
  const ME_TABS = [
    { id: "daily", label: "今日练习", desc: "新内容 + 到期复习，一键准备今天这页" },
    { id: "weekly", label: "一周练习包", desc: "免登录预览、下载；保存计划需登录" },
    { id: "review", label: "薄弱字再练", desc: "家长标记的字，按复习时间再练" },
    { id: "library", label: "我的字帖", desc: "保存与收藏的字帖，原样重开", login: true },
    { id: "growth", label: "成长记录", desc: "家长确认完成的练习打卡", login: true },
    { id: "works", label: "作品墙", desc: "孩子作品与练字星星", login: true },
    { id: "share", label: "我的分享", desc: "分享链接，随时停用", login: true },
    { id: "family", label: "孩子档案", desc: "每个孩子的教材与进度", login: true },
  ];
  // 跟课本：一个落地页 #/course，素材库是它的一个标签
  const TEXTBOOK = ["materials", "course", "shared"];
  const TEXTBOOK_TABS = [
    { id: "course", label: "按课次", href: "#/course" },
    { id: "materials", label: "素材库", href: "#/materials" },
  ];
  // 旧链接：数字书写已移除，统一跳到计算练习页
  const REDIRECTS = { number: "calc" };
  const ALIASES = { free: "make" };
  // 非编辑器的做字帖页面（自带页面，不是 WorkbookData 类型）
  const MAKE_PAGES = { calc: "math", gushi: "cn" };
  const TYPE_SUBJECT = {};
  for (const s of MAKE_SUBJECTS) for (const t of s.types) TYPE_SUBJECT[t] = s.id;
  function areaOf(key) {
    key = ALIASES[key] || key || "";
    if (!key) return "home";
    key = REDIRECTS[key] || key;
    if (key === "make" || TYPE_SUBJECT[key] || key === "early") return "make";
    if (TEXTBOOK.includes(key)) return "textbook";
    if (key === "me" || ME_TABS.some((t) => t.id === key)) return "me";
    return "home";
  }
  function subjectOfType(type) {
    return TYPE_SUBJECT[type] || null;
  }
  function resolve(key) {
    return ALIASES[key] || key;
  }
  function redirectOf(key) {
    return REDIRECTS[key] || null;
  }
  return {
    AREAS,
    MAKE_SUBJECTS,
    MAKE_PAGES,
    ME_TABS,
    TEXTBOOK_TABS,
    REDIRECTS,
    areaOf,
    subjectOfType,
    resolve,
    redirectOf,
  };
});
