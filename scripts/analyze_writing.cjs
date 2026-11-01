(async()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const {makeGuides,analyzeCharacter}=await import('../shared/writing-coach.mjs');
 const input=JSON.parse(fs.readFileSync(0,'utf8')),file=path.resolve(__dirname,'../web-preview/vendor/hanzi',input.char+'.json');
 const source=fs.readFileSync(file),data=JSON.parse(source),guides=makeGuides(data.medians),result={...analyzeCharacter(input.strokes,guides),guideHash:crypto.createHash('sha256').update(source).digest('hex')};
 if(result.passed&&process.argv[2]){
  const {createCanvas}=require('node:module').createRequire(path.resolve(__dirname,'../server/renderer/package.json'))('@napi-rs/canvas');
  const canvas=createCanvas(600,600),ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,600,600);ctx.strokeStyle='#dce6df';ctx.lineWidth=2;ctx.strokeRect(24,24,552,552);ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(300,24);ctx.lineTo(300,576);ctx.moveTo(24,300);ctx.lineTo(576,300);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#203b32';ctx.lineWidth=20;ctx.lineCap='round';ctx.lineJoin='round';
  for(const stroke of input.strokes){ctx.beginPath();stroke.forEach(([x,y],i)=>i?ctx.lineTo(x*600,y*600):ctx.moveTo(x*600,y*600));ctx.stroke();}
  fs.writeFileSync(process.argv[2],canvas.toBuffer('image/png'));
 }
 process.stdout.write(JSON.stringify(result));
})().catch(()=>{process.stderr.write('Writing analysis unavailable.');process.exitCode=1;});
