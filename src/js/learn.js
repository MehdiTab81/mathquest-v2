/* Pédagogie : paliers adaptatifs, remédiation, révisions espacées, défi du jour,
   test de positionnement, fiches méthode et trophées. Tout est calculé sur l'appareil. */

const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };

/* ---------- Réussite récente et palier visé ---------- */
/* Pour adapter la difficulté, on regarde les 10 dernières réponses de la notion (sinon tout l'historique). */
function recentRate(c) {
  if (!c) return null;
  if (c.r && c.r.length >= 3) return [...c.r].filter(x => x === '1').length / c.r.length;
  return c.t ? c.c / c.t : null;
}
function targetTier(lv, cat) {
  const c = store.cats(lv)[cat];
  const r = recentRate(c);
  if (r == null || c.t < 3) return 1;
  if (r < .6) return 1;
  if (r < .85 || c.t < 8) return 2;
  return 3;
}
const TIER_NAMES = ['', 'Palier 1 · les bases', 'Palier 2 · confirmé', 'Palier 3 · expert'];

/* Tri d'une notion pour que le prochain tirage (pop) soit au bon palier. */
function orderByTier(list, tier) {
  return list.map(q => [q, Math.abs((q.d || 2) - tier) + Math.random() * .6])
    .sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

/* Question de rattrapage : même notion, autre question, palier égal ou plus simple. */
function sameNotion(q, pool, exclude) {
  const cands = pool.filter(x => x.category === q.category && !exclude.has(x) && x.text !== q.text);
  if (!cands.length) return null;
  const easier = cands.filter(x => (x.d || 2) <= (q.d || 2));
  const list = easier.length ? easier : cands;
  return list[Math.floor(Math.random() * list.length)];
}

/* ---------- Révisions espacées (boîtes de Leitner par notion) ---------- */
const SRS_DAYS = [1, 1, 3, 7, 14, 30];
function srsOf(lv) { return ((store.d.srs ||= {})[lv] ||= {}); }
function srsUpdate(lv, perCat) {
  const s = srsOf(lv);
  for (const [cat, x] of Object.entries(perCat)) {
    if (!x.t) continue;
    const e = s[cat] || { b: 0 };
    const r = x.k / x.t;
    if (r >= .8) e.b = Math.min(5, e.b + 1);
    else if (r < .6) e.b = 1;
    else e.b = Math.max(1, e.b);
    e.due = addDays(today(), SRS_DAYS[e.b]);
    s[cat] = e;
  }
}
function dueNotions(lv) {
  const t = today(), own = new Set(questionsOf(lv, MIX.id).map(q => q.category));
  return Object.entries(srsOf(lv)).filter(([cat, e]) => e.due <= t && own.has(cat))
    .sort((a, b) => a[1].b - b[1].b || (a[1].due < b[1].due ? -1 : 1)).map(([cat]) => cat);
}
function reviewPool(lv) {
  const due = new Set(dueNotions(lv).slice(0, 8));
  return { due: [...due], pool: questionsOf(lv, MIX.id).filter(q => due.has(q.category)) };
}

/* ---------- Défi du jour : les mêmes 10 questions pour tous les élèves d'un niveau ---------- */
function seeded(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) { h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function dailyQuestions(lv, day = today()) {
  const rnd = seeded(`${lv}|${day}`);
  const chs = DATA.chapters[lv];
  const out = [];
  for (const ch of chs) {
    const list = questionsOf(lv, ch.id).filter(q => (q.d || 2) <= 2);
    if (list.length) out.push(list[Math.floor(rnd() * list.length)]);
  }
  const all = questionsOf(lv, MIX.id).filter(q => !out.includes(q));
  while (out.length < 10 && all.length) out.push(all.splice(Math.floor(rnd() * all.length), 1)[0]);
  // ordre du jour, identique pour tous
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, 10);
}
function dailyState(lv) { const d = (store.d.daily ||= {})[lv]; return d && d.date === today() ? d : null; }

/* ---------- Chrono : questions courtes, sans figure ---------- */
function sprintPool(lv) {
  return questionsOf(lv, MIX.id).filter(q => !q.figure && promptOf(q).length <= 44 && (q.d || 2) <= 2 && !(q.options && q.options.some(o => o.length > 26)));
}

/* ---------- Test de positionnement : 2 questions par chapitre, palier 2 ---------- */
function placementQuestions(lv) {
  const out = [];
  for (const ch of DATA.chapters[lv]) {
    const pool = questionsOf(lv, ch.id);
    const cats = shuffle([...new Set(pool.map(q => q.category))]);
    for (const cat of cats.slice(0, 2)) {
      const list = pool.filter(q => q.category === cat);
      const mid = list.filter(q => (q.d || 2) === 2);
      const pick = (mid.length ? mid : list)[Math.floor(Math.random() * (mid.length || list.length))];
      out.push({ ...pick, chapter: ch.id });
    }
  }
  return out;
}

/* ---------- Fiches méthode ---------- */
function ficheOf(lv, chapterId) {
  const pool = questionsOf(lv, chapterId);
  const cats = [...new Set(pool.map(q => q.category))];
  const M = (DATA.methods && DATA.methods[lv]) || {};
  return cats.map(cat => ({ cat, m: M[cat] ? M[cat].m : null, ex: M[cat] ? M[cat].ex : [] }));
}
function methodFor(lv, q) {
  const M = DATA.methods && DATA.methods[lv] && DATA.methods[lv][q.category];
  return (M && M.m) || q.hint || null;
}

/* ---------- Compteurs et trophées ---------- */
function counts() { return (store.d.counts ||= { series: 0, perfect: 0, good: 0, sprint: 0, daily: 0, review: 0, placed: 0, duo: 0, streak: 0 }); }
function bump(key, n = 1) { const c = counts(); c[key] = (c[key] || 0) + n; }
function goldCount() {
  let g = 0;
  for (const lv of LEVEL_IDS) for (const ch of DATA.chapters[lv]) { const st = chapterStats(lv, ch); if (st.medal && st.medal.id === 'or') g++; }
  return g;
}
const TROPHIES = [
  { id: 'first', icon: 'play', name: 'Premier pas', how: 'Termine ta première série.', ok: c => c.series >= 1 },
  { id: 'placed', icon: 'chart', name: 'Point de départ', how: 'Fais un test de positionnement.', ok: c => c.placed >= 1 },
  { id: 'perfect', icon: 'check', name: 'Sans faute', how: 'Réussis une série d’entraînement sans erreur.', ok: c => c.perfect >= 1 },
  { id: 'perfect5', icon: 'check', name: 'Précision', how: 'Réussis 5 séries sans erreur.', ok: c => c.perfect >= 5 },
  { id: 'good100', icon: 'bolt', name: 'Centurion', how: 'Donne 100 bonnes réponses.', ok: c => c.good >= 100 },
  { id: 'good1000', icon: 'bolt', name: 'Mille réponses', how: 'Donne 1 000 bonnes réponses.', ok: c => c.good >= 1000 },
  { id: 'streak3', icon: 'flame', name: 'Régulier', how: 'Joue 3 jours d’affilée.', ok: c => c.streak >= 3 },
  { id: 'streak7', icon: 'flame', name: 'Une semaine', how: 'Joue 7 jours d’affilée.', ok: c => c.streak >= 7 },
  { id: 'streak30', icon: 'flame', name: 'Inarrêtable', how: 'Joue 30 jours d’affilée.', ok: c => c.streak >= 30 },
  { id: 'review10', icon: 'refresh', name: 'Bonne mémoire', how: 'Fais 10 séries de révisions du jour.', ok: c => c.review >= 10 },
  { id: 'daily5', icon: 'medal', name: 'Défi relevé', how: 'Termine 5 défis du jour.', ok: c => c.daily >= 5 },
  { id: 'sprint15', icon: 'timer', name: 'Éclair', how: '15 bonnes réponses en une manche de chrono.', ok: c => c.sprint >= 15 },
  { id: 'sprint25', icon: 'timer', name: 'Foudre', how: '25 bonnes réponses en une manche de chrono.', ok: c => c.sprint >= 25 },
  { id: 'gold', icon: 'medal', name: 'Or', how: 'Décroche une médaille d’or dans un chapitre.', ok: () => goldCount() >= 1 },
  { id: 'duo5', icon: 'swords', name: 'Duelliste', how: 'Joue 5 parties à plusieurs.', ok: c => c.duo >= 5 },
];
/* Vérifie les trophées et annonce les nouveaux. */
function checkTrophies() {
  const c = counts(); c.streak = Math.max(c.streak || 0, store.dayStreak());
  const got = (store.d.trophies ||= {});
  const fresh = TROPHIES.filter(t => !got[t.id] && t.ok(c));
  for (const t of fresh) got[t.id] = today();
  store.save();
  fresh.forEach((t, i) => setTimeout(() => toast(`Trophée débloqué : ${t.name}`, 'medal'), 900 + i * 2900));
  return fresh;
}
