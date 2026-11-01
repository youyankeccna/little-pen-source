# 智能字帖生成小程序

基于 uni-app + TypeScript 的小程序，与网站共用 Python / SQLite 后台，并使用同一套 JavaScript 字帖引擎。

## 2026-10-25：第三批闯关、书写指导与作品墙

默认小程序入口现有「今日练习 / 素材库 / 成长 / 我的」四个入口。汉字闯关从当前年级、册次和已收录字词中取字，幼儿园使用单独启蒙字。完成整字的全部笔画点亮一星，五字一组解锁小花动画；每字每课每天只累计一次。游客在本机记录，账号同步到当前孩子。小程序内可注册、登录、保存恢复码、找回密码及验证当前密码生成新恢复码；网站账号可直接使用。幼儿园素材不按册次过滤，提供自编汉字/控笔、数字和字母活动。

屏幕跟写按实际触摸/鼠标轨迹检查起点、方向、完成度与参考线形状，移动中给提示，书写后逐笔反馈。前端与服务端复用 shared/writing-coach.mjs；服务端独立核验后记录奖励，不信任客户端的通过标记。它是参考轨迹规则分析，没有接入大模型、纸笔实时摄像头或照片质量评分。宽松阈值用于儿童引导，仍需真实儿童与微信设备的进一步体验验证。

作品墙支持拍照/相册、屏幕跟写作品、日期查找、本周/上周统计、两件作品对比及可恢复回收站。作品按账号与孩子隔离，默认不公开，照片去除EXIF后存储。网页 #/works 与小程序读取同一份作品和星星，可双向恢复/移入回收站。图像与元数据都需认证，不使用公开图片链接。只在同字、相同规则与参考字形时，根据已有跟写轨迹说明对齐变化；普通照片仅供家长视觉回顾，不编造AI进步判断。

增加 Python 图片处理依赖（当前环境已安装）：

```sh
python3 -m pip install -r server/requirements.txt
```

数据库增量迁移至 v9，增加 family_works / writing_completions；原账号、教材、收藏与练习记录保留。私密图片目录为「数据库完整文件名.assets/private-works」，例如 output/accounts.sqlite3.assets/private-works。数据库与同名.assets目录需一起备份/恢复。backup_accounts.py 已同时备份快照所引用的作品图像，缺图时会失败并清理本次不完整备份，拒绝覆盖已有备份；账号注销清除对应图像和奖励记录。

验证：39项后端测试、13组网站测试和1组共享笔迹分析测试、TypeScript、微信小程序/H5构建通过。独立测试账号通过真实拖笔写完「一二三十人」并点亮5星，反向书写得到鼓励提示且不加星；跟写与照片作品在两端可见，网站回收后可在小程序恢复。微信真机触摸/相机/授权仍待验收；微信快捷登录、AI拍照点评与纸笔摄像头实时分析尚未开通。

## 2026-10-25：第二批 A4 练习与文件导出

当前默认小程序入口已支持勾选真实素材、字号与内置字体、拼音、铺满 A4、逐页预览、整份 PDF 和当前页 PNG。游客无需登录即可生成与下载；账号可收藏完整字帖、同步上次选择、输出记录和今日安排。今日完成由家长确认，可撤销；下载不自动计完成，同日天数不重复累计，同一份每日安排重复添加会复用。

先安装独立渲染依赖，再启动后台和前端：

```sh
npm ci --prefix server/renderer
python3 server/app.py --port 5178
npm run dev:h5 -- --host 127.0.0.1 --port 5290
```

服务端通过 Node、@napi-rs/canvas、项目内 jsPDF 和现有 WorkbookEngine 生成文件，内置文楷/意大利体用于可移植输出；`course-layout.js` 同时供网站和服务端调用。没有复制另一套分页逻辑。数学仅适用题型列竖式，分数/混合运算保留原式并提示。已保存字帖可重新生成，界面明确使用选定内置字体，原收藏不覆盖。

