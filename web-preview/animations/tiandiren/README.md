# 《天地人》教学动画样片

对应本地提供的统编语文一年级上册第一单元第 1 课，教材第 8 页。
画面、角色、对话与练习为原创教学补充，认识“天、地、人、你、我、他”。
当前交付仅包含《天地人》，不代表第一单元全部制作完成。

## 播放

- 互动版：启动现有服务后打开 `/animations/tiandiren/`，在六道练习处等待作答。
- 视频版：`tiandiren.mp4`，1200 × 720，24 fps，约 4 分 51 秒，H.264 / AAC。
- 外挂字幕：`tiandiren.srt`；视频画面中也包含当前讲解字幕。

互动版支持暂停、重听、前后段跳转、章节选择、静音、桌面全屏及手机布局。
答错有语音和文字提示；答对后由孩子选择继续。完成数量不是掌握程度评价。
重新开始会清空本次练习计数；不保存账号数据，不采集录音、摄像头或跟读评分。
浏览器切到后台时暂停，返回后手动继续。

角色约定：小林穿橙色，阿禾穿绿色，乐乐穿蓝色。
“我”随说话者切换，“你”对应当前听话者，“他”对应对话中介绍的男孩。

## 资源与重建

- `lesson.js`：21 段分镜、旁白与 6 道练习。
- `player.js`、`style.css`、`index.html`：播放器、原创 SVG 场景与响应布局。
- `audio/`：33 段 macOS Tingting 中文电脑合成配音及文本、时长清单。
- `vendor/`：Motion 14.3.0 与 MIT 许可证。
- 中文字体复用项目已有 LXGW WenKai，许可证位于 `../../vendor/licenses/wenkai-OFL.txt`。

在项目根目录执行 `python3 scripts/build_tiandiren_audio.py` 重建配音，需要 macOS 的 `say`、Node.js、FFmpeg 与 FFprobe。
已有同名配音会复用；修改旁白后须删除对应 MP3 再重建。

视频重建执行 `node scripts/render_tiandiren_video.cjs`，需要可导入的 Playwright、Chromium 和 FFmpeg。
默认读取 `http://127.0.0.1:5178`；可用 `LESSON_BASE_URL` 指定已启动的静态服务，
用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定 Chromium 可执行文件。
渲染中间帧、时间轴和音轨保存在项目的 `output/animation/`。

视频版在每道题保留思考时间后展示答案；它不会检测或评价观看者的回答。
网页可直接播放现成配音和视频，不需要调用付费 API 或连接 Motion MCP。
