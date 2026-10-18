// Assemble src/ en un seul index.html publiable sur GitHub Pages : node tools/build.cjs
// Avec un chemin en argument, écrit aussi la variante « artefact claude.ai » : node tools/build.cjs sortie.html
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const { data, report } = require('./bank.cjs').loadBank();
for (const r of report) if (r.removed || r.edited) console.log(`correction : ${r.removed} retirée(s), ${r.edited} modifiée(s) · ${r.why}`);

const order = ['core', 'kit', 'figures', 'screens', 'cloud', 'prof', 'session', 'duo', 'main'];
const cloud = JSON.parse(read('src/cloud-config.json'));
if (process.env.MQ_CLOUD_URL) Object.assign(cloud, { url: process.env.MQ_CLOUD_URL, key: process.env.MQ_CLOUD_KEY || 'test' }); // essais locaux
const js = order.map(f => `// ---- ${f}.js\n` + read(`src/js/${f}.js`)).join('\n');
const html = read('src/index.html')
  .replace('/*__CSS__*/', () => read('src/styles.css'))
  .replace('/*__CLOUD__*/null', () => JSON.stringify({ url: cloud.url || '', key: cloud.key || '' }))
  .replace('/*__DATA__*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'))
  .replace('/*__JS__*/', () => js);
fs.writeFileSync(path.join(root, 'index.html'), html);

// Variante artefact : sans squelette html/head/body (ajouté à la publication), navigation en mémoire.
const out = process.argv[2];
if (out) {
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
    .replace('window.__MQ_DATA =', () => 'window.__MQ_EMBED = true;\nwindow.__MQ_DATA =');
  const head = [
    '<title>MathQuest</title>',
    '<meta name="description" content="Automatismes de maths au collège, de la 6e à la 3e.">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">',
    '<style>', read('src/styles.css'), '</style>', '',
  ].join('\n');
  fs.writeFileSync(out, head + body);
  console.log(`artefact : ${out}`);
}
const n = Object.values(data.levels).reduce((s, l) => s + l.own.length + l.entretien.length, 0);
console.log(`index.html : ${(html.length / 1024).toFixed(0)} Ko, ${n} questions`);
