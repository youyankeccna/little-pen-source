# 小小笔尖网站架构与本轮改造

## 产品流程

游客：默认人教版 → 下拉选择幼儿园／1–6年级 → 科目 → 册次 → 单元 → 课次 → 字／词语／句段等内容 → 勾选与预览。可直接打印、导出 PDF 与 PNG。英语选择仅三至六年级，整册素材与原课次入口并行。

账号注册或登录 → 首次选择各科教材版本 → 保存 → 返回浏览与字帖预览 → 导出／打印。再次登录直接恢复服务端保存的偏好，账号菜单可重新设置。关闭首次选择窗口仍可浏览、打印及导出；云端收藏和保存安排需登录并完成学习设置。

版本按学科保存：语文为统编人教；数学提供人教、北师大、苏教；英语提供 PEP三年级起点、外研三年级起点、译林三年级起点。其他版本目前待收录，选择后显示真实空状态，不能把人教内容放到其他版本下面。幼儿园独立为自编启蒙活动，无上下册，不声称属于某教材版本。

## 权限边界

| 操作 | 游客 | 已登录、未选版本 | 已登录、已选版本 |
| --- | --- | --- | --- |
| 浏览已收录内容、调整设置、预览 | 允许 | 允许 | 允许 |
| PDF、PNG 导出与网站打印按钮 | 允许 | 允许 | 允许 |
| 更改并跨设备保存版本偏好 | 不允许 | 允许 | 允许 |

游客输出直接在本机完成；账号功能的权限由服务端验证。登录且已配置学习信息时可同步输出记录，同步失败不阻断本机下载。详见 README v33 的功能对照与验证范围。

## 当前落地结构

- `web-preview/`：已有静态界面与 Canvas 字帖引擎，新增 account.js，选课改为级联下拉。预览内容公开。
- `server/app.py`：同源 Python HTTP 服务，提供账号、会话、偏好和受登录校验的文件输出接口；仅将 web-preview 设为静态根目录。
- SQLite：本地先保存在被Git忽略的 output/accounts.sqlite3，账号、偏好和会话集中保存，不依赖 localStorage 伪造登录。
- 密码使用随机盐和 scrypt；会话用随机令牌的哈希入库，Cookie 为 HttpOnly、SameSite=Lax，HTTPS部署时加 Secure。退出登录撤销服务端会话。修改类接口校验 Origin，认证接口限制尝试频次。密码和密钥不写日志。
- 所有文件由浏览器引擎生成并直接交付。登录用户可另行同步私有快照与输出事件；同步时 /api/output 仍验证登录、偏好和快照归属，接口不保留用户字帖文件。

## API

| 接口 | 作用 |
| --- | --- |
| GET /api/me | 当前账号及三科教材偏好 |
| POST /api/auth/register | 注册并建立会话 |
| POST /api/auth/login | 账号密码登录 |
| POST /api/auth/logout | 撤销当前会话 |
| PUT /api/preferences | 保存各科教材版本 |
| GET /api/auth/providers | QQ与微信开通状态 |
| POST /api/output | 登录及版本选择校验后交付PDF或PNG |

## 内容模型

教材系列（出版社、学科、起点、学制）→ 修订版本（版次、ISBN、年份、来源、审核状态）→ 年级／上下册 → 单元 → 课次 → 内容组 → 内容项。

账号偏好保存的是教材系列，不把“人教版”与“2026修订版”混为一个概念。出版年份和具体修订版本需要内容审核确定；现有部分示范仍处于版次待核对状态。新身份和选课功能不会让待补齐内容自动变完整。

## QQ与微信

用户确认本轮尚无平台应用，两个入口明确显示“未开通”，不生成假二维码，不创建假社交账号。

开通时需要已审核的网站应用、AppID、服务端AppSecret和已登记的公网回调域名。服务端创建一次性 state 绑定浏览器并校验回调，用 code 换身份，再映射到统一账号。新增 oauth_identities(provider, app_id, openid, user_id) 表，对(provider, app_id, openid)加唯一约束；禁止仅凭昵称自动合并账号。密钥通过部署环境提供，不能出现在前端源码。

