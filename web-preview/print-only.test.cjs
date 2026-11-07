const assert=require('node:assert/strict'),fs=require('fs');
const css=fs.readFileSync(__dirname+'/style.css','utf8'),app=fs.readFileSync(__dirname+'/app.js','utf8');
// P0-4：访客 Ctrl+P 只打印字帖：其余元素隐藏，字帖区域可见并贴到纸张左上角
assert.ok((/@media print\{body \*\{visibility:hidden!important\}#paper-stack,#paper-stack \*\{visibility:visible!important\}/).test(css));
assert.ok((/#paper-stack\{position:absolute!important;left:0!important;top:0!important/).test(css));
// 打印前把尚未绘制的页面全部画出来，避免长字帖后几页空白
assert.ok(/addEventListener\(["']beforeprint["']/.test(app),'beforeprint handler');
const theme=fs.readFileSync(__dirname+'/theme.css','utf8');
assert.ok(/body\.calc-mode #calc-view,body\.calc-mode #calc-view \*\{visibility:visible!important\}/.test(theme),'计算画布不能继承通用打印隐藏规则');
assert.ok(/body\.calc-mode #editor,body\.calc-mode #paper-stack\{display:none!important\}/.test(theme),'计算页不打印隐藏的汉字编辑器');
assert.ok(/body\.calc-mode \.calc-page:last-child\{break-after:auto;page-break-after:auto\}/.test(theme),'最后一张计算纸后不强制生成空白页');
console.log('PASS: print stylesheet isolates the worksheet; beforeprint paints every page');
