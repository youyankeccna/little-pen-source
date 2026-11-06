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
  assert(!('englishMode' in state));
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
