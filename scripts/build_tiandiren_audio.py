"""Build local Mandarin narration for the original Tiandiren animation."""
import concurrent.futures
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSON = ROOT / 'web-preview/animations/tiandiren'


def build(job):
    key, text = job
    output = LESSON / 'audio' / f'{key}.mp3'
    if not output.exists():
        with tempfile.TemporaryDirectory(prefix='tiandiren-') as temporary:
            aiff = Path(temporary) / 'voice.aiff'
            subprocess.run(['say', '-v', 'Tingting', '-r', '150', '-o', str(aiff), text], check=True)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(aiff), '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-q:a', '3', str(output)], check=True)
    duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(output)], text=True))
    return key, {'text': text, 'duration': round(duration, 3), 'voice': 'macOS Tingting', 'synthetic': True}


def main():
    for command in ['node', 'say', 'ffmpeg', 'ffprobe']:
        if not shutil.which(command):
            raise SystemExit(f'Missing required command: {command}')
    source = "const fs=require('fs'),vm=require('vm');const s={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),s);process.stdout.write(JSON.stringify(s.window.TiandirenLesson));"
    lesson = json.loads(subprocess.check_output(['node', '-e', source, str(LESSON / 'lesson.js')], text=True))
    jobs = []
    for scene in lesson['scenes']:
        jobs.append((scene['id'], scene['text']))
        if 'quiz' in scene:
            jobs.extend([(scene['id'] + '-hint', scene['quiz']['hint']), (scene['id'] + '-success', scene['quiz']['success'])])
    (LESSON / 'audio').mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        manifest = dict(pool.map(build, jobs))
    (LESSON / 'audio/manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Built {len(manifest)} narration clips. Total voice: {sum(row["duration"] for row in manifest.values()):.1f}s', flush=True)


if __name__ == '__main__':
    main()
