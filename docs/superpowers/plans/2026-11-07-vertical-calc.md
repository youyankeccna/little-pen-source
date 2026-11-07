# 竖式计算实施计划

对应 `docs/superpowers/specs/2026-11-07-vertical-calc-design.md`。在 `kim/web-editor-improvements` 上追加，不改写历史。

## 验证

- 先跑 `node web-preview/vertical-calc.test.cjs`，确认当前口算实现失败。
- 实现后再跑该文件、`node web-preview/**/*.test.cjs` 和 `python3 -m unittest discover -s server -p 'test_*.py'`。
- 用 Playwright 在 390px 与 320px 点选竖式模板、切换口算、换一张，并导出进位加法、退位减法、乘法和除法的打印 PDF。

## 步骤

1. 给计算练习增加竖式排版。缺省和旧链接仍是口算。竖式只收现有题库里 `MathVertical.parse` 能排开的题目。
2. 学生页只画题干和结构线；答案页补上同一批题的过程和结果。按固定书写字号装箱，放不下的整题留到下一页。
3. 增加四张竖式模板：一百以内进位加法、一百以内退位减法、两位数乘两位数、除以一位数。分数等专项切到竖式时只说明不能排，不生成假题。
4. 分享参数仅在竖式时写入 `layout=vertical`。
