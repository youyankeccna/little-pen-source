// Local administrator import tool. Drafts remain outside the static website.
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),draft=path.join(base,'server/content-review.json');
const input=process.argv[2];if(!input){console.error('Usage: node scripts/review_content.cjs <review.json> [--publish]');process.exit(1);}
const rows=JSON.parse(fs.readFileSync(input,'utf8'));if(!Array.isArray(rows))throw Error('Expected review records array');
const C=require('../web-preview/curriculum/data.js');const ids=new Set();
for(const row of rows){
 if(!C.getLesson(row.id)||ids.has(row.id))throw Error('Unknown or duplicate lesson '+row.id);ids.add(row.id);
 if(!['draft','approved','withdrawn'].includes(row.status))throw Error('Invalid status');
 if(row.status==='approved'){
  if(!row.reviewer?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(row.reviewedAt)||!row.rightsBasis?.trim()||!/^https?:\/\//.test(row.source||''))throw Error('Approval requires reviewer, date, source and rights basis');
  if(!row.title?.trim()||!Array.isArray(row.packs)||!row.packs.length)throw Error('Missing lesson content');
  for(const group of row.packs){
   if(!C.kindInfo[group.kind]||!['authorized-textbook','self-authored','public-domain','selected-from-public-domain','selected-from-title'].includes(group.origin)||!Array.isArray(group.items)||!group.items.length)throw Error('Invalid practice group');
   const itemIds=new Set();for(const item of group.items){if(typeof item.id!=='string'||!item.id||itemIds.has(item.id)||typeof item.text!=='string'||!item.text.trim()||item.text.length>20000)throw Error('Missing stable item ID or invalid text');itemIds.add(item.id);}
  }
 }
}
const prior=fs.existsSync(draft)?JSON.parse(fs.readFileSync(draft)):[];
console.log(JSON.stringify({input:rows.length,approved:rows.filter(r=>r.status==='approved').length,withdrawn:rows.filter(r=>r.status==='withdrawn').length,changes:rows.filter(r=>JSON.stringify(prior.find(p=>p.id===r.id))!==JSON.stringify(r)).map(r=>r.id),published:process.argv.includes('--publish')}));
if(process.argv.includes('--publish')){
 fs.writeFileSync(draft,JSON.stringify(rows,null,2)+'\n');
 const publicRows=rows.filter(r=>r.status!=='draft');
 const js='(function(root){const data='+JSON.stringify(publicRows)+';root.ReviewedContent=data;if(typeof module!=="undefined")module.exports=data;})(typeof globalThis!=="undefined"?globalThis:this);\n';
 fs.writeFileSync(path.join(base,'web-preview/curriculum/reviewed-content.js'),js);
 console.log('Run node scripts/content_release.cjs, then restart the website service to activate the matching publication.');
}
