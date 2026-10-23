/* Données, progression, sélection des questions, écriture et vérification des réponses. */

const DATA = window.__MQ_DATA;

const LEVELS = {
  '6eme': { short: '6e', num: '6', name: 'Sixième', prog: 'Programme du cycle 3 en vigueur depuis la rentrée 2025 (BO n°16 du 17 avril 2025).' },
  '5eme': { short: '5e', num: '5', name: 'Cinquième', prog: 'Nouveau programme de 5e, en vigueur à la rentrée 2026 (BO n°10 du 5 mars 2026).' },
  '4eme': { short: '4e', num: '4', name: 'Quatrième', prog: 'Programme du cycle 4 de 2015 ajusté en 2020, jusqu’au nouveau programme de 4e prévu à la rentrée 2027.' },
  '3eme': { short: '3e', num: '3', name: 'Troisième', prog: 'Programme du cycle 4 de 2015 ajusté en 2020, jusqu’au nouveau programme de 3e prévu à la rentrée 2028. Prépare aussi aux automatismes du brevet.' },
};
const LEVEL_IDS = Object.keys(LEVELS);
const MIX = { id: 'melange', name: 'Toutes les notions' };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, w, ws) => `${n.toLocaleString('fr-FR')} ${n > 1 ? (ws || w + 's') : w}`;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dayKey();
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

/* ---------- Banque ---------- */
function chaptersOf(lv) {
  const own = DATA.chapters[lv] || [];
  const ent = DATA.entretien[lv];
  return ent ? [...own, ent] : own;
}
function chapterById(lv, id) {
  if (id === MIX.id) return MIX;
  return chaptersOf(lv).find(c => c.id === id);
}
function questionsOf(lv, chapterId) {
  const { own, entretien } = DATA.levels[lv];
  if (chapterId === MIX.id) return [...own, ...entretien];
  const ent = DATA.entretien[lv];
  if (ent && chapterId === ent.id) return entretien;
  const ch = (DATA.chapters[lv] || []).find(c => c.id === chapterId);
  return ch ? own.filter(q => ch.prefixes.some(p => q.category.startsWith(p))) : [];
}
const isEntretien = (lv, ch) => DATA.entretien[lv] && ch.id === DATA.entretien[lv].id;

/* ---------- Progression (navigateur uniquement) ---------- */
const store = {
  key: 'mathquest.v2',
  d: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { /* stockage indisponible */ }
    this.d = Object.assign({ level: '6eme', sound: true, xp: 0, days: { count: 0, last: null }, stats: {}, best: {}, names: ['', '', '', ''], duoMode: 'duel', duoLevel: null, duoChapter: MIX.id, duoPlayers: 3, prefs: {}, onboarded: false }, d || {});
    // Anciennes installations : on ne remontre pas l'accueil à un élève qui a déjà joué.
    if (!d || (!d.onboarded && d.stats && Object.keys(d.stats).length)) this.d.onboarded = !!(d && d.stats && Object.keys(d.stats).length);
    if (!LEVELS[this.d.level]) this.d.level = '6eme';
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.d)); } catch (e) { /* mode privé : la partie continue sans sauvegarde */ } },
  cats(lv) { return (this.d.stats[lv] ||= {}); },
  record(lv, category, ok) {
    const c = (this.cats(lv)[category] ||= { t: 0, c: 0 });
    c.t++; if (ok) c.c++;
    c.r = ((c.r || '') + (ok ? '1' : '0')).slice(-10); // 10 dernières réponses
  },
  touchDay() {
    const t = today(), d = this.d.days;
    if (d.last === t) return false;
    const y = yesterday();
    d.count = d.last === y ? d.count + 1 : 1;
    d.last = t;
    return true;
  },
  dayStreak() {
    const d = this.d.days; if (!d.last) return 0;
    const y = yesterday();
    return d.last === today() || d.last === y ? d.count : 0;
  },
};

/* Niveau du joueur : il faut 80 + 20 × n XP pour passer du niveau n au suivant. */
function xpLevel(xp) {
  let n = 1, need = 100, rest = xp;
  while (rest >= need) { rest -= need; n++; need = 80 + n * 20; }
  return { n, rest, need };
}