QQ官方说明：https://wiki.connect.qq.com/使用authorization_code获取access_token 。需服务端校验 state，不能把本地二维码或前端按钮当作登录成功。微信接入以届时开放平台网站应用文档与实际审核权限为准。

## 启动与部署

本地：`python3 server/app.py --port 5178`。用该服务替代原来的 `python3 -m http.server`；后者只支持静态页面，没有账号API。

正式部署：浏览器 → HTTPS域名／反向代理 → 应用服务 → 数据库。设置 PUBLIC_ORIGIN 为实际HTTPS域名，数据库路径应位于非静态目录并做备份。当前标准库服务器用于本地验证；上线应迁移到生产Web运行环境，保留会话、权限和内容模型契约，再接QQ/微信，配置账号找回与持久化限流，并进行完整安全与恢复演练。本轮不部署公网。

## 2026年10月16日规格落地更新

本地家长试用版继续使用同一Python账号服务和已有数据库；本批未迁移到旧Node后端，也未开通旧小程序／教师原型。统一契约新增/api/v1，保留/api旧路由作为兼容入口，两者执行同一身份和快照检查。JSON成功为{data,requestId}，失败为{error:{code,message},requestId}；二进制下载维持文件响应。接口清单见server/openapi.json（非公开静态目录）。

游客可以临时浏览版本；登录后的下拉切换也只影响浏览。“设为默认教材”才保存按学科的账号偏好；写入带version以拒绝并发覆盖。幼儿园隐藏教材与上下册。课题名称书写、主题巩固、公版诗文分别显示，并列出仅课题选字的数量；未知完整率保持待确认。

账号安全增加PUT /api/v1/auth/password及DELETE /api/v1/me。两者均校验当前密码；修改密码撤销全部会话，注销还要求输入确认文字并删除该账号的偏好、会话、快照和输出记录。恢复码找回已在 v27 接入，手机／邮箱验证码、QQ与微信尚未开通。

GET /api/v1/catalog/books、GET /api/v1/books/:revisionId/lessons、GET /api/v1/lessons/:id/practice共用已发布的补充练习清单。内容哈希为contentVersion；目录参考不自动变成已核验教材版次。审核导入工具见curriculum/CONTENT_PLAN.md。

POST /api/v1/worksheet-snapshots校验课次、所选条目和实际文字，保存当前排版配置、文本、来源、内容版本与引擎版本；GET /api/v1/worksheet-snapshots/:id仅创建账号可读。旧索引ID保留兼容，新审核导入需显式稳定条目ID。服务端输出要求X-Worksheet-Snapshot且再次校验所属账号，记录文件哈希、格式和输出时间；同快照同文件去重计数。记录不表示实际打印或孩子完成练习。当前仍由浏览器渲染，服务端不验证上传二进制与渲染效果完全一致；没有宣称防截图或服务端重新排版。

输出限制1至20页、单文件25 MiB；文件命名含课题、类型和日期；输出分辨率约300 dpi。提供少量描红留白与整行描红预设；低年级及幼儿园课题默认少量描红、大格。登录后保留编辑状态并提供继续原输出按钮，不自动重复下载。未验证实体打印机或第二种浏览器。

数据库使用可重复执行的增量建表和preferences_version列，user_version=1。新增worksheet_snapshots与output_events；现有scrypt密码及会话无需重置。本批先备份原账号库并在临时库完成恢复校验；运行python3 scripts/backup_accounts.py --database output/accounts.sqlite3 --to <新的备份路径>可生成校验通过的备份，不覆盖已有文件。生产HTTPS、生产Web服务、持久化限流、邮件服务、OAuth应用与旧服务关闭仍属于上线前待办。

## v27 恢复码找回

新增登录页密码找回、新注册恢复码保存以及账号安全中的恢复码生成；详见 README v27。接口支持 `/api` 和 `/api/v1`，用户公开资料仅含 `recoveryEnabled` 布尔状态，恢复码正文仅注册／生成时返回。使用后摘要清空，所有会话撤销；正常修改密码也会清空旧摘要。新增 `users.recovery_hash`，迁移后 `user_version=7`。

未设置恢复码的旧账号需要管理员核验后通过 `scripts/issue_recovery_code.py` 发放一次性恢复文件；没有公开管理员重设接口。

## 2026-10-25 小程序接入基础

