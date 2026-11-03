const assert=require('node:assert/strict'),fs=require('fs');
const css=fs.readFileSync(__dirname+'/style.css','utf8'),html=fs.readFileSync(__dirname+'/index.html','utf8');
// P1-9：手机端底部固定操作栏（约 59px）不遮挡最后一屏内容；预览可放大到 100% / 150%
assert.ok(/@media\(max-width:700px\)\{#editor,#personal-view,#curriculum,#home\{padding-bottom:calc\(88px \+ env\(safe-area-inset-bottom,0px\)\)\}/.test(css));
assert.ok(/data-preview-zoom="100"/.test(html)&&/data-preview-zoom="150"/.test(html));
console.log('PASS: mobile bottom bar clearance and preview zoom available');
