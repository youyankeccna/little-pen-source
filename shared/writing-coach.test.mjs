import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeGuides,analyzeCharacter,analyzeStroke,liveHint} from './writing-coach.mjs';
for(const char of ['一','二','十','人','大','水','我']){
 const guides=makeGuides(JSON.parse(fs.readFileSync(new URL('../web-preview/vendor/hanzi/'+char+'.json',import.meta.url))).medians);
 assert.equal(analyzeCharacter(guides,guides).passed,true,char);
 assert.equal(analyzeCharacter(guides.map(s=>s.map(([x,y])=>[x+.02,y-.01])),guides).passed,true,char+' gentle tolerance');
 assert.equal(analyzeCharacter(guides.map(s=>s.map(([x,y])=>[x+.23,y])),guides).passed,false,char+' shifted');
 assert.equal(analyzeCharacter([],guides).passed,false);
}
const line=[[.12,.5],[.88,.5]];
assert.equal(analyzeStroke([[.88,.5],[.12,.5]],line).passed,false,'reversed');
assert.equal(analyzeStroke([[.12,.5],[.2,.5]],line).passed,false,'unfinished');
assert.equal(analyzeStroke([[.12,.5],[.5,.85],[.88,.5]],line).passed,false,'bent horizontal');
assert.equal(liveHint([[.5,.9]],line).includes('参考线'),true);
for(const points of [[],[[.12,.5]],[[.88,.5],[.12,.5]]])assert.equal(analyzeStroke(points,line).message.includes('错'),false);
console.log('PASS: stroke direction, completion, shape, child-friendly tolerance and encouraging feedback');
