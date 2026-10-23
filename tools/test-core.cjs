// Tests de la logique de MathQuest (sans navigateur) : node tools/test-core.cjs
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const { data } = require('./bank.cjs').loadBank();

const mem = {};
const ctx = {
  console, Math, JSON, Date, Intl, Set, Map,
  window: { __MQ_DATA: data },
  localStorage: { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } },
  document: { documentElement: { classList: { toggle() {} }, style: { setProperty() {} }, dataset: {} }, querySelector: () => null },
  app: { addEventListener() {} },
  matchMedia: () => ({ matches: false }),
  toast() {}, setTimeout: () => 0,
};
ctx.window.window = ctx.window;
vm.createContext(ctx);
const code = ['core', 'learn', 'settings'].map(f => fs.readFileSync(path.join(root, 'src/js', f + '.js'), 'utf8')).join('\n')
  + '\n;globalThis.T = { store, isRight, typeKey, choicesFor, pickQuestions, questionsOf, targetTier, srsUpdate, dueNotions, dailyQuestions, placementQuestions, speakable, sprintPool, ficheOf, addDays, today, toNumber, recentRate, MIX };';
vm.runInContext(code, ctx);
const T = ctx.T;
T.store.load();

let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { console.error('ÉCHEC :', name, '\n ', e.message); process.exitCode = 1; } };

test('réponses numériques tolérantes', () => {
  assert(T.isRight('0,5', '0.5', false));
  assert(T.isRight('1/2', '0.5', false));
  assert(T.isRight('-3', '−3', false));
  assert(T.isRight('2/4', '1/2', false));
  assert(!T.isRight('0,6', '0.5', false));
  assert(T.isRight('Oui', 'Oui', true) && !T.isRight('Non', 'Oui', true));
});
test('saisie au pavé', () => {
  let v = '';
  for (const k of ['0', '0', '7', ',', ',', '5']) v = T.typeKey(v, k);
  assert.strictEqual(v, '7,5');
  assert.strictEqual(T.typeKey('', ','), '0,');
  assert.strictEqual(T.typeKey('3', 'sign'), '-3');
  assert.strictEqual(T.typeKey('3/', '/'), '3/');
});
test('choix des modes à deux : 4 réponses distinctes dont une juste', () => {
  const pool = T.questionsOf('5eme', T.MIX.id).filter(q => !q.figure).slice(0, 400);
  let ok = 0;
  for (const q of pool) {
    const c = T.choicesFor(q); if (!c) continue;
    assert.strictEqual(c.length, q.options ? Math.min(4, q.options.length) : 4, q.text);
    assert.strictEqual(c.filter(x => x.ok).length, 1, q.text);
    assert.strictEqual(new Set(c.map(x => x.v)).size, c.length, q.text);
    ok++;
  }
  assert(ok > 300);
});
test('chaque question a un palier 1, 2 ou 3', () => {
  for (const lv of Object.keys(data.levels)) for (const q of T.questionsOf(lv, T.MIX.id)) assert([1, 2, 3].includes(q.d), q.text);
});
test('tirage adaptatif : un élève en difficulté reçoit surtout le palier 1', () => {
  const lv = '5eme', cat = 'Relatifs : addition';
  T.store.d.stats = { [lv]: { [cat]: { t: 10, c: 2, r: '0010000100' } } };
  assert.strictEqual(T.targetTier(lv, cat), 1);
  const pool = T.questionsOf(lv, T.MIX.id).filter(q => q.category === cat);
  const qs = T.pickQuestions(pool, 6, [], lv);
  const avg = qs.reduce((s, q) => s + q.d, 0) / qs.length;
  assert(avg <= 1.7, 'palier moyen ' + avg);
  T.store.d.stats = { [lv]: { [cat]: { t: 20, c: 19, r: '1111111111' } } };
  assert.strictEqual(T.targetTier(lv, cat), 3);
});
test('révisions espacées : une notion ratée revient demain, une notion réussie plus tard', () => {
  T.store.d.srs = {};
  T.srsUpdate('6eme', { 'Tables': { t: 5, k: 1 }, 'Doubles': { t: 5, k: 5 } });
  const s = T.store.d.srs['6eme'];
  assert.strictEqual(s['Tables'].due, T.addDays(T.today(), 1));
  assert.strictEqual(s['Doubles'].b, 1);
  T.srsUpdate('6eme', { 'Doubles': { t: 4, k: 4 } });
  assert.strictEqual(s['Doubles'].due, T.addDays(T.today(), 3));
  s['Tables'].due = T.today();
  assert.deepStrictEqual([...T.dueNotions('6eme')], ['Tables']);
});
test('défi du jour : identique pour tous, différent le lendemain', () => {
  const a = T.dailyQuestions('6eme', '2026-10-23').map(q => q.text);
  const b = T.dailyQuestions('6eme', '2026-10-23').map(q => q.text);
  const c = T.dailyQuestions('6eme', '2026-10-24').map(q => q.text);
  assert.strictEqual(a.length, 10);
  assert.deepStrictEqual(a, b);
  assert.notDeepStrictEqual(a, c);
});
test('test de positionnement : 2 questions par chapitre', () => {
  for (const lv of Object.keys(data.levels)) {
    const qs = T.placementQuestions(lv);
    assert(qs.length >= data.chapters[lv].length, lv);
    assert(qs.every(q => q.chapter), lv);
  }
});
test('chrono : assez de questions courtes par niveau', () => {
  for (const lv of Object.keys(data.levels)) assert(T.sprintPool(lv).length > 100, lv);
});
test('fiches méthode : chaque chapitre a des notions avec exemples', () => {
  for (const lv of Object.keys(data.levels)) for (const ch of data.chapters[lv]) {
    const f = T.ficheOf(lv, ch.id);
    assert(f.length, ch.name);
    assert(f.every(x => x.ex.length >= 1), ch.name);
  }
});
test('lecture à voix haute des écritures mathématiques', () => {
  assert.strictEqual(T.speakable('7 × 8 = ?'), '7 fois 8 égale combien ?');
  assert.strictEqual(T.speakable('(−3) + 5'), 'moins 3 plus 5');
  assert.strictEqual(T.speakable('3/4 de 20'), '3 sur 4 de 20');
  assert.strictEqual(T.speakable('Aire 12 cm² ?'), 'Aire 12 centimètres carrés ?');
  assert.strictEqual(T.speakable('x² − 4'), 'x au carré moins 4');
  assert.strictEqual(T.speakable('15 est-il premier ?'), '15 est-il premier ?');
  assert.strictEqual(T.speakable('12 - 5'), '12 moins 5');
});

console.log(`${n} tests réussis${process.exitCode ? ', des échecs ci-dessus' : ''}.`);
