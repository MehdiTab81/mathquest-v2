/* Suivi des élèves dans Supabase, sans bibliothèque : API REST + fonctions mq_* (voir supabase/schema.sql).
   Économie : un seul envoi par série (compteurs par notion + résumé), file d'attente si pas de réseau. */

const CLOUD = window.__MQ_CLOUD || { url: '', key: '' };
const cloudOn = () => !EMBED && !!(CLOUD.url && CLOUD.key);

async function sb(path, { method = 'GET', body, token, prefer } = {}) {
  const headers = { apikey: CLOUD.key, 'Content-Type': 'application/json' };
  // Les clés « legacy » sont des JWT ; les clés « publishable » ne se mettent que dans apikey.
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (CLOUD.key.startsWith('eyJ')) headers.Authorization = `Bearer ${CLOUD.key}`;
  if (prefer) headers.Prefer = prefer;
  let r;
  try {
    r = await fetch(CLOUD.url.replace(/\/+$/, '') + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    const err = new Error('Pas de connexion internet.'); err.offline = true; throw err;
  }
  const txt = await r.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
  if (!r.ok) {
    const err = new Error((data && (data.msg || data.message || data.error_description || data.error)) || `Erreur ${r.status}`);
    err.status = r.status; err.code = data && (data.error_code || data.code); throw err;
  }
  return data;
}
const rpc = (fn, args, token) => sb(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args, token });

/* ---------- Élève ---------- */
const JOIN_ERRORS = {
  PIN_FORMAT: 'Le code secret doit avoir 4 chiffres.',
  NOM_FORMAT: 'Écris ton prénom (24 caractères au plus).',
  CLASSE_INCONNUE: 'Ce code de classe n’existe pas. Vérifie-le avec ton professeur.',
  CLASSE_PLEINE: 'Cette classe est complète. Préviens ton professeur.',
  BLOQUE: 'Trop d’essais. Attends 10 minutes ou demande un nouveau code à ton professeur.',
  PIN_FAUX: 'Ce prénom existe déjà dans la classe avec un autre code. Si c’est toi, vérifie ton code ; sinon, ajoute l’initiale de ton nom.',
};
const pupil = () => store.d.cloud || null;

async function cloudJoin(code, name, pin) {
  const res = await rpc('mq_join', { p_code: code, p_name: name, p_pin: pin });
  if (res.error) throw new Error(JOIN_ERRORS[res.error] || 'Connexion impossible.');
  store.d.cloud = { token: res.token, name: res.name, class: res.class, level: res.level, pending: (store.d.cloud && store.d.cloud.pending) || [] };
  if (LEVELS[res.level]) store.d.level = res.level;
  store.save();
  // Même élève sur un autre appareil : on reprend sa progression enregistrée.
  const rows = await rpc('mq_my_stats', { p_token: res.token });
  if (rows && rows.length) {
    const stats = {};
    for (const r of rows) ((stats[r.level] ||= {})[r.category] = { t: r.total, c: r.correct });
    store.d.stats = stats;
  } else {
    // Première connexion : on envoie ce que l'élève a déjà fait sur cet appareil.
    for (const [lv, cats] of Object.entries(store.d.stats)) {
      const list = Object.entries(cats).map(([c, v]) => ({ c, t: v.t, k: v.c })).filter(x => x.t > 0);
      for (let i = 0; i < list.length; i += 100) store.d.cloud.pending.push({ level: lv, stats: list.slice(i, i + 100), session: null });
    }
  }
  store.save();
  cloudFlush();
}
function cloudLeave() { delete store.d.cloud; store.save(); }

/* Fin de série : compteurs par notion de cette série uniquement. */
function cloudRecordSession(s) {
  const p = pupil(); if (!cloudOn() || !p) return;
  const by = {};
  for (const l of s.log.filter(Boolean)) { const c = (by[l.q.category] ||= { c: l.q.category, t: 0, k: 0 }); c.t++; if (l.ok) c.k++; }
  const stats = Object.values(by); if (!stats.length) return;
  const good = stats.reduce((a, x) => a + x.k, 0);
  p.pending.push({ level: s.lv, stats, session: { chapter: s.chapter.name, mode: s.mode === 'exam' ? 'exam' : 'train', score: good, total: s.qs.length, seconds: Math.round((Date.now() - s.t0) / 1000) } });
  p.pending = p.pending.slice(-50); // au-delà, l'appareil est resté longtemps hors ligne : on garde le plus récent
  store.save();
  cloudFlush();
}

let flushing = false;
async function cloudFlush() {
  const p = pupil(); if (!cloudOn() || !p || flushing || !p.pending.length) return;
  flushing = true;
  try {
    while (p.pending.length) {
      const item = p.pending[0];
      const res = await rpc('mq_record', { p_token: p.token, p_level: item.level, p_stats: item.stats, p_session: item.session });
      if (res && res.error === 'SESSION_INVALIDE') { cloudLeave(); toast('Ton professeur a changé ton code : reconnecte-toi dans Progrès.', 'cross'); break; }
      p.pending.shift(); store.save();
    }
  } catch (e) { /* hors ligne : on réessaiera à la prochaine série ou au prochain lancement */ }
  flushing = false;
}

/* ---------- Analyse des réponses : savoir-faire et compétences ---------- */
/* Les six compétences du cycle 4, estimées à partir du type d'automatisme travaillé. */
const COMPETENCES = [
  ['Raisonner', /réciproque|contraposée|propriét|vrai ou faux|tester|égalité vraie|est-il|inégalité triangulaire|proportionnel \?|reconnaître/i],
  ['Représenter', /droite graduée|repérage|coordonnées|graphique|lecture|diagramme|tableau|figures?|patron|solide|section|espace|symétrie|transformation|translation|homothétie|angles et parallèles|parallélisme|cercle/i],
  ['Modéliser', /proportion|pourcent|échelle|vitesse|ratio|partage|mise en équation|probab|événement|formule|programme de calcul|en fonction|grandeurs composées|problème|fréquence|moyenne|médiane|étendue|statist|effectif|dénombrement/i],
  ['Chercher', /remonter|à trou|astucieux|ordre de grandeur|encadrer|mixte|motifs/i],
  ['Communiquer', /vocabulaire|nature|termes et facteurs|somme ou produit|écritures?|notation/i],
  ['Calculer', /./],
];
const competenceOf = cat => COMPETENCES.find(([, re]) => re.test(cat))[0];

/* rows : [{ level, category, total, correct }] */
function analyse(rows) {
  const notions = rows.filter(r => r.total > 0).map(r => ({ ...r, rate: r.correct / r.total }));
  const strong = notions.filter(n => n.total >= 5 && n.rate >= .8).sort((a, b) => b.rate - a.rate || b.total - a.total).slice(0, 5);
  const weak = notions.filter(n => n.total >= 3 && n.rate < .6).sort((a, b) => a.rate - b.rate || b.total - a.total).slice(0, 5);
  const comp = {};
  for (const n of notions) { const k = competenceOf(n.category); (comp[k] ||= { t: 0, c: 0 }); comp[k].t += n.total; comp[k].c += n.correct; }
  const competences = COMPETENCES.map(([k]) => ({ name: k, t: comp[k] ? comp[k].t : 0, rate: comp[k] && comp[k].t ? comp[k].c / comp[k].t : null }));
  const t = notions.reduce((a, n) => a + n.total, 0), c = notions.reduce((a, n) => a + n.correct, 0);
  return { notions, strong, weak, competences, total: t, rate: t ? c / t : null };
}