网站继续使用 HttpOnly Cookie；新增 /api/v1/auth/mobile/login 通过已有账号密码签发 Bearer 会话，使用同一 sessions 哈希表与统一撤销逻辑。无 Origin 的原生请求只放行该登录入口或携带 Bearer 的请求，后者仍需各业务接口验证身份与孩子归属；有 Origin 时仍严格校验，不开放任意跨域。小程序微信身份绑定尚未配置。

常用排版通过 /api/v1/layout-preferences 共享，按 (user_id, child_id, context_key) 隔离，版本冲突返回409；config=null保留删除版本。可移植字段与网站 LayoutPreferences 白名单保持一致，不保存文本、姓名、本地字体或答案模式。账号注销删除对应排版。数据库v8增量增加此表。旧 uni-app 接口未替换，新增入口和 shared.ts 专门接入现有后台，避免误用旧原型的假数据与导出任务。

## 2026-10-25 第二批导出与完成记录

新增 /api/v1/render-jobs 异步任务接口，公开素材游客可调用；snapshotId 必须验证账号与孩子归属。任务最多2个工作线程、8个等待/执行槽位，Node 子进程90秒超时，1–20页、每文件25MiB。依赖在 server/renderer 独立锁定安装，复用项目 WorkbookEngine、CourseLayout 和 jsPDF，通过内置字体提供可移植渲染。输出到数据库同级私有缓存，任务ID配合 X-Render-Key 读取；账号任务另验证登录与孩子。30分钟到期时触发清理，不通过公开 URL 传递密钥。

GET /render-jobs/{id} 读取状态；GET /render-jobs/{id}/preview-N.png、page-N.png、workbook.pdf 读取文件；POST /render-jobs/{id}/save 创建/复用完整快照并收藏；POST /render-jobs/{id}/output 记录交付格式和哈希，不自动标记收藏或完成。后两者沿用账号和学习设置检查。云同步失败不阻断本机文件交付。保存从服务端已验证的生成结果构造，不接受前端伪造页数。

今日安排复用 family/plans；字、词、单词及数学计算选择仍受实际素材范围与数量验证。相同孩子/日期/内容的每日安排复用原ID；确认完成与撤销使用原有完成接口和成长统计，同一天不重复计数。小程序回到前台时刷新账号记录，同时保留正在查看的字帖。

## 2026-10-25 第三批：私密作品与轨迹指导

数据库v9增加 family_works 和 writing_completions，按 (user_id,child_id) 隔离。照片最大4MiB、2500万像素，Pillow校验并缩图、去EXIF，写入数据库同名.assets/private-works私密目录。GET /works、/works/summary、/works/{id}/image，POST /works、/works/{id}/restore，DELETE /works/{id} 均验证身份和孩子归属；删除是回收站，注销账号才清除对应文件。写入事务重新验证账号/孩子仍存在，避免长请求结束时写入已注销档案。备份脚本将数据库快照及引用图像成对备份，缺图不报告成功。

公开 /writing/challenge 和 /writing/guide/{char} 提供课程字词与本地参考数据；/writing/attempts 接受有界的归一化坐标，Node复用 shared/writing-coach.mjs 对每笔做起点、方向、完整度和形状核验。只有整字通过才在服务端记星，同字同课同日去重；可按真实笔迹生成PNG作品。/writing/progress返回今日记录。跟写数据不替代家长确认纸上每日计划。

小程序Canvas按实际触摸/鼠标事件采样，笔划移动时生成温和提示。作品墙周比较基于实际日期和作品；仅同字且相同分析方法/参考版本的跟写记录可描述对齐变化，照片不作AI质量判断。capabilities明确photoAI=false。微信扫码、照片AI及纸笔摄像头实时分析仍未接入，不以界面或规则分析冒充模型能力。

小程序另支持 /auth/mobile/register 和 /auth/mobile/reset-password，沿用同一用户表、密码哈希、恢复码和限流。新注册回传一次性恢复码；找回后撤销全部会话，旧码作废，登录后可用 /auth/recovery-code 验证当前密码并换新码。网页Cookie路径的Origin验证保持原样，原生无Origin请求只允许明确列出的公开身份入口，其他写入仍需Bearer。