const MEDALS = [
  { id: 'bronze', label: 'Bronze', n: 10, r: .6 },
  { id: 'argent', label: 'Argent', n: 25, r: .75 },
  { id: 'or', label: 'Or', n: 50, r: .9 },
];
function chapterStats(lv, ch) {
  const cats = store.cats(lv);
  let t = 0, c = 0;
  const pool = ch.id === MIX.id ? null : questionsOf(lv, ch.id);
  const names = pool ? new Set(pool.map(q => q.category)) : null;
  for (const [k, v] of Object.entries(cats)) if (!names || names.has(k)) { t += v.t; c += v.c; }
  const rate = t ? c / t : 0;
  let medal = null; for (const m of MEDALS) if (t >= m.n && rate >= m.r) medal = m;
  const step = medal ? MEDALS.indexOf(medal) + 2 : t > 0 ? 1 : 0; // 0 à 4 cases pleines
  return { t, c, rate, medal, step };
}
function cellsHTML(step, total = 4, cls = '', started = step > 0) {
  let s = `<span class="cells ${cls}" aria-hidden="true">`;
  for (let i = 0; i < total; i++) s += `<i class="${i < step ? 'f' : i === step && started ? 'h' : ''}"></i>`;
  return s + '</span>';
}
function medalText(st) {
  if (st.medal) return `médaille ${st.medal.label.toLowerCase()}`;
  if (st.t) return `${Math.round(st.rate * 100)} % de réussite`;
  return 'pas encore commencé';
}

/* Notions faibles : au moins 3 réponses et moins de 60 % de réussite sur les réponses récentes. */
function weakCats(lv) {
  return Object.entries(store.cats(lv)).filter(([, v]) => v.t >= 3 && recentRate(v) < .6).map(([k]) => k);
}

/* Tirage équilibré : on fait tourner les notions, les notions faibles reviennent plus souvent,
   et chaque notion est servie au palier de l'élève (si lv est donné). */
function pickQuestions(pool, n, weak = [], lv = null) {
  if (!pool.length) return [];
  const by = new Map();
  for (const q of shuffle(pool)) { if (!by.has(q.category)) by.set(q.category, []); by.get(q.category).push(q); }
  if (lv) for (const [k, list] of by) by.set(k, orderByTier(list, targetTier(lv, k)));
  const weakSet = new Set(weak);
  const base = Math.max(1, Math.ceil(n * .15));
  const order = shuffle([...by.keys()]).sort((a, b) => weakSet.has(b) - weakSet.has(a));
  const used = new Map(), out = [];
  let moved = true;
  while (out.length < n && moved) {
    moved = false;
    for (const k of order) {
      if (out.length >= n) break;
      const cap = weakSet.has(k) ? base + 2 : base;
      if ((used.get(k) || 0) >= cap) continue;
      const list = by.get(k);
      if (!list.length) continue;
      out.push(list.pop()); used.set(k, (used.get(k) || 0) + 1); moved = true;
    }
  }
  // Peu de notions (série sur une notion, révisions) : on complète sans plafond, toujours au bon palier.
  moved = true;
  while (out.length < n && moved) {
    moved = false;
    for (const k of order) {
      if (out.length >= n) break;
      const list = by.get(k);
      if (list.length) { out.push(list.pop()); moved = true; }
    }
  }
  return shuffle(out);
}

