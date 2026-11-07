(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'little-pen-design-preview-v1';
  const defaults = { grade: 3, term: 'upper', cn: 'pep', en: 'pep', math: 'pep', subject: 'cn', template: 'pinyin-trace', configured: false };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const profile = {
    ...defaults,
    grade: Number.isInteger(saved.grade) && saved.grade >= 0 && saved.grade <= 6 ? saved.grade : 3,
    term: ['upper', 'lower'].includes(saved.term) ? saved.term : 'upper',
    cn: 'pep',
    en: ['pep', 'fltrp', 'yilin'].includes(saved.en) ? saved.en : 'pep',
    math: ['pep', 'bnu', 'sujiao'].includes(saved.math) ? saved.math : 'pep',
    subject: ['cn', 'en', 'math', 'pen'].includes(saved.subject) ? saved.subject : 'cn',
    template: typeof saved.template === 'string' ? saved.template : defaults.template,
    configured: saved.configured === true
  };
  const lists = {
    cn: ['pinyin-trace', 'independent-copy', 'word-trace'],
    en: ['letter-trace', 'english-words'],
    pen: ['control-lines'],
    math: ['calculation']
  };
  const calculation = { id: 'calculation', title: '计算专项', description: '竖式临摹与数字格答题', type: 'paragraph' };
  const templates = () => lists[profile.subject].map(id => id === 'calculation' ? calculation : TemplateGallery.templates.find(t => t.id === id));
  const allowed = subject => !(subject === 'en' && profile.grade < 3) && !(subject === 'math' && profile.grade === 0);
  if (!allowed(profile.subject)) profile.subject = 'cn';
  if (!lists[profile.subject].includes(profile.template)) profile.template = lists[profile.subject][0];
  let noticeTimer, paintVersion = 0;
  function notify(message) {
    $('preview-status').textContent = message;
    $('preview-status').hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => $('preview-status').hidden = true, 4000);
  }
  function remember() {
    try { localStorage.setItem(KEY, JSON.stringify(profile)); }
    catch { notify('当前浏览器无法保存，下次打开时需要重新选择。'); }
  }
  function courseUrl(materials = false) {
    const subject = profile.subject === 'pen' ? 'cn' : profile.subject;
    return './#/' + (materials ? 'materials' : 'course') + '?' + new URLSearchParams({ subject, grade: profile.grade, term: profile.term, edition: profile[subject] });
  }
  async function draw(template) {
    const version = ++paintVersion;
    const state = template.id === 'calculation'
      ? { ...WorkbookData.defaults('paragraph'), text: '24 × 12 =\n56 + 27 =\n72 ÷ 6 =', mathLayout: 'trace', size: 10, font: 'sans', scale: 75, offset: 0 }
      : TemplateGallery.stateFor(template.id, template.type);
    await document.fonts.load(WorkbookEngine.fontString(state), state.text);
    if (version !== paintVersion) return;
    const context = document.createElement('canvas').getContext('2d');
    context.font = WorkbookEngine.fontString(state);
    const model = WorkbookEngine.build(template.type, state, text => context.measureText(text).width);
    WorkbookEngine.drawPage($('sheet-preview'), model, 0, 1, {});
    $('paper-meta').textContent = 'A4 纵向 · ' + model.pages + ' 页示例';
  }
  function render() {
    const selected = templates().find(t => t.id === profile.template) || templates()[0];
    const grade = profile.grade === 0 ? '幼儿园' : ['','一年级','二年级','三年级','四年级','五年级','六年级'][profile.grade];
    $('study-label').textContent = (profile.configured ? '' : '示例：') + grade + ' · ' + (profile.term === 'upper' ? '上册' : '下册');
    $('desk-title').textContent = saved.template ? '继续上次的排版' : '先选一份练习';
    const opts = $('practice-options'); opts.replaceChildren();
    for (const t of templates()) {
      const b = document.createElement('button'); b.type = 'button';
      b.setAttribute('aria-pressed', String(t.id === selected.id));
      const text = document.createElement('span'), title = document.createElement('strong'), desc = document.createElement('small'), dot = document.createElement('span');
      title.textContent = t.title; desc.textContent = t.description; dot.className = 'choice-dot'; dot.setAttribute('aria-hidden', 'true');
      text.append(title, desc); b.append(text, dot);
      b.onclick = () => { profile.template = t.id; remember(); render(); };
      opts.append(b);
    }
    for (const b of document.querySelectorAll('[data-subject]')) {
      b.disabled = !allowed(b.dataset.subject);
      b.setAttribute('aria-pressed', String(b.dataset.subject === profile.subject));
    }
    $('subject-note').textContent = profile.grade < 3 ? '英语从三年级开始' + (profile.grade === 0 ? '，计算从一年级开始。' : '，升入三年级后可在学习设置中修改。') : '';
    $('subject-note').hidden = profile.grade >= 3;
    $('chosen-caption').textContent = selected.title + ' · ' + (profile.subject === 'math' ? '按年级进入实际题库' : '进入后可替换示例内容');
    $('start-practice').href = selected.id === 'calculation' ? './#/calc?' + new URLSearchParams({ grade: profile.grade }) : './' + TemplateGallery.href(selected);
    $('paper-caption').textContent = profile.subject === 'math' ? '题型示意。进入计算专项后按年级选择实际题目。' : '示例内容，进入后可换字、换词和调整排版。';
    $('start-practice').firstChild.textContent = profile.subject === 'math' ? '打开本年级计算题库' : '用这份排版开始';
    $('course-link').textContent = profile.subject === 'math' ? '按课本选择计算练习' : '想练本课的字？跟着课本选内容';
    $('course-link').href = courseUrl(); $('nav-course').href = courseUrl();
    // This shortcut always opens Chinese materials, regardless of the selected exercise.
    $('book-bank').href = './#/materials?' + new URLSearchParams({ subject: 'cn', grade: profile.grade, term: profile.term, edition: profile.cn });
    draw(selected).catch(() => notify('纸面预览暂时无法加载，可以直接进入编辑器。'));
  }
  for (const b of document.querySelectorAll('[data-subject]')) b.onclick = () => {
    profile.subject = b.dataset.subject; profile.template = lists[profile.subject][0]; remember(); render();
  };
  function openSettings() {
    const form = $('study-form');
    for (const key of ['grade', 'term', 'cn', 'en', 'math']) form.elements.namedItem(key).value = String(profile[key]);
    $('study-dialog').showModal();
  }
  $('settings-open').onclick = openSettings; $('context-open').onclick = openSettings;
  $('settings-close').onclick = () => $('study-dialog').close();
  $('study-form').onsubmit = e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    for (const key of ['term', 'cn', 'en', 'math']) profile[key] = data.get(key);
    profile.grade = Number(data.get('grade')); profile.configured = true;
    if (!allowed(profile.subject)) { profile.subject = 'cn'; profile.template = lists.cn[0]; }
    remember(); $('study-dialog').close(); render(); notify('已在本机记住学习设置，下次直接练。');
  };
  render();
})();
