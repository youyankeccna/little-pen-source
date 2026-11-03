const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
// P1-6：页面上不出现 OCR/提取稿 等术语，字体名友好，不展示“未开通”的微信/QQ 入口
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert.ok(!/未开通|微信扫码登录|QQ 扫码登录|social-login/.test(html));
const visible=['material-library.js','curriculum/ui.js','curriculum/course-pilot.js','curriculum/data.js'].map(f=>fs.readFileSync(__dirname+'/'+f,'utf8').split('\n').filter(l=>!/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n'));
for(const src of visible){const strings=src.match(/'[^'\n]*'|"[^"\n]*"/g)||[];for(const s of strings)if(/[\u4e00-\u9fff]/.test(s))assert.ok(!/OCR|提取稿|待校订/.test(s),'用户可见文案含术语：'+s);}
const D=require('./data.js');for(const f of Object.values(D.fonts))assert.ok(!/[（(]/.test(f.name)&&!/开源|系统|替代|霞鹜/.test(f.name),f.name);
console.log('PASS: no OCR jargon or 未开通 entries in visible copy; friendly font names');