文件位于数据库同级的 render-jobs/，不在公开静态目录。最多2个任务同时运行、8个任务排队/运行；每次1–200项、20页、单文件25MiB。约30分钟过期，下次访问时清理缓存（重启后的过期缓存也清理），本机已下载文件保留。原始会话令牌及文件访问密钥不放进 URL。公开素材任务可供游客使用；私有字帖需账号和孩子归属校验，文件还需任务密钥。任务状态为 queued/processing/ready/failed，出错不伪造预览。

微信原生构建使用 downloadFile、openDocument 和 saveImageToPhotosAlbum；H5 使用下载文件。微信真机的域名、相册授权、PDF 菜单和设备打印仍需验收，本批没有提交审核或配置微信登录。作品墙、闯关和 AI 小老师仍待开发。

验证：31项 Python HTTP 测试、13组前端测试、TypeScript、微信小程序和 H5 构建通过。独立测试账号实测生字 PDF/PNG、英语双语 PDF、收藏、今日练习确认与撤销，检查真实 PDF A4 尺寸和渲染页。样例见 output/pdf/mini35-*。以下第一批说明为当时交付记录，未实现范围以本节为准。

## 2026-10-25：网站与小程序共用数据接入版

当前默认入口为 `src/pages/learning/index.vue`，调用 `src/services/shared.ts`，共用现有 Python 网站后台的 `/api/v1`。下方 Node.js、旧首页及旧 AI 等说明属于早期原型，不代表此次接入版已实现。

已接入：网站账号密码登录、孩子切换、教材/年级/册次设置、真实素材与翻译、网站保存的字帖内容、上次练习内容恢复，以及按孩子和练习类型同步常用格子大小。网站“常用排版”同步完整的允许字段，小程序当前仅调整其中的 size，保留其他字段。素材保留原审核状态，不宣称教材覆盖完整。

本地运行（两个终端）：

```sh
python3 server/app.py --port 5178
npm run dev:h5 -- --host 127.0.0.1 --port 5290
```

浏览器打开 `http://127.0.0.1:5290/`。开发代理默认连接 5178，可用 `LITTLE_PEN_SERVER` 指向隔离测试后台。H5 与网站登录会话分开，但对应同一账号；使用原网站账号登录即可。

微信开发者工具构建：

```sh
VITE_SHARED_API_BASE=https://你的接口域名/api/v1 npm run build:mp-weixin
```

导入 `dist/build/mp-weixin`。本地模拟器可使用 `http://127.0.0.1:5178/api/v1`；真机须使用可访问的部署地址及平台允许的域名配置，手机上的 127.0.0.1 不是电脑。已有 manifest AppID 未验证归属或审核状态，微信快捷登录保持“未开通”，本批不提交审核。

接口变化：`POST /auth/mobile/login` 返回七天有效的不透明 Bearer 会话；Cookie 网站登录维持原样；`GET/PUT /layout-preferences` 使用 `X-Child-Id` 及乐观版本号。删除排版保存版本标记，旧设备无法自动复活已删除设置。数据库自动增量迁移至 v8；新增 layout_preferences 表，不重建现有数据。会话注销、改密、账号删除沿用统一撤销机制。API 见 `server/openapi.json`。

边界：本批没有实现小程序 Canvas/A4 导出、微信身份绑定、作品墙、闯关、AI 分析、后台生产部署或 PostgreSQL 迁移。网站游客 PDF/PNG/打印继续可用；小程序显示的收藏为内容查看，不声称已经渲染完整字帖。后续按共享快照和内容 ID 接入导出、每日任务与成长功能。

验证：26 项 Python HTTP 测试、13 组网站测试、TypeScript 检查、微信小程序与 H5 构建通过。独立测试数据库实测网站账号在 H5 接入版登录、英语单元与翻译读取、网站与 H5 双向排版同步。375px 竖屏与 812px 横屏检查，未代替微信真机验收。

