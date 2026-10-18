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
  return { data, report };
}
module.exports = { loadBank };
