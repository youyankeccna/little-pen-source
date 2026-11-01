/* Render the lesson's actual browser animation and mix its local narration. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const lessonRoot = path.join(root, 'web-preview/animations/tiandiren');
const output = path.join(root, 'output/animation');
const frameRoot = path.join(output, 'frames');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(lessonRoot, 'lesson.js'), 'utf8'), context);
const lesson = context.window.TiandirenLesson;
const manifest = JSON.parse(fs.readFileSync(path.join(lessonRoot, 'audio/manifest.json')));
const baseUrl = process.env.LESSON_BASE_URL || 'http://127.0.0.1:5178';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: root });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.status}`);
}

(async () => {
  fs.mkdirSync(frameRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 720 }, deviceScaleFactor: 1 });
  const concat = [];
  const cues = [];
  let time = 0;
  let frameNumber = 0;

  async function frame(index, sceneTime, duration, reveal = false) {
    await page.evaluate(({ index, sceneTime, reveal }) => window.TiandirenPlayer.renderFrame(index, sceneTime, reveal), { index, sceneTime, reveal });
    const filename = path.join(frameRoot, String(frameNumber++).padStart(5, '0') + '.jpg');
    await page.screenshot({ path: filename, type: 'jpeg', quality: 94, timeout: 20000 });
    concat.push(`file '${filename.replaceAll("'", "'\\''")}'\nduration ${duration.toFixed(6)}`);
    return filename;
  }

  try {
    await page.goto(`${baseUrl}/animations/tiandiren/?video=1`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (let index = 0; index < lesson.scenes.length; index++) {
      const scene = lesson.scenes[index];
      const duration = Math.max(scene.duration, manifest[scene.id].duration + 2);
      cues.push({ id: scene.id, at: time });
      const fps = 12;
      const entrance = 2.75;
      for (let n = 0; n < entrance * fps; n++) await frame(index, n / fps, 1 / fps);
      if (scene.quiz) {
        const answerAt = duration + 5;
        await frame(index, entrance + .1, answerAt - entrance);
        cues.push({ id: scene.id + '-success', at: time + answerAt });
        const feedbackDuration = manifest[scene.id + '-success'].duration + 1.5;
        await frame(index, answerAt, feedbackDuration, true);
        time += answerAt + feedbackDuration;
      } else {
        await frame(index, entrance + .1, duration - entrance);
        time += duration;
      }
      console.log(`Rendered ${index + 1}/${lesson.scenes.length}: ${scene.id} (${time.toFixed(1)}s)`);
    }
    const last = path.join(frameRoot, String(frameNumber - 1).padStart(5, '0') + '.jpg');
    concat.push(`file '${last.replaceAll("'", "'\\''")}'`);
    fs.writeFileSync(path.join(output, 'frames.txt'), concat.join('\n') + '\n');
    fs.writeFileSync(path.join(output, 'timeline.json'), JSON.stringify({ duration: time, cues }, null, 2));
  } finally {
    await browser.close();
  }

  const audioInputs = cues.flatMap(cue => ['-i', path.join(lessonRoot, 'audio', cue.id + '.mp3')]);
  const filters = cues.map((cue, i) => `[${i}:a]adelay=${Math.round(cue.at * 1000)}:all=1[a${i}]`);
  filters.push(cues.map((cue, i) => `[a${i}]`).join('') + `amix=inputs=${cues.length}:normalize=0,apad,atrim=duration=${time}[mix]`);
  fs.writeFileSync(path.join(output, 'audio-filter.txt'), filters.join(';\n'));
  run('ffmpeg', ['-y', '-loglevel', 'error', ...audioInputs, '-filter_complex_script', path.join(output, 'audio-filter.txt'), '-map', '[mix]', '-c:a', 'aac', '-b:a', '160k', path.join(output, 'narration.m4a')]);
  const videoPath = path.join(lessonRoot, 'tiandiren.mp4');
  run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(output, 'frames.txt'), '-i', path.join(output, 'narration.m4a'), '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-c:a', 'copy', '-t', String(time), '-movflags', '+faststart', videoPath]);
  const srtTime = seconds => {
    const ms = Math.round(seconds * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
  };
  const srt = cues.map((cue, i) => `${i + 1}\n${srtTime(cue.at)} --> ${srtTime(cue.at + manifest[cue.id].duration)}\n${manifest[cue.id].text}\n`).join('\n');
  fs.writeFileSync(path.join(lessonRoot, 'tiandiren.srt'), srt);
  fs.writeFileSync(path.join(lessonRoot, 'video-info.json'), JSON.stringify({ duration: time, width: 1200, height: 720, fps: 24, syntheticVoice: 'macOS Tingting' }, null, 2) + '\n');
  console.log(`Saved ${videoPath} (${time.toFixed(1)}s)`);
})().catch(error => { console.error(error); process.exitCode = 1; });
