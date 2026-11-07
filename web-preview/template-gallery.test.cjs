const assert = require('node:assert/strict');
const D = require('./data.js');
const E = require('./engine.js');
const T = require('./template-gallery.js');
assert.equal(new Set(T.templates.map(t => t.id)).size, T.templates.length);
assert.equal(T.stateFor('missing', 'hanzi'), null);
assert.equal(T.stateFor('pinyin-trace', 'word'), null);
for (const t of T.templates) {
  const state = T.stateFor(t.id, t.type);
  assert.equal(state.text, t.config.text);
  assert(!('mathLayout' in state));
  assert(!('batchNames' in state));
  if (t.id !== 'english-recall') assert(!('englishMode' in state));
  const model = E.build(t.type, state, text => text.length * 20);
  assert.equal(model.pages, 1, t.id + ' opens one page');
  assert(model.rows.length > 0);
  assert(model.g.cols > 0 && model.g.rows > 0);
  const url = new URL(T.href(t), 'https://example.test/');
  assert.equal(new URLSearchParams(url.hash.split('?')[1]).get('template'), t.id);
}
const a = T.stateFor('pinyin-trace', 'hanzi');
a.padding[0] = 999;
a.strokes[0].id = 100;
assert.deepEqual(T.stateFor('pinyin-trace', 'hanzi').padding, D.defaults('hanzi').padding);
assert.equal(T.stateFor('pinyin-trace', 'hanzi').strokes[0].id, 0);
assert.equal(T.stateFor('independent-copy', 'hanzi').practiceMode, 'copy');
assert.equal(T.stateFor('stroke-trace', 'hanzi').showBishun, true);
assert.equal(T.stateFor('letter-trace', 'alphabet').pair, true);
console.log('PASS: template identity, type boundaries, fresh settings, practice modes and A4 pagination');

const C = require('./curriculum/data.js');
assert.equal(T.templates.length, 26);
const cn = T.find('pinyin-trace', 'hanzi');
const sources = T.sources(cn, {grade:1,term:'upper',edition:'pep'}, C.lessons);
assert(sources.length);
assert(sources.every(x => x.lesson.grade === 1 && x.lesson.term === 'upper' && !x.lesson.pending));
assert.equal(T.sources(cn,{grade:3,term:'upper',edition:'unavailable'},C.lessons).length,0);
const source=sources[0],url=new URL(T.contentLink(cn,source),'https://example.test'),q=new URLSearchParams(url.hash.split('?')[1]);
assert.equal(source.pack.kind,'characters','textbook writing list takes priority over supplementary characters');
assert.equal(T.sources(T.find('word-trace','cizu'),{grade:1,term:'upper',edition:'pep'},C.lessons)[0].pack.kind,'extraWords');
const selection=C.getSelection(q.get('course'),q.get('kind'),q.get('items').split(','));
assert(selection && selection.type==='hanzi');
const base={...D.defaults('hanzi'),text:selection.text,practiceMode:'quiz',fadeTrace:true,showBishun:true};
const copy=T.courseConfig(base,'independent-copy','hanzi');
assert.equal(copy.text,selection.text);assert.equal(copy.practiceMode,'copy');assert.equal(copy.fadeTrace,false);assert.equal(copy.showBishun,false);assert.equal(base.practiceMode,'quiz');
assert.equal(T.courseConfig(base,'english-recall','hanzi'),base);
for(const id of ['english-bilingual','english-recall','english-sentences']){
 const t=T.find(id,'paragraph');const found=T.sources(t,{grade:3,term:'upper',edition:'pep'},C.lessons);
 assert(found.length,id);assert(found.every(x=>C.kindInfo[x.pack.kind].type===t.type));
}
assert.equal(T.sources(T.find('english-sentences','paragraph'),{grade:3,term:'upper',edition:'pep'},C.lessons)[0].pack.kind,'englishSentencesBilingual','prefer sentences with translations');
console.log('PASS: 26 ready-to-use templates, reviewed-source gates, edition isolation and source text preservation');
