const assert=require('node:assert/strict'),fs=require('fs');
const app=fs.readFileSync(__dirname+'/app.js','utf8'),css=fs.readFileSync(__dirname+'/style.css','utf8'),html=fs.readFileSync(__dirname+'/index.html','utf8');
// P1-8：#/course 不显示首页大图，直接是选课区
assert.ok(app.includes('document.body.classList.toggle("course-only", key === "course")'));
assert.ok(/body\.course-only #curriculum \.course-heading,body\.course-only #today-panel/.test(css));
// P1-7：学习信息只问一次（记在本机），可跳过
assert.ok(/little-pen-learning-info-asked-v1/.test(app)&&/if \(!asked\) setTimeout\(\(\) => WorkbookAccount\.openVersions\(\)/.test(app));
assert.ok(/id="version-skip"[^>]*data-account-close[^>]*>先看看，稍后再设</.test(html));
assert.ok(app.includes('$("course-start").onclick = () => (location.hash = "#/course");'),'首页“跟着课本练”直接进入选课');
console.log('PASS: #/course opens the selector; learning-info asked once and skippable');