## 项目概述

一款面向家长、老师、幼小衔接及小学低年级学生的字帖练习小程序，核心能力是形成"生成-练习-记录-分享-回炉训练"的学习闭环。

## 技术栈

- **前端**: uni-app 3.0 + Vue 3 + TypeScript + Pinia + SCSS
- **后端**: Node.js + Express + Jimp (图片生成)
- **运行端**: 微信小程序

## 项目结构

```
智能字帖生成/          # 小程序前端
├── src/
│   ├── pages/        # 页面 (12个)
│   │   ├── home/    # 首页
│   │   ├── create/  # 选择类型
│   │   ├── config/ # 配置页
│   │   ├── preview/ # 预览导出
│   │   ├── templates/  # 模板中心
│   │   ├── history/   # 历史记录
│   │   ├── profile/   # 个人中心
│   │   ├── checkin/   # 每日打卡
│   │   ├── retrain/   # 错字回炉
│   │   ├── content/   # 内容包
│   │   ├── practice/  # 拍照评估
│   │   └── assignment/ # 老师作业
│   ├── stores/      # Pinia 状态管理
│   ├── types/       # TypeScript 类型
│   ├── constants/  # 常量配置
│   └── services/   # API 服务

字帖生成服务/         # 后端服务
├── src/
│   ├── modules/
│   │   ├── export/    # 字帖导出
│   │   ├── template/  # 模板管理
│   │   ├── history/   # 历史记录
│   │   ├── checkin/   # 打卡服务
│   │   ├── retrain/   # 错字回炉
│   │   ├── content/   # 内容包
│   │   ├── user/      # 用户/班级
│   │   └── ai/        # AI 评估
│   └── common/       # 类型定义
```

## 功能清单

### 第一阶段 (MVP)
- [x] 字帖类型选择 (汉字/词组/段落/拼音/数字/英文/控笔)
- [x] 参数配置 (方格/字体/描红/辅助选项)
- [x] 实时预览
- [x] 图片导出 (后端生成)
- [x] 模板保存/加载
- [x] 历史记录
- [x] 分享传播

### 第二阶段
- [x] 每日练习计划
- [x] 打卡体系
- [x] 错字回炉
- [x] 教材/内容包
- [x] 家长端练习记录

### 第三阶段
- [x] 拍照识别 (简化版)
- [x] AI 批改建议 (模拟)
- [x] 老师布置作业
- [x] 班级功能基础
- [ ] 会员权益 (需支付系统)

## 运行指南

### 前端

```bash
cd 智能字帖生成
npm install
npm run dev:mp-weixin
# 微信开发者工具打开 dist/dev/mp-weixin
```

### 后端

```bash
cd 字帖生成服务
npm install
npm run dev
# 服务运行在 http://localhost:8080
```

## API 文档

### 字帖导出
- `POST /api/workbook/export` - 创建导出任务
- `GET /api/workbook/export/:taskId` - 查询任务状态
- `POST /api/workbook/preview` - 预览数据

### 模板
- `GET /api/template/list` - 模板列表
- `POST /api/template/save` - 保存模板
- `POST /api/template/favorite/:id` - 收藏

### 历史
- `GET /api/history/list` - 历史记录
- `DELETE /api/history/:id` - 删除记录

### 打卡
- `POST /api/checkin` - 打卡
- `GET /api/checkin/streak` - 连续天数
- `POST /api/plan` - 创建每日计划

### 错字回炉
- `POST /api/wrongchar` - 记录错字
- `POST /api/retrain/create` - 创建回炉任务

### 内容包
- `GET /api/content/packages` - 内容包列表

### AI 评估
- `POST /api/practice/upload` - 上传练习
- `POST /api/ai/evaluate` - AI 评估

### 用户/班级
- `POST /api/user/login` - 用户登录
- `POST /api/class` - 创建班级
- `POST /api/assignment` - 布置作业

## 版本

- v1.0.0 - MVP 完成
