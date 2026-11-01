// Render with the website engine and bundled, portable fonts. Input arrives on stdin.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,GlobalFonts,Path2D}=require('node:module').createRequire(path.resolve(__dirname,'../server/renderer/package.json'))('@napi-rs/canvas');
global.Path2D=Path2D;
const root=path.resolve(__dirname,'../web-preview');
GlobalFonts.registerFromPath(path.join(root,'vendor/wenkai.ttf'),'LXGW WenKai');
GlobalFonts.registerFromPath(path.join(root,'vendor/lora-italic.ttf'),'Practice Italic');
const D=require('../web-preview/data.js');
global.pinyinPro=require('../web-preview/vendor/pinyin-pro.js');
const layouts=require('../web-preview/course-layout.js'),preferences=require('../web-preview/layout-preferences.js');
const E=require('../web-preview/engine.js'),{jsPDF}=require('../web-preview/vendor/jspdf.js');
const input=JSON.parse(fs.readFileSync(0,'utf8')),folder=process.argv[2];
let snapshot=input.snapshot;
if(!snapshot){const c=input.course;const config=layouts.defaults(c,!!input.materialLibrary);snapshot={sourceMode:'lesson',type:c.type,lessonId:c.lessonId,practiceKind:c.kind,itemIds:c.itemIds,contentVersion:input.contentVersion,config:{...config,...preferences.pick(input.layout)}};}
snapshot=structuredClone(snapshot);snapshot.config={...snapshot.config,...input.options};
if(!['wenkai','italic'].includes(snapshot.config.font))throw Error('请选择内置文楷或意大利体后重新生成。');
const s=snapshot.config,ctx=createCanvas(1,1).getContext('2d');ctx.font=E.fontString(s);
const model=E.build(snapshot.type,s,text=>ctx.measureText(text).width);snapshot.pages=model.pages;
if(model.pages>20)throw Error('超过20页，请减少素材数量或字号。');
if(!model.rows?.length&&!model.mathPages&&!model.sheets)throw Error('所选内容没有可练习的字词。');
const strokeData={};if(s.showBishun)for(const char of new Set(Array.from(s.text))){const file=path.join(root,'vendor/hanzi',char+'.json');if(fs.existsSync(file))strokeData[char]=JSON.parse(fs.readFileSync(file));}
const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
for(let i=0;i<model.pages;i++){
 const canvas=createCanvas(1,1);E.drawPage(canvas,model,i,1,strokeData);fs.writeFileSync(path.join(folder,`preview-${i+1}.png`),canvas.toBuffer('image/png'));
 E.drawPage(canvas,model,i,2480/E.WIDTH,strokeData);const png=canvas.toBuffer('image/png');if(png.length>25*1024*1024)throw Error('图片超过25 MiB，请减少内容。');
 fs.writeFileSync(path.join(folder,`page-${i+1}.png`),png);if(i)pdf.addPage();pdf.addImage(new Uint8Array(png),'PNG',0,0,210,297,undefined,'FAST');
}
const bytes=Buffer.from(pdf.output('arraybuffer'));if(bytes.length>25*1024*1024)throw Error('PDF超过25 MiB，请减少内容。');
fs.writeFileSync(path.join(folder,'workbook.pdf'),bytes);
fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify({snapshot,pages:model.pages,unsupported:model.unsupported||0}));
