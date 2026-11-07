# 模板优先实施计划

对应规格：`docs/superpowers/specs/2026-11-06-template-first-design.md`。在现有 `kim/web-editor-improvements` 上实施，不改写历史。

## 验证命令

- `node web-preview/template-first.test.cjs`
- `node web-preview/template-gallery.test.cjs`
- `node web-preview/*.test.cjs` 以及 `web-preview/**/*.test.cjs`
- `python3 -m unittest discover -s server -p 'test_*.py'`

先让 `template-first.test.cjs` 在现有 26 款、`fillPage: false`、没有换一张和计算偏移时失败，再改实现。

## 步骤

1. 扩展 `web-preview/template-gallery.js`。保留现有 26 款，追加不同内容的语文、英语、控笔和计算模板，合计至少 40。计算模板带年级和已有题库专项 ID，不新建题库，类型是 `calc`。古诗模板使用横线格和 `fillMode: "verse"`，诗文完整。每款需要换内容的模板提供两组不同正文。
2. `stateFor` 使用该模板自己的默认值，并默认 `fillPage: true`，同时记下 `templateId`。不读取上一个编辑器状态。`nextContent` 只在模板 ID 一致时保留字号、格子、描红、字体等排版，并切换到下一组正文；组用尽时返回用尽，不回到第一组。
3. `engine.js` 在 `fillMode === "verse"` 时只重复完整行，放不下整行就停，不循环截断。其他类型继续用现有铺满规则，不改格子毫米尺寸。
4. `math-sheet.js` 增加起始题号和铺满一页的题量。同一页按题目文本去重，只向后取，不回头。答案页使用同一批题目。换一张只增加起始题号，并保留年级、专项、格子和答案开关。题库取尽后停止。`sheet-link.js` 的计算链接带上起始题号和铺满开关。
5. `#/make` 的数学科目标签先展示计算模板，卡片进入 `#/calc`。编辑器增加「换一张」，与「恢复默认」分开。不改首页主体、四导航和 `src/`。新增按钮遵守现有 44px 点按规则。
6. 跑上面的测试。能启动浏览器时，用触屏方式点 390px 页面，保存模板页、打印预览截图和一页 PDF。不能启动就明确写出跳过的交互，不用静态检查代替。
