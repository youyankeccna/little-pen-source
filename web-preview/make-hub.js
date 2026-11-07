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
    gushi: "诗",
    calc: "3+4",
    "pen-control": "线",
  };
  // 不走字帖编辑器的独立页面
  const PAGES = {
    gushi: { name: "古诗", description: "选一首古诗，整首描红抄写（公版诗文）" },
    calc: { name: "计算练习", description: "按年级或专项出题，答案写进数字格，附答案页" },
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
  const templateChoices = {};
  function make(subject) {
    const box = document.getElementById("make-hub");
    const s = N.MAKE_SUBJECTS.find((x) => x.id === subject) || N.MAKE_SUBJECTS[0];
    box.replaceChildren();
    const head = el("header", "hub-heading");
    head.append(
      el("span", "eyebrow", "做字帖"),
      el("h1", "", "选一份练习，直接开始"),
      el("p", "", "内容已经备好，选模板就能练。需要时再展开自由制作。"),
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
      const page = PAGES[t],
        info = page || D.types[t];
      grid.append(card("#/" + t, sample[t] || "字", info.name.replace(/^.*· /, ""), info.description));
    }
    for (const [title, href, desc] of s.extra || []) grid.append(card(href, "→", title, desc));
    const foot = el("p", "hub-foot");
    foot.append(s.id === "math" ? "想按教材课次出题？去 " : "想按课本年级挑字？去 ");
    const link = el("a", "", "跟课本");
    link.href = "#/course" + (s.id === "pen" ? "" : "?subject=" + s.id);
    foot.append(link, "。");
    box.append(head, tabs);
    const A = window.WorkbookAccount, T = window.TemplateGallery, context = A?.studyContext?.() || { grade: s.id === 'en' ? 3 : 1, term: 'upper' };
    const edition = A?.defaultEdition?.(s.id) || 'pep';
    const scope = [A?.scope?.() || 'guest', s.id, context.grade, context.term, edition].join(':');
    if (!templateChoices[scope]) {
      try { templateChoices[scope] = JSON.parse(localStorage.getItem('little-pen-template-choice:' + scope) || 'null'); } catch {}
      templateChoices[scope] ||= { source: 'book', category: 'all' };
    }
    const choice = templateChoices[scope];
    const remember = () => { try { localStorage.setItem('little-pen-template-choice:' + scope, JSON.stringify(choice)); } catch {} make(s.id); };
    const contextBar = el('div', 'template-context');
    const gradeLabel = context.grade === 0 ? '幼儿园' : context.grade + '年级';
    contextBar.append(el('span', '', (A?.configured?.() ? '' : '默认浏览：') + gradeLabel + ' · ' + (context.term === 'lower' ? '下册' : '上册') + ' · ' + (A?.editionOptions?.[s.id]?.find(e => e[0] === edition)?.[1] || '启蒙专项')));
    const change = el('button', 'button outline', '学习设置'); change.type = 'button'; change.onclick = () => A.openVersions({ ...context, subject: s.id === 'pen' ? 'cn' : s.id }); contextBar.append(change); box.append(contextBar);
    let templates = T.templates.filter(t => t.subject === s.id);
    if (s.id === 'en' && context.grade < 3) {
      box.append(el('p', 'hub-sub', '英语练习从三年级开始，请在学习设置中选择三至六年级。')); return;
    }
    const lessons = (window.CurriculumData?.lessons || []).filter(l => l.materialLibrary && !l.pending && l.subject === s.id && l.grade === context.grade && l.term === context.term && (l.series || 'pep') === edition);
    const sourceLabel = el('label', 'template-source', '练习内容 '), sourceSelect = el('select');
    sourceSelect.setAttribute('aria-label', '练习内容');
    for (const [value, text] of [['book', '自动选用本册已收录内容'], ['builtin', '内置专项练习（无需输入）'], ...lessons.map(l => [l.id, l.title])]) {
      const o = el('option', '', text); o.value = value; sourceSelect.append(o);
    }
    if (!['book', 'builtin', ...lessons.map(l => l.id)].includes(choice.source)) choice.source = 'book';
    sourceSelect.value = choice.source; sourceSelect.onchange = () => { choice.source = sourceSelect.value; remember(); }; sourceLabel.append(sourceSelect);
    if (s.id !== 'pen' && s.id !== 'math') box.append(sourceLabel);
    if (s.id !== 'pen' && s.id !== 'math' && !lessons.length) box.append(el('p', 'hub-sub', '本册暂无可直接带入的素材，下面提供内置专项练习；它们不标作本册课文。'));
    const categories = { hanzi: '生字', cizu: '词语', duanluo: '句段', pinyin: '拼音', alphabet: '字母', word: '单词', paragraph: '词义与句子', 'pen-control': '控笔', calc: '计算' };
    const filters = el('div', 'chip-group template-filters'); filters.setAttribute('aria-label', '模板类别');
    for (const [value, title] of [['all', '全部模板'], ...[...new Set(templates.map(t => t.type))].map(type => [type, categories[type]])]) {
      const b = el('button', 'chip', title); b.type = 'button'; b.setAttribute('aria-pressed', String(choice.category === value)); b.onclick = () => { choice.category = value; remember(); }; filters.append(b);
    }
    box.append(filters);
    templates = templates.filter(t => choice.category === 'all' || choice.category === t.type);
    if (templates.length) {
      const section = el("section", "template-gallery");
      section.setAttribute("aria-label", "常用模板");
      const introduction = s.id === 'math'
        ? '口算和竖式都已经备好。竖式只排能对齐的加减乘除，选一张就能预览。'
        : choice.source === 'builtin' || !lessons.length || s.id === 'pen'
        ? '内置内容已经备好，选一种练法即可预览，不需要自己输入。'
        : '按所选内容匹配练法，每张卡片标明实际来源。';
      section.append(el("h2", "", "选一张，直接开始"), el("p", "hub-sub", introduction));
      const previews = el("div", "template-grid");
      for (const t of templates) {
        const link = el("a", "template-card"), canvas = el("canvas", "template-paper");
        const calcCard = t.type === "calc";
        const source = calcCard || choice.source === 'builtin' ? null : T.sources(t, { ...context, edition }, lessons).find(x => choice.source === 'book' || x.lesson.id === choice.source);
        const packSupported = ['hanzi','cizu','duanluo','word','paragraph'].includes(t.type);
        const unavailable = choice.source !== 'book' && choice.source !== 'builtin' && !source && packSupported;
        link.href = calcCard ? T.href(t) : source ? T.contentLink(t, source) : T.href(t);
        const sourceText = source ? source.lesson.title + ' · ' + (source.pack.label || CurriculumData.kindInfo[source.pack.kind].label) + (source.pack.items.some(i => /待校订|待复核/.test(i.translationSource || '')) ? ' · 含待校订译文' : '') : unavailable ? '所选内容不支持此练法，请换内容或选择内置专项' : '内置专项 · 可直接练习';
        if (unavailable) { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }

        canvas.setAttribute("aria-hidden", "true");
        link.append(canvas, el("strong", "", t.title), el("span", "", t.description), el("small", "template-origin", sourceText), el("span", "template-use", unavailable ? "暂无匹配内容" : "直接练习 →"));
        previews.append(link);
        // Font loading is shared by the browser; detached galleries are not repainted.
        if (calcCard) T.paint(canvas, t);
        else {
        let previewState = T.stateFor(t.id, t.type);
        if (source) {
          const q = new URLSearchParams(link.href.split('?')[1]);
          const selected = CurriculumData.getSelection(q.get('course'), q.get('kind'), q.get('items').split(','));
          previewState = T.courseConfig({ ...previewState, text: selected.text }, t.id, t.type);
        }
        T.paint(canvas, t, previewState);
        document.fonts.load(WorkbookEngine.fontString(previewState), previewState.text).then(() => {
          if (canvas.isConnected) T.paint(canvas, t, previewState);
        }).catch(() => {});
        }
      }
      section.append(previews);
      box.append(section);
    }
    const free = el('details', 'template-free'); free.append(el('summary', '', '自由制作（需要自己编辑内容时使用）'), el('p', 'hub-sub', s.desc), grid);
    box.append(free, foot);
  }
  // 古诗：语文下的一等类型。列出公版诗文，点一首直接进入段落字帖（整首描红）。
  function gushiList() {
    const C = window.CurriculumData;
    return (C?.lessons || [])
      .filter((l) => l.contentStatus === "public-domain-reviewed" || l.publicDomain)
      .map((l) => {
        const pack = (l.packs || []).find((p) => p.kind === "sentences");
        const item = pack?.items?.[0];
        return item && { id: l.id, title: l.title, author: l.author || "", text: item.text, itemId: item.id };
      })
      .filter(Boolean);
  }
  function gushiHref(p) {
    return "#/duanluo?" + new URLSearchParams({ course: p.id, kind: "sentences", items: p.itemId, from: "gushi" });
  }
  function gushi() {
    const box = document.getElementById("make-hub");
    box.replaceChildren();
    const head = el("header", "hub-heading");
    head.append(
      el("span", "eyebrow", "做字帖 · 语文"),
      el("h1", "", "古诗字帖"),
      el("p", "", "选一首诗，整首进入段落字帖；格子、描红照常可调。"),
    );
    const back = el("a", "hub-back", "← 返回语文");
    back.href = "#/make?subject=cn";
    const grid = el("div", "hub-grid gushi-grid");
    for (const p of gushiList()) {
      const c = card(gushiHref(p), "诗", p.title, (p.author ? p.author + " · " : "") + p.text.replace(/\s+/g, "").slice(0, 14) + "…");
      grid.append(c);
    }
    if (!grid.children.length) grid.append(el("p", "hub-sub", "诗文数据加载中，请稍后刷新。"));
    box.append(head, back, grid);
  }
  // 我的：先放最常用的两项，其余收进“更多”
  const ME_PRIMARY = ["daily", "library"];
  function meSections(tabs) {
    return {
      primary: ME_PRIMARY.map((id) => tabs.find((t) => t.id === id)).filter(Boolean),
      more: tabs.filter((t) => !ME_PRIMARY.includes(t.id)),
    };
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
          : "今日练习、薄弱字再练无需登录，记录保存在本浏览器；一周练习包可免登录预览和下载，保存计划需登录；其余项目登录后按孩子分别保存。",
      ),
    );
    box.append(head);
    const split = meSections(N.ME_TABS);
    const make = (list, offset) => {
      const grid = el("div", "hub-grid me-grid");
      list.forEach((t, i) => {
        const c = card("#/" + t.id, String(i + offset + 1), t.label, t.desc);
        if (t.login && !user) c.append(el("small", "hub-lock", "需登录"));
        else if (t.id === "weekly" && !user) c.append(el("small", "hub-lock", "保存需登录"));
        grid.append(c);
      });
      return grid;
    };
    const more = el("details", "me-more");
    more.append(el("summary", "", "更多（一周练习包、薄弱字、成长记录等）"), make(split.more, split.primary.length));
    box.append(make(split.primary, 0), more);
  }
  // Login/logout does not change #/me, so the hub must redraw itself.
  function onAccountChange() {
    const hash = String(typeof location === "undefined" ? "" : location.hash || "").split("?")[0];
    if (hash === '#/make') { make(new URLSearchParams(location.hash.split('?')[1] || '').get('subject')); return; }
    if (hash !== "#/me" || !document.getElementById("personal-view")) return;
    me();
  }
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("accountchange", onAccountChange);
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
  return { make, me, meTabs, meSections, onAccountChange, gushi, gushiList, gushiHref, PAGES };
})();
