// Charge la banque de questions telle que l'appli la publie :
// banque extraite + compléments 5e 2026 + corrections de conformité du cycle 4.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const readJSON = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

function applyRule(rule, q) {
  if (rule.category && q.category !== rule.category) return 'keep';
  if (rule.textIncludes && !q.text.includes(rule.textIncludes)) return 'keep';
  if (rule.action === 'remove') return 'remove';
  if (rule.textRegex) q.text = q.text.replace(new RegExp(rule.textRegex[0]), rule.textRegex[1]);
  Object.assign(q, rule.set || {});
  return 'edited';
}

function loadBank() {
  const data = readJSON('src/data/questions.json');
  const extra = readJSON('src/data/complements-5e-2026.json');
  const seen = new Set(data.levels['5eme'].own.map(q => `${q.category}|${q.text}`));
  for (const q of extra.questions) if (!seen.has(`${q.category}|${q.text}`)) data.levels['5eme'].own.push(q);

  const { rules } = readJSON('src/data/corrections-cycle4.json');
  const report = rules.map(r => ({ why: r.why, removed: 0, edited: 0 }));
  for (const lv of Object.keys(data.levels)) {
    for (const part of ['own', 'entretien']) {
      data.levels[lv][part] = data.levels[lv][part].filter(q => {
        for (const [k, r] of rules.entries()) {
          if (!r.levels.includes(lv)) continue;
          const res = applyRule(r, q);
          if (res === 'remove') { report[k].removed++; return false; }
          if (res === 'edited') report[k].edited++;
        }
        return true;
      });
    }
  }
  enrich(data);
  return { data, report };
}

/* Palier de difficulté (1, 2 ou 3) de chaque question, relatif à sa notion :
   on estime la complexité (taille des nombres, décimaux, négatifs, fractions, longueur, étapes),
   puis on coupe chaque notion en trois tiers. */
function complexity(q) {
  const a = String(q.answer), t = q.text;
  const nums = t.match(/\d+(?:[,.]\d+)?/g) || [];
  let s = 0;
  s += Math.max(0, nums.length - 2) * 0.4;
  s += nums.reduce((m, n) => Math.max(m, n.replace(/\D/g, '').length), 0) * 0.25;
  s += a.replace(/\D/g, '').length * 0.15;
  if (/[,.]\d/.test(a) || nums.some(n => /[,.]/.test(n))) s += 1;
  if (/^-|^−/.test(a) || /\(−|\(-|^−/.test(t)) s += 0.8;
  if (/\//.test(a) || /\d\/\d/.test(t)) s += 0.6;
  if (/[²³⁻√^]/.test(t)) s += 0.6;
  if (/\d\s*[a-z]\b|[a-z]\s*[=+×−-]\s*\d/i.test(t) && !/\b(de|en|le|la|un|une)\b\s*\d/.test(t)) s += 0.4;
  if (t.length > 55) s += 0.6;
  if (q.figure) s += 0.3;
  if (q.options) s -= 0.6;
  return s;
}
function enrich(data) {
  data.methods = {};
  for (const lv of Object.keys(data.levels)) {
    const all = [...data.levels[lv].own, ...data.levels[lv].entretien];
    const byCat = new Map();
    for (const q of all) { if (!byCat.has(q.category)) byCat.set(q.category, []); byCat.get(q.category).push(q); }
    const methods = {};
    for (const [cat, list] of byCat) {
      const scores = list.map(complexity).sort((x, y) => x - y);
      const lo = scores[Math.floor(scores.length / 3)], hi = scores[Math.floor(scores.length * 2 / 3)];
      for (const q of list) {
        const s = complexity(q);
        q.d = scores[0] === scores[scores.length - 1] ? 2 : s < lo ? 1 : s <= hi && s < scores[scores.length - 1] ? 2 : 3;
        const tab = cat.startsWith('Tables') && q.text.match(/^(\d+) × (\d+)/);
        if (tab) { // tables : les produits « faciles » (×1, ×2, ×5, ×10) puis les redoutés (6 à 9 × 6 à 9)
          const [x, y] = [+tab[1], +tab[2]], easy = [1, 2, 5, 10], hard = n => n >= 6 && n <= 9;
          q.d = easy.includes(x) || easy.includes(y) ? 1 : (hard(x) && hard(y)) || x > 10 || y > 10 ? 3 : 2;
        }
      }
      // Fiche méthode : la méthode la plus fréquente de la notion et deux exemples corrigés.
      const count = new Map();
      for (const q of list) if (q.hint) count.set(q.hint, (count.get(q.hint) || 0) + 1);
      const top = [...count.entries()].sort((x, y) => y[1] - x[1])[0];
      const method = top && top[1] >= 2 ? top[0] : null;
      const ex = list.filter(q => q.hint && q.d <= 2 && q.hint !== method).slice(0, 2);
      if (ex.length < 2) ex.push(...list.filter(q => !ex.includes(q) && q.d <= 2).slice(0, 2 - ex.length));
      if (ex.length < 2) ex.push(...list.filter(q => !ex.includes(q)).slice(0, 2 - ex.length));
      methods[cat] = { m: method, ex: ex.map(q => ({ t: q.text, a: q.answer, h: q.hint || null, o: q.options ? 1 : 0 })) };
    }
    data.methods[lv] = methods;
  }
}
module.exports = { loadBank };