/* ---------- Écriture mathématique ---------- */
function niceNumber(s) { return String(s).replace(/(\d)\.(\d)/g, '$1,$2').replace(/^-/, '−').replace(/\/-/, '/−'); }
function mathHTML(text) {
  return esc(String(text).replace(/ (?=[=≈:?;!»])/g, ' ').replace(/« /g, '« ')).replace(/(^|[^\w\/,.])(−?\d+(?:,\d+)?|\?)\/(\d+(?:,\d+)?|\?)(?![\w\/])/g,
    (m, pre, a, b) => `${pre}<span class="frac" role="math" aria-label="${a} sur ${b}"><span>${a}</span><span>${b}</span></span>`);
}
function answerHTML(answer, isChoice) { return mathHTML(isChoice ? answer : niceNumber(answer)); }
function promptOf(q) {
  const t = q.text;
  if (q.options || /[?…:]\s*$/.test(t) || /\?/.test(t)) return t;
  const m = t.match(/^(.*?)(\s\([a-zà-ÿ' ]+\))$/i);
  return m ? `${m[1]} = ?${m[2]}` : `${t} = ?`;
}

/* ---------- Vérification ---------- */
function toNumber(s) {
  const t = String(s).replace(/\s/g, '').replace(/−/g, '-').replace(/,/g, '.');
  if (!t) return NaN;
  const f = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (f) { const d = parseFloat(f[2]); return d === 0 ? NaN : parseFloat(f[1]) / d; }
  const p = t.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (p) return parseFloat(p[1]) / 100;
  return /^-?\d*\.?\d+$/.test(t) ? parseFloat(t) : NaN;
}
function isRight(input, answer, isChoice) {
  if (isChoice) return input.trim() === answer.trim();
  const a = toNumber(input), b = toNumber(answer);
  if (isNaN(a) || isNaN(b)) return false;
  const d = Math.abs(a - b);
  return d < 1e-9 || (d < .005 && d <= .015 * Math.abs(b));
}

/* Saisie au pavé : mêmes règles qu'à l'écrit (une virgule, une barre de fraction, un signe). */
const MAX_INPUT = 12;
function typeKey(v, k) {
  if (k === 'del') return v.slice(0, -1);
  if (k === 'sign') return v.startsWith('-') ? v.slice(1) : '-' + v;
  if (v.length >= MAX_INPUT) return v;
  if (k === ',') { const last = v.split('/').pop(); return last.includes(',') ? v : v + (last === '' || last === '-' ? '0,' : ','); }
  if (k === '/') return v.includes('/') || v === '' || v === '-' || v.endsWith(',') ? v : v + '/';
  if (/^\d$/.test(k) && (v === '0' || v === '-0' || /\/0$/.test(v))) return v.slice(0, -1) + k;
  return v + k;
}
const showInput = v => v.replace(/^-/, '−');

/* ---------- Choix pour les modes à deux ---------- */
function fmtLike(answer, x) {
  const dec = (String(answer).split(/[.,]/)[1] || '').length;
  let r = Number.isInteger(x) ? String(x) : String(+x.toFixed(Math.max(dec, 2)));
  return r.replace('.', ',').replace(/^-/, '−');
}
function choicesFor(q) {
  if (q.options) {
    const others = shuffle(q.options.filter(o => o !== q.answer)).slice(0, 3);
    return shuffle([q.answer, ...others]).map(o => ({ v: o, ok: o === q.answer }));
  }
  const ans = String(q.answer);
  const shown = niceNumber(ans);
  const cand = new Set();
  const frac = ans.match(/^(-?)(\d+)\/(\d+)$/);
  if (frac) {
    const s = frac[1] ? '−' : '', a = +frac[2], b = +frac[3];
    [[b, a], [a + 1, b], [a, b + 1], [Math.max(1, a - 1), b], [a + b, b], [a, b * 2]].forEach(([x, y]) => { if (x !== a || y !== b) cand.add(`${s}${x}/${y}`); });
  } else {
    const v = toNumber(ans);
    if (isNaN(v)) return null;
    const neg = v < 0 || /−|-/.test(q.text);
    const int = Number.isInteger(v);
    const steps = int ? (Math.abs(v) >= 100 ? [10, -10, 1, -1, 100, 2] : [1, -1, 2, -2, 10, -10]) : [.1, -.1, 1, -1, .01, -.5];
    for (const s of steps) cand.add(fmtLike(ans, +(v + s).toFixed(6)));
    cand.add(fmtLike(ans, +(v * 10).toFixed(6)));
    if (v !== 0) cand.add(fmtLike(ans, +(v / 10).toFixed(6)));
    if (v !== 0 && neg) cand.add(fmtLike(ans, -v));
    [...cand].forEach(c => { if (!neg && c.startsWith('−')) cand.delete(c); });
  }
  cand.delete(shown);
  const pool = [...cand].filter(c => !isRight(c, ans, false));
  const near = pool.slice(0, 4), far = pool.slice(4);
  const picks = shuffle(near).slice(0, 2).concat(shuffle(far).slice(0, 1));
  while (picks.length < 3 && pool.length > picks.length) { const c = pool.find(p => !picks.includes(p)); if (!c) break; picks.push(c); }
  if (picks.length < 3) return null;
  return shuffle([shown, ...picks]).map(o => ({ v: o, ok: o === shown }));
}
function duoPool(lv, chapterId) {
  return questionsOf(lv, chapterId).filter(q => !q.figure && q.text.length <= 70 && !(q.options && q.options.some(o => o.length > 22)));
}
