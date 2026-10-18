// Contrôle automatique de la banque : node tools/check-questions.cjs [niveau...]
// - recalcule les expressions purement numériques (×, ÷, +, −, parenthèses, puissances) ;
// - vérifie les QCM (réponse présente, options sans doublon) et les doublons de questions.
const path = require('path');
const { data } = require('./bank.cjs').loadBank();
const levels = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(data.levels);

const sup = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
const num = s => parseFloat(String(s).replace(/−/g, '-').replace(/,/g, '.').replace(/\s/g, ''));
function answerValue(a) {
  const t = String(a).replace(/−/g, '-').replace(/,/g, '.').replace(/\s/g, '');
  const f = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (f) return parseFloat(f[1]) / parseFloat(f[2]);
  return /^-?\d*\.?\d+$/.test(t) ? parseFloat(t) : NaN;
}
function evalExpr(text) {
  let e = text.replace(/\s*=\s*\?\s*$/, '').replace(/\s*\?\s*$/, '').trim();
  if (!/^[\d\s,.()+\-−×÷*/:²³⁰¹⁴⁵⁶⁷⁸⁹⁻^]+$/.test(e) || !/\d/.test(e)) return null;
  if (/:/.test(e)) e = e.replace(/:/g, '÷');
  e = e.replace(/(\d)\s+(?=\d{3}\b)/g, '$1') // espaces de milliers
    .replace(/−/g, '-').replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/')
    .replace(/([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, m => '**(' + [...m].map(c => sup[c]).join('') + ')')
    .replace(/\^/g, '**');
  if (!/^[\d\s.()+\-*/]+$/.test(e)) return null;
  try { const v = Function(`"use strict";return (${e});`)(); return Number.isFinite(v) ? v : null; } catch (x) { return null; }
}

const issues = []; let checked = 0;
for (const lv of levels) {
  const seen = new Map();
  for (const [part, list] of Object.entries(data.levels[lv])) {
    for (const q of list) {
      const where = `${lv}/${part} | ${q.category} | ${q.text}`;
      const key = `${q.category}|${q.text}`;
      if (seen.has(key) && seen.get(key) !== q.answer) issues.push(`DOUBLON CONTRADICTOIRE ${where} : ${seen.get(key)} / ${q.answer}`);
      seen.set(key, q.answer);
      if (q.options) {
        if (!q.options.includes(q.answer)) issues.push(`QCM SANS LA RÉPONSE ${where} -> ${q.answer}`);
        if (new Set(q.options).size !== q.options.length) issues.push(`QCM OPTIONS EN DOUBLE ${where}`);
        continue;
      }
      if (isNaN(answerValue(q.answer))) issues.push(`RÉPONSE NON NUMÉRIQUE SANS QCM ${where} -> ${q.answer}`);
      const v = evalExpr(q.text);
      if (v != null) { checked++;
        const a = answerValue(q.answer);
        if (!(Math.abs(v - a) < 1e-9 || Math.abs(v - a) <= 1e-6 * Math.abs(v))) issues.push(`CALCUL FAUX ${where} -> attendu ${v}, donné ${q.answer}`);
      }
    }
  }
}
console.log(issues.length ? issues.join('\n') : 'Aucun problème détecté.');
console.log(`\n${checked} calculs recalculés, ${issues.length} point(s) à revoir.`);
