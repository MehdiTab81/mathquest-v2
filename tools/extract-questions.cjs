// Extrait la banque de questions de l'ancienne version compilée (legacy/index.html)
// et l'écrit dans src/data/questions.json. À lancer une seule fois : node tools/extract-questions.cjs
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'index.html'), 'utf8');
const start = html.indexOf('<script>(()=>{') + 8;
const end = html.lastIndexOf('</script>');
let code = html.slice(start, end).replace('var Xc=new Map;', 'globalThis.__MQ={Zc,Tg,eh,Ll,Pi};var Xc=new Map;');
const noop = () => {};
const el = () => new Proxy(noop, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : el()), apply: () => el(), construct: () => el() });
const ctx = { console, setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop, Math, JSON, Date, Intl, performance,
  window: undefined, document: el(), navigator: { userAgent: 'node' }, localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  matchMedia: () => ({ matches: false, addEventListener: noop }), requestAnimationFrame: noop, MessageChannel: class { constructor(){ this.port1={}; this.port2={postMessage(){}}; } }, queueMicrotask: noop };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
try { vm.runInContext(code, ctx); } catch (e) { /* le rendu React échoue sans DOM : sans importance */ }
const MQ = ctx.__MQ;
if (!MQ) throw new Error('Banque introuvable');
const out = { chapters: MQ.Zc, entretien: MQ.Tg, levels: {} };
const withHint = q => { const h = MQ.Pi(q); const { id, ...rest } = q; return h ? { ...rest, hint: h } : rest; };
for (const lv of ['6eme', '5eme', '4eme', '3eme']) { const b = MQ.eh(lv); out.levels[lv] = { own: b.own.map(withHint), entretien: b.entretien.map(withHint) }; }
fs.mkdirSync(path.join(__dirname, '..', 'src', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'questions.json'), JSON.stringify(out));
console.log(Object.entries(out.levels).map(([k, v]) => `${k}: ${v.own.length} + ${v.entretien.length}`).join('\n'));
process.exit(0);
