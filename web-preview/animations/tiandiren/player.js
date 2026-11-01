(() => {
  'use strict';
  const lesson = window.TiandirenLesson;
  const $ = id => document.getElementById(id);
  const videoMode = new URLSearchParams(location.search).has('video');
  if (videoMode) document.body.classList.add('render-mode');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const positions = [57, 74, 91];
  const mobilePositions = [25, 55, 84];
  const state = { index: -1, playing: false, sound: true, elapsed: 0, lastTick: 0, answered: false, videoAnswered: false, completed: new Set(), attempts: {}, animations: [], waiting: false };
  let voice = null;
  let voiceGeneration = 0;
  let audioUnavailable = false;
  const durations = lesson.scenes.map(scene => scene.duration);
  const allQuizzes = lesson.scenes.filter(scene => scene.quiz);
  const videoEvents = [];

  function child(index, x, shirt, shorts, hair) {
    return `<g id="person-${index}" class="person" transform="translate(${x} 328)">
      <ellipse class="person-ring" cx="0" cy="193" rx="71" ry="16" fill="#dce6b3"/>
      <ellipse class="speaker-ring" cx="0" cy="191" rx="61" ry="15" fill="none" stroke="#739965" stroke-width="3" stroke-dasharray="5 6"/>
      <g class="child-body"><path d="M-27 142l-5 39m57-39 7 39" fill="none" stroke="#eab896" stroke-width="20" stroke-linecap="round"/>
      <path d="M-31 177l-17 6q-6 13 5 14h27l-1-17m49-3 16 6q6 13-5 14H17l1-17" fill="#fff9e8" stroke="#405b4a" stroke-width="2"/>
      <path d="M-38 111h76l-5 44H6l-6-23-6 23h-27z" fill="${shorts}"/>
      <path d="M-34 56q-15 8-23 26l-14 30m103-56q16 9 23 26l12 30" fill="none" stroke="#eab896" stroke-width="17" stroke-linecap="round"/>
      <path d="M-28 51q28-12 56 0l18 28-17 10 8 37q-37 11-74 0l7-37-18-10z" fill="${shirt}"/>
      <path d="M-13 48q13 15 26 0" fill="none" stroke="#fff5df" stroke-width="6"/>
      <path d="M-9 38v14q10 12 19 0V37" fill="#eab896"/>
      <ellipse cx="-34" cy="13" rx="8" ry="11" fill="#efc29e"/><ellipse cx="34" cy="13" rx="8" ry="11" fill="#efc29e"/>
      <path d="M-34-9q0-36 34-37 36 1 35 39v24q-3 31-34 33-31-2-35-33z" fill="#f2c5a4"/>
      <path d="M-35 4q-13-53 34-55 48 0 38 53l-9-17q-20 4-34-14-8 15-27 18z" fill="${hair}"/>
      <path d="M-22-4l10-2m24 0 10 2" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="-14" cy="10" rx="2.6" ry="3.4" fill="#3f4138"/><ellipse cx="14" cy="10" rx="2.6" ry="3.4" fill="#3f4138"/>
      <ellipse cx="-23" cy="22" rx="6" ry="3" fill="#e9a38d" opacity=".55"/><ellipse cx="23" cy="22" rx="6" ry="3" fill="#e9a38d" opacity=".55"/>
      <path d="M-6 26q6 6 12 0" stroke="#b46e55" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M-17 91h34v15q-17 8-34 0z" fill="#fff7df" opacity=".65"/>
      </g><text class="name-label" x="0" y="225">${lesson.children[index]}</text></g>`;
  }

  $('illustration').innerHTML = `<svg viewBox="0 0 1200 620" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e2efe6"/><stop offset="1" stop-color="#f0f3da"/></linearGradient><linearGradient id="hill" x2="0" y2="1"><stop stop-color="#cedcb3"/><stop offset="1" stop-color="#dfe7bc"/></linearGradient><pattern id="grain" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".6" fill="#355a40" opacity=".055"/><circle cx="10" cy="11" r=".45" fill="#355a40" opacity=".05"/></pattern></defs>
    <rect width="1200" height="620" fill="url(#sky)"/>
    <g class="world-landscape"><circle cx="1035" cy="132" r="49" fill="#efd995"/><circle cx="1035" cy="132" r="66" fill="#efd995" opacity=".14"/>
    <g fill="#fffdf1" opacity=".87"><path d="M690 146q-27-4-21-22 5-14 23-13 7-24 29-19 16 3 18 18 26-5 30 17 2 17-26 19z"/><path d="M911 215q-20-3-18-17 2-17 22-16 7-21 25-17 14 3 16 15 20-4 24 13 2 20-24 22z"/></g>
    <path d="M0 381Q184 292 361 372T716 349 1200 352V620H0Z" fill="#dbe5c4"/><path d="M0 447Q193 364 408 421T804 391 1200 416V620H0Z" fill="url(#hill)"/>
    <path d="M941 407q-39 40-14 84t-13 129h286V459q-180-67-259-52z" fill="#eef0cf"/>
    <g transform="translate(1140 343)"><path d="M-3 33v110" stroke="#9e8a64" stroke-width="15"/><path d="M-9 1q-55-32-71 18-48 1-36 43 4 40 63 33 41 27 72-7 48 1 51-40 1-38-38-39-12-33-41-8" fill="#a9c694"/><path d="M-1 73l-35-20m35 35 29-18" stroke="#91a875" stroke-width="3" fill="none"/></g></g>
    <g class="park-landscape"><rect width="1200" height="620" fill="#f0e9da"/><circle cx="918" cy="100" r="42" fill="#efd3a2"/>
    <g fill="#fff8ed" opacity=".9"><path d="M624 145q-25 2-24-16 0-17 24-17 9-23 29-18 14 3 17 17 26-1 26 16 0 18-26 18z"/><path d="M1023 204q-27 0-26-17 0-18 28-17 9-29 32-21 17 4 19 20 27-1 27 15 0 20-31 20z"/></g>
    <path d="M0 370q170-79 336-18t354-25 510 29v264H0z" fill="#d6ddbe"/><path d="M0 456q300-111 579-19t621-25v208H0z" fill="#c7d4a8"/>
    <path d="M754 370q-100 88-234 125T416 620h269q-65-69 41-117t60-133z" fill="#f3e2bd"/>
    <g stroke="#8a795d" stroke-width="12" fill="none"><path d="M1092 388v111m-22-48 25-28m1 39 27-31"/></g><g fill="#b6be8b"><ellipse cx="1094" cy="348" rx="68" ry="79"/><ellipse cx="1133" cy="389" rx="45" ry="45"/><ellipse cx="1048" cy="389" rx="40" ry="41"/></g></g>
    <rect class="sky-highlight" x="0" y="60" width="1200" height="250" fill="#fff8c4"/>
    <path class="earth-highlight" d="M0 435q300-70 600 0t600-9v194H0z" fill="#ffe69c"/>
    <g fill="#a0b87b" opacity=".7"><path d="M469 541q-12-14-10-28 15 11 10 28m0 0q3-21 17-28-1 19-17 28M89 507q-8-15-5-25 11 8 5 25m0 0q3-16 15-19-1 15-15 19M1071 573q-8-17-6-28 13 9 6 28m0 0q2-18 16-22-1 16-16 22"/></g>
    <g fill="#f9f4d9"><circle cx="497" cy="530" r="5"/><circle cx="501" cy="537" r="5"/><circle cx="493" cy="537" r="5"/><circle cx="1090" cy="557" r="5"/><circle cx="1094" cy="564" r="5"/><circle cx="1086" cy="564" r="5"/></g><g fill="#d4af6d"><circle cx="497" cy="535" r="2.4"/><circle cx="1090" cy="562" r="2.4"/></g>
    ${child(0, 684, '#d89964', '#708b83', '#514b41')}${child(1, 888, '#7e9f75', '#8d99aa', '#454c42')}${child(2, 1092, '#9aa8c1', '#b19a7f', '#605044')}
    <rect width="1200" height="620" fill="url(#grain)" pointer-events="none"/>
  </svg>`;

  function animate(element, values, options = {}) {
    if (!window.Motion || reducedMotion.matches || !element) return;
    const animation = window.Motion.animate(element, values, { duration: .5, ease: 'easeOut', ...options });
    state.animations.push(animation);
  }

  function stopVoice() {
    voiceGeneration++;
    if (voice) { voice.pause(); voice.onended = null; voice = null; }
  }

  function speak(key) {
    stopVoice();
    if (!state.sound || !state.playing || videoMode) return;
    const generation = voiceGeneration;
    const audio = new Audio(`audio/${key}.mp3`);
    voice = audio;
    audio.addEventListener('error', () => {
      if (generation !== voiceGeneration) return;
      audioUnavailable = true;
      $('instruction').textContent = '这段配音暂时无法播放，可以继续看字幕，或点右侧按钮重听。';
    }, { once: true });
    audio.addEventListener('loadedmetadata', () => {
      if (generation !== voiceGeneration || key !== lesson.scenes[state.index]?.id) return;
      durations[state.index] = Math.max(durations[state.index], audio.duration + 2);
    }, { once: true });
    audio.play().catch(() => {
      if (generation !== voiceGeneration) return;
      $('instruction').textContent = '点“重听这一段”开启配音，也可以先看字幕。';
    });
  }

  function updateControls() {
    $('play-icon').textContent = state.playing ? 'Ⅱ' : '▶';
    $('play-label').textContent = state.playing ? '暂停' : '播放';
    $('play').setAttribute('aria-label', state.playing ? '暂停' : '播放');
    $('pause-indicator').hidden = state.playing || state.index < 0 || lesson.scenes[state.index].end;
    $('stage').classList.toggle('frozen', !state.playing);
    $('sound').textContent = state.sound ? '声音开' : '声音关';
    $('sound').setAttribute('aria-pressed', String(state.sound));
    $('previous').disabled = state.index <= 0;
    $('next').disabled = state.index < 0 || state.index === lesson.scenes.length - 1;
  }

  function pause() {
    if (state.index < 0) return;
    state.playing = false;
    if (voice) voice.pause();
    for (const animation of state.animations) animation.pause();
    for (const animation of $('stage').getAnimations({ subtree: true })) animation.pause();
    updateControls();
  }

  function resume() {
    if (state.index < 0) return start();
    if (lesson.scenes[state.index].end) return start();
    state.playing = true;
    state.lastTick = performance.now();
    for (const animation of state.animations) animation.play();
    for (const animation of $('stage').getAnimations({ subtree: true })) animation.play();
    if (voice && state.sound) voice.play().catch(() => {});
    updateControls();
  }

  function showRoles(scene) {
    const mobile = matchMedia('(max-width: 470px)').matches && !videoMode;
    const places = mobile ? mobilePositions : positions;
    $('illustration').querySelector('svg').setAttribute('viewBox', mobile && scene.view === 'roles' ? '510 0 690 620' : '0 0 1200 620');
    $('stage').dataset.roles = scene.roles ? 'visible' : '';
    $('conversation').hidden = scene.speaker === undefined;
    if (scene.speaker === undefined) return;
    $('speech-bubble').textContent = scene.bubble;
    $('speech-bubble').style.left = `${places[scene.speaker] - (mobile ? 17 : 10.5)}%`;
    $('role-labels').innerHTML = scene.roles ? places.map((position, i) => {
      const type = i === scene.speaker ? 'speaker' : i === scene.listener ? 'listener' : 'third';
      const word = i === scene.speaker ? '我' : i === scene.listener ? '你' : '他';
      const description = i === scene.speaker ? '正在说话' : i === scene.listener ? '正在听话' : '被介绍的人';
      return `<div class="role-label ${type}" style="left:${position}%"><span class="role-word">${word}</span><span class="role-description">${lesson.children[i]} · ${description}</span></div>`;
    }).join('') : '';
    $(`person-${scene.speaker}`).classList.add('speaking');
  }

  function renderScene(index, play = true) {
    stopVoice();
    for (const animation of state.animations) animation.cancel();
    state.animations = [];
    const scene = lesson.scenes[index];
    state.index = index;
    state.playing = play;
    state.elapsed = 0;
    state.lastTick = performance.now();
    state.answered = false;
    state.videoAnswered = false;
    state.waiting = false;
    if (videoMode && play) videoEvents.push({ id: scene.id, at: (performance.now() - window.lessonVideoStart) / 1000 });
    $('stage').dataset.view = scene.view;
    $('stage').dataset.focus = scene.focus || '';
    $('scene-kicker').textContent = scene.kicker;
    $('scene-title').textContent = scene.title;
    $('scene-title').classList.remove('cover-title');
    $('scene-copy').hidden = Boolean(scene.end);
    $('cover-description').hidden = true;
    $('cover-note').hidden = true;
    $('start').hidden = true;
    $('finish-panel').hidden = !scene.end;
    $('caption').textContent = scene.text;
    $('instruction').textContent = scene.quiz ? '轮到你啦 · 选好后再继续' : scene.end ? '今天的发现，也可以讲给家人听' : '看一看 · 听一听 · 跟着说';
    $('scene-count').textContent = `${index + 1} / ${lesson.scenes.length} 段${videoMode ? ' · 合成配音' : ''}`;
    const chapterIndex = lesson.chapters.findLastIndex(chapter => chapter.start <= index);
    $('chapter-label').textContent = lesson.chapters[chapterIndex].title;
    for (const button of $('chapter-nav').children) {
      if (Number(button.dataset.chapter) === chapterIndex) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    const words = scene.words || (scene.word ? [scene.word] : []);
    $('word-display').hidden = !words.length;
    $('word-display').innerHTML = words.map(word => `<span class="word-tile ${words.length > 1 ? 'small' : ''}">${word}</span>`).join('');
    for (let i = 0; i < 3; i++) $(`person-${i}`).classList.remove('speaking');
    showRoles(scene);
    $('interaction').hidden = !scene.quiz;
    $('continue').hidden = true;
    $('feedback').textContent = videoMode ? '先想一想，稍后会显示答案。' : '想一想，准备好再选。这里没有倒计时。';
    $('answer-options').innerHTML = scene.quiz ? scene.quiz.options.map(option => {
      const person = lesson.children.indexOf(option);
      const portrait = person >= 0 ? `<svg class="answer-portrait" viewBox="${positions[person] * 12 - 55} 265 110 130" aria-hidden="true"><use href="#person-${person}"></use></svg>` : '';
      return `<button class="answer-button ${person >= 0 ? 'name-answer' : ''}" data-answer="${option}">${portrait}<span>${option}</span></button>`;
    }).join('') : '';
    $('play').disabled = false;
    $('replay').disabled = false;
    $('finish-result').textContent = `本次完成 ${state.completed.size} / ${allQuizzes.length} 个小练习。`;
    if (scene.end) {
      if (videoMode) $('finish-result').textContent = '天、地、人、你、我、他，今天都见过面啦。';
      else $('finish-result').textContent += state.completed.size === allQuizzes.length ? '明天换个顺序，再认一认。' : '还可以回到前面，试试没有完成的练习。';
    }
    animate($('scene-copy'), { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] }, { duration: .65 });
    for (const tile of $('word-display').children) animate(tile, { opacity: [0, 1], transform: ['translateY(15px) scale(.94)', 'translateY(0px) scale(1)'] }, { duration: .7 });
    if (scene.speaker !== undefined) {
      animate($('speech-bubble'), { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] });
      animate($(`person-${scene.speaker}`).querySelector('.child-body'), { transform: ['translateY(0px)', 'translateY(-5px)', 'translateY(0px)'] }, { duration: 1.3, repeat: 1, ease: 'easeInOut' });
    }
    if (!play) for (const animation of state.animations) animation.pause();
    updateControls();
    if (play) speak(scene.id);
    updateProgress();
  }

  function start() {
    state.completed.clear();
    state.attempts = {};
    videoEvents.length = 0;
    window.lessonVideoStart = performance.now();
    renderScene(0);
  }

  function answer(value, automated = false) {
    const scene = lesson.scenes[state.index];
    if (!scene.quiz || state.answered || (!state.playing && !automated)) return;
    const correct = value === scene.quiz.answer;
    if (!automated) state.attempts[scene.id] = (state.attempts[scene.id] || 0) + 1;
    const button = [...$('answer-options').children].find(element => element.dataset.answer === value);
    if (!correct) {
      $('feedback').textContent = scene.quiz.hint;
      for (const option of $('answer-options').children) option.classList.remove('wrong');
      button.classList.add('wrong');
      speak(`${scene.id}-hint`);
      animate(button, { x: [0, -4, 4, 0] }, { duration: .32 });
      return;
    }
    state.answered = true;
    if (!automated) state.completed.add(scene.id);
    button.classList.remove('wrong');
    button.classList.add('correct');
    for (const option of $('answer-options').children) option.disabled = true;
    $('feedback').textContent = scene.quiz.success;
    if (automated) {
      $('caption').textContent = scene.quiz.success;
      $('instruction').textContent = '看看答案 · 想想为什么';
    }
    $('continue').hidden = automated;
    speak(`${scene.id}-success`);
    if (automated) videoEvents.push({ id: `${scene.id}-success`, at: (performance.now() - window.lessonVideoStart) / 1000 });
  }

  function updateProgress() {
    if (state.index < 0) return;
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    const before = durations.slice(0, state.index).reduce((sum, duration) => sum + duration, 0);
    const progress = lesson.scenes[state.index].end ? 100 : (before + Math.min(state.elapsed, durations[state.index])) / total * 100;
    $('progress-fill').style.width = `${progress}%`;
    document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(Math.round(progress)));
    $('progress-text').textContent = lesson.scenes[state.index].end ? '旅行完成' : `${state.index + 1} / ${lesson.scenes.length} 段`;
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!state.playing || state.index < 0) { state.lastTick = now; return; }
    state.elapsed += Math.min((now - state.lastTick) / 1000, .25);
    state.lastTick = now;
    updateProgress();
    const scene = lesson.scenes[state.index];
    if (scene.end) {
      if (state.elapsed >= durations[state.index]) {
        pause();
        if (videoMode) window.lessonVideoDone = true;
      }
      return;
    }
    if (scene.quiz) {
      if (videoMode && state.elapsed >= durations[state.index] + 5 && !state.videoAnswered) {
        state.videoAnswered = true;
        answer(scene.quiz.answer, true);
      }
      if (videoMode && state.elapsed >= durations[state.index] + 12) renderScene(state.index + 1);
      if (!videoMode && state.elapsed >= durations[state.index]) state.waiting = true;
      return;
    }
    if (state.elapsed >= durations[state.index] && (!voice || voice.ended || !state.sound || audioUnavailable || videoMode)) renderScene(state.index + 1);
  }

  $('chapter-nav').innerHTML = lesson.chapters.map((chapter, i) => `<button class="chapter-button" data-chapter="${i}"><span class="chapter-index">0${i + 1}</span>${chapter.title}</button>`).join('');
  $('chapter-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-chapter]');
    if (button) renderScene(lesson.chapters[Number(button.dataset.chapter)].start);
  });
  $('start').addEventListener('click', start);
  $('restart').addEventListener('click', start);
  $('play').addEventListener('click', () => state.playing ? pause() : resume());
  $('previous').addEventListener('click', () => renderScene(Math.max(0, state.index - 1)));
  $('next').addEventListener('click', () => renderScene(Math.min(lesson.scenes.length - 1, state.index + 1)));
  $('continue').addEventListener('click', () => renderScene(state.index + 1));
  $('answer-options').addEventListener('click', event => {
    const button = event.target.closest('[data-answer]');
    if (button) {
      if (!state.playing) resume();
      answer(button.dataset.answer);
    }
  });
  $('replay').addEventListener('click', () => {
    if (!state.playing) resume();
    state.elapsed = 0;
    state.lastTick = performance.now();
    speak(lesson.scenes[state.index].id);
  });
  $('sound').addEventListener('click', () => {
    state.sound = !state.sound;
    if (!state.sound) stopVoice();
    else if (state.index >= 0 && state.playing) {
      speak(lesson.scenes[state.index].id);
    }
    updateControls();
  });
  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector('.player').requestFullscreen();
    } catch { $('instruction').textContent = '当前浏览器暂不支持全屏，可以继续播放。'; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !videoMode) pause(); });
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || /BUTTON|INPUT|TEXTAREA|SUMMARY|A/.test(document.activeElement.tagName)) return;
    event.preventDefault();
    if (state.index < 0) start();
    else if (state.playing) pause();
    else resume();
  });
  window.addEventListener('resize', () => { if (state.index >= 0) showRoles(lesson.scenes[state.index]); });
  window.addEventListener('pagehide', stopVoice);
  requestAnimationFrame(tick);
  fetch('audio/manifest.json').then(response => response.ok ? response.json() : null).then(manifest => {
    if (!manifest) return;
    lesson.scenes.forEach((scene, index) => { durations[index] = Math.max(scene.duration, (manifest[scene.id]?.duration || 0) + 2); });
  }).catch(() => {});
  fetch('tiandiren.mp4', { method: 'HEAD' }).then(response => { if (response.ok) $('video-download').hidden = false; }).catch(() => {});
  window.TiandirenPlayer = {
    start,
    goTo: index => { if (Number.isInteger(index) && index >= 0 && index < lesson.scenes.length) renderScene(index); },
    getState: () => ({ index: state.index, playing: state.playing, elapsed: state.elapsed, completed: [...state.completed], attempts: { ...state.attempts }, answered: state.answered, waiting: state.waiting }),
    getVideoEvents: () => [...videoEvents],
    getDurations: () => [...durations],
    renderFrame: (index, seconds, reveal = false) => {
      if (state.index !== index) renderScene(index, false);
      for (const animation of state.animations) animation.time = seconds;
      for (const animation of $('stage').getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = seconds * 1000;
      }
      $('pause-indicator').hidden = true;
      if (reveal && !state.answered) answer(lesson.scenes[index].quiz.answer, true);
    }
  };
})();
