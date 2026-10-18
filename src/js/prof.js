/* « Ma classe » côté élève (onglet Progrès) et Espace professeur (#/prof). */

const pct = r => r == null ? '–' : `${Math.round(r * 100)} %`;
const since = iso => {
  if (!iso) return 'jamais';
  const d = (Date.now() - new Date(iso)) / 864e5;
  return d < 1 ? 'aujourd’hui' : d < 2 ? 'hier' : `il y a ${Math.floor(d)} j`;
};
const notionRow = n => `<div class="notion"><span>${esc(n.category)}<small class="muted"> · ${LEVELS[n.level] ? LEVELS[n.level].short : ''} · ${plural(n.total, 'réponse')}</small></span><span class="bar" aria-hidden="true"><i style="width:${Math.round(n.rate * 100)}%"></i></span><span class="pct">${pct(n.rate)}</span></div>`;
const compRows = list => `<div class="notions">${list.map(c => `<div class="notion"><span>${c.name}${c.t ? `<small class="muted"> · ${plural(c.t, 'réponse')}</small>` : ''}</span><span class="bar" aria-hidden="true"><i style="width:${c.rate == null ? 0 : Math.round(c.rate * 100)}%"></i></span><span class="pct">${pct(c.rate)}</span></div>`).join('')}</div>`;

/* ---------- Élève : carte « Ma classe » ---------- */
let joinMsg = '', joinDraft = { code: '', name: '' }, profDraft = '';
function classCardHTML() {
  if (!cloudOn()) return '';
  const p = pupil();
  if (p) return `<section class="classcard" aria-labelledby="cc-t">
      <h2 id="cc-t" class="cond">Ma classe</h2>
      <p><b>${esc(p.name)}</b> · ${esc(p.class)}</p>
      <p class="muted">${p.pending.length ? `${plural(p.pending.length, 'série')} en attente d’envoi (pas de réseau).` : 'Tes résultats sont envoyés à ton professeur à la fin de chaque série.'}</p>
      <button class="link" data-act="cloud-leave">Ce n’est pas moi : changer d’élève</button>
    </section>`;
  return `<form class="classcard form-in" id="join-form" novalidate>
      <h2 class="cond">Rejoindre ma classe</h2>
      <p class="muted">Ton professeur te donne le code de la classe. Choisis un code secret de 4 chiffres et retiens-le : il te servira sur un autre appareil.</p>
      <div class="field"><label for="j-code">Code de la classe</label><input class="input" id="j-code" name="code" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ex. K7Q2XM" value="${esc(joinDraft.code)}" required></div>
      <div class="field"><label for="j-name">Prénom</label><input class="input" id="j-name" name="name" maxlength="24" autocomplete="off" placeholder="Ex. Inès" value="${esc(joinDraft.name)}" required></div>
      <div class="field"><label for="j-pin">Code secret (4 chiffres)</label><input class="input" id="j-pin" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required></div>
      ${joinMsg ? `<p class="msg" role="alert">${esc(joinMsg)}</p>` : ''}
      <button class="btn ink block" type="submit">Rejoindre</button>
    </form>`;
}

/* ---------- Professeur : session Supabase Auth ---------- */
const profAuth = () => store.d.prof || null;
async function profToken() {
  const a = profAuth(); if (!a) return null;
  if (Date.now() / 1000 > a.expires_at - 60) {
    try {
      const r = await sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: a.refresh_token } });
      store.d.prof = { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at || Date.now() / 1000 + r.expires_in, email: a.email };
      store.save();
    } catch (e) { if (!e.offline) { delete store.d.prof; store.save(); } throw e; }
  }
  return store.d.prof.access_token;
}
async function api(path, opts = {}) { return sb(path, { ...opts, token: await profToken() }); }
async function apiAll(path) { // PostgREST renvoie 1 000 lignes au plus par requête
  const out = [];
  for (let off = 0; ; off += 1000) {
    const rows = await api(`${path}${path.includes('?') ? '&' : '?'}limit=1000&offset=${off}`);
    out.push(...rows); if (rows.length < 1000) return out;
  }
}

/* État de l'écran prof : la vue se dessine depuis cet état, les chargements le complètent. */
const P = { key: '', loading: false, error: '', msg: '', classes: null, students: null, stats: null, sessions: null, signup: false };
function profKey() { return `${route.cls || ''}/${route.stu || ''}`; }
async function profLoad(force) {
  const key = profKey();
  if (!profAuth() || (!force && P.key === key) || P.loading) return;
  P.key = key; P.loading = true; P.error = ''; render();
  try {
    P.classes = await api('/rest/v1/classes?select=id,name,level,code,created_at&order=created_at.desc');
    P.students = await apiAll('/rest/v1/students?select=id,class_id,name,last_seen,created_at&order=name');
    P.stats = null; P.sessions = null;
    if (route.cls) {
      const ids = P.students.filter(s => s.class_id === route.cls).map(s => s.id);
      P.stats = ids.length ? await apiAll(`/rest/v1/notion_stats?select=student_id,level,category,total,correct,last_at&student_id=in.(${ids.join(',')})`) : [];
    }
    if (route.stu) P.sessions = await api(`/rest/v1/sessions?select=played_at,level,chapter,mode,score,total,seconds&student_id=eq.${route.stu}&order=played_at.desc&limit=20`);
  } catch (e) { P.error = e.offline ? e.message : e.status === 401 ? 'Ta session a expiré : reconnecte-toi.' : e.message; if (e.status === 401) { delete store.d.prof; store.save(); } }
  P.loading = false; render();
}

function profView() {
  if (!cloudOn()) return `${topBar()}<div class="layout"><div class="main"><div class="sec"><h2>Espace professeur</h2></div><p class="note">Le suivi des élèves n’est pas encore configuré. Suivez la section « Suivi des élèves » du README pour relier MathQuest à Supabase.</p></div></div>`;
  if (!profAuth()) return `${topBar()}<div class="layout"><div class="side">
      <section class="drop" aria-labelledby="pf-t"><h1 id="pf-t" style="--tw:9">Espace prof</h1><p>Créez vos classes, donnez le code aux élèves et suivez leurs points forts, leurs points faibles et les compétences à travailler.</p></section></div>
    <div class="main"><form class="form classcard" id="prof-form" novalidate>
      <h2 class="cond">${P.signup ? 'Créer un compte professeur' : 'Connexion'}</h2>
      <div class="field"><label for="p-mail">Adresse e-mail</label><input class="input" id="p-mail" name="email" type="email" autocomplete="username" value="${esc(profDraft)}" required></div>
      <div class="field"><label for="p-pass">Mot de passe${P.signup ? ' (8 caractères au moins)' : ''}</label><input class="input" id="p-pass" name="password" type="password" autocomplete="${P.signup ? 'new-password' : 'current-password'}" minlength="8" required></div>
      ${P.error ? `<p class="msg" role="alert">${esc(P.error)}</p>` : ''}${P.msg ? `<p class="okmsg" role="status">${esc(P.msg)}</p>` : ''}
      <button class="btn ink block" type="submit">${P.signup ? 'Créer le compte' : 'Se connecter'}</button>
      <button class="link" type="button" data-act="prof-toggle">${P.signup ? 'J’ai déjà un compte' : 'Première fois ? Créer un compte'}</button>
    </form></div></div>`;
  profLoad();
  const head = `${topBar()}`;
  if (P.loading && !P.classes) return `${head}<div class="layout"><div class="main"><p class="note">Chargement…</p></div></div>`;
  const err = P.error ? `<p class="msg" role="alert">${esc(P.error)}</p>` : '';
  if (route.stu) return head + profStudentView(err);
  if (route.cls) return head + profClassView(err);
  return head + profHomeView(err);
}

function profHomeView(err) {
  const cls = P.classes || [], stu = P.students || [];
  return `<div class="layout"><div class="side">
      <section class="drop slim" aria-labelledby="pf-t"><h1 id="pf-t" style="--tw:9">Mes classes</h1><p>${plural(cls.length, 'classe')}, ${plural(stu.length, 'élève')} inscrit${stu.length > 1 ? 's' : ''}.</p>
        <div class="actions"><button class="btn line" data-act="prof-logout">Se déconnecter</button></div></section>
    </div><div class="main">
      ${err}
      <div class="sec"><h2>Classes</h2></div>
      ${cls.length ? `<div class="rows">${cls.map(c => { const n = stu.filter(s => s.class_id === c.id).length;
        return `<button class="row" data-go="#/prof/${c.id}"><div><div class="n">${esc(c.name)}</div><div class="s">${LEVELS[c.level].short} · ${plural(n, 'élève')} · code <b>${c.code}</b></div></div>${icon('next')}</button>`; }).join('')}</div>`
        : '<p class="note">Aucune classe pour l’instant. Créez-en une ci-dessous : MathQuest vous donnera un code à transmettre aux élèves.</p>'}
      <form class="form classcard" id="class-form" novalidate style="margin-top:24px">
        <h2 class="cond">Nouvelle classe</h2>
        <div class="field"><label for="c-name">Nom</label><input class="input" id="c-name" name="name" maxlength="40" placeholder="Ex. 5e B" required></div>
        <div class="field"><label for="c-level">Niveau</label><select class="select" id="c-level" name="level">${LEVEL_IDS.map(l => `<option value="${l}">${LEVELS[l].name}</option>`).join('')}</select></div>
        <button class="btn ink block" type="submit">Créer la classe</button>
      </form>
    </div></div>`;
}

function rowsFor(ids) { return (P.stats || []).filter(r => ids.includes(r.student_id)); }
function profClassView(err) {
  const c = (P.classes || []).find(x => x.id === route.cls);
  if (!c) return `<div class="layout"><div class="main">${err}<p class="note">Classe introuvable.</p><button class="back" data-go="#/prof">${icon('back', 'sm')} Mes classes</button></div></div>`;
  const stu = (P.students || []).filter(s => s.class_id === c.id);
  const per = stu.map(s => ({ s, a: analyse(rowsFor([s.id])) }));
  // Notions de la classe : on additionne les compteurs de tous les élèves.
  const agg = {};
  for (const r of P.stats || []) { const k = `${r.level}|${r.category}`; const x = (agg[k] ||= { level: r.level, category: r.category, total: 0, correct: 0 }); x.total += r.total; x.correct += r.correct; }
  const all = analyse(Object.values(agg));
  const toRework = all.notions.filter(n => n.total >= 10 && n.rate < .7).sort((a, b) => a.rate - b.rate).slice(0, 8);
  const follow = per.filter(x => x.a.total >= 20 && x.a.rate < .5);
  return `<div class="layout"><div class="side">
      <button class="back" data-go="#/prof">${icon('back', 'sm')} Mes classes</button>
      <section class="drop" aria-labelledby="cl-t"><div class="num" aria-hidden="true">${LEVELS[c.level].num}<sup>e</sup></div>
        <h1 id="cl-t" style="--tw:${Math.max(7, c.name.length)}">${esc(c.name)}</h1>
        <p>Code à donner aux élèves :</p><p class="classcode">${c.code}</p>
        <p>${plural(stu.length, 'élève')} · ${plural(all.total, 'réponse')} · ${pct(all.rate)} de réussite</p>
      </section>
      <div class="sec"><h2>Compétences de la classe</h2></div>${compRows(all.competences)}
      <p class="note">Estimation à partir des automatismes travaillés : chaque notion est rattachée à l’une des six compétences du cycle 4.</p>
    </div><div class="main">${err}
      <div class="sec"><h2>À retravailler en classe</h2></div>
      ${toRework.length ? `<div class="notions">${toRework.map(notionRow).join('')}</div>` : '<p class="note">Pas encore assez de réponses : une notion apparaît ici avec au moins 10 réponses de la classe et moins de 70 % de réussite.</p>'}
      ${follow.length ? `<div class="sec"><h2>Élèves à accompagner</h2></div><p class="note" style="margin-top:0">${follow.map(x => esc(x.s.name)).join(', ')} : moins de 50 % de réussite sur au moins 20 réponses.</p>` : ''}
      <div class="sec"><h2>Élèves</h2><span class="muted" style="font-size:13px">réussite · dernière activité</span></div>
      ${stu.length ? `<div class="rows">${per.map(({ s, a }) => `<button class="row" data-go="#/prof/${c.id}/${s.id}"><div><div class="n">${esc(s.name)}</div>
          <div class="s">${a.total ? `${plural(a.total, 'réponse')} · ${pct(a.rate)}` : 'pas encore de réponse'} · ${since(s.last_seen)}${a.weak.length ? ` · à travailler : ${esc(a.weak.slice(0, 2).map(w => w.category).join(', '))}` : ''}</div></div>${icon('next')}</button>`).join('')}</div>`
        : '<p class="note">Aucun élève inscrit. Projetez le code ci-contre : chaque élève l’entre dans Progrès → Rejoindre ma classe, avec son prénom et un code secret à 4 chiffres.</p>'}
      <div class="note"><button class="danger" data-act="class-del">Supprimer la classe et ses résultats</button></div>
    </div></div>`;
}

function profStudentView(err) {
  const s = (P.students || []).find(x => x.id === route.stu);
  const c = s && (P.classes || []).find(x => x.id === s.class_id);
  if (!s || !c) return `<div class="layout"><div class="main">${err}<p class="note">Élève introuvable.</p><button class="back" data-go="#/prof">${icon('back', 'sm')} Mes classes</button></div></div>`;
  const a = analyse(rowsFor([s.id]));
  const ses = P.sessions || [];
  return `<div class="layout"><div class="side">
      <button class="back" data-go="#/prof/${c.id}">${icon('back', 'sm')} ${esc(c.name)}</button>
      <section class="drop slim" aria-labelledby="st-t"><h1 id="st-t" style="--tw:${Math.max(7, s.name.length)}">${esc(s.name)}</h1>
        <p>${a.total ? `${plural(a.total, 'réponse')}, ${pct(a.rate)} de réussite.` : 'Pas encore de réponse.'} Dernière activité : ${since(s.last_seen)}.</p></section>
      <div class="sec"><h2>Compétences</h2></div>${compRows(a.competences)}
      <div class="bottom-actions"><button class="btn line block" data-act="stu-pin">Donner un nouveau code secret</button><button class="danger" data-act="stu-del">Retirer l’élève de la classe</button></div>
    </div><div class="main">${err}
      <div class="sec"><h2>Points forts</h2></div>
      ${a.strong.length ? `<div class="notions">${a.strong.map(notionRow).join('')}</div>` : '<p class="note">Une notion apparaît ici à partir de 5 réponses et 80 % de réussite.</p>'}
      <div class="sec"><h2>Points faibles</h2></div>
      ${a.weak.length ? `<div class="notions">${a.weak.map(notionRow).join('')}</div>` : '<p class="note">Aucun pour l’instant (moins de 60 % après au moins 3 réponses).</p>'}
      <div class="sec"><h2>Dernières séries</h2></div>
      ${ses.length ? `<table class="ledger"><thead><tr><th>Date</th><th>Série</th><th>Score</th></tr></thead><tbody>${ses.map(x => `<tr><td>${new Date(x.played_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td><td class="q">${esc(x.chapter)} · ${x.mode === 'exam' ? 'examen' : 'entraînement'}</td><td>${x.score}/${x.total}</td></tr>`).join('')}</tbody></table>` : '<p class="note">Aucune série enregistrée.</p>'}
      <div class="sec"><h2>Toutes les notions</h2></div>
      ${a.notions.length ? `<div class="notions">${[...a.notions].sort((x, y) => x.rate - y.rate).map(notionRow).join('')}</div>` : ''}
    </div></div>`;
}

/* ---------- Événements ---------- */
const AUTH_ERRORS = {
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  email_not_confirmed: 'Confirmez d’abord votre adresse : cliquez sur le lien reçu par e-mail.',
  user_already_exists: 'Un compte existe déjà avec cette adresse : connectez-vous.',
  weak_password: 'Mot de passe trop faible : 8 caractères au moins.',
  over_email_send_rate_limit: 'Trop de demandes : réessayez dans une heure.',
};
app.addEventListener('submit', async e => {
  const f = e.target; e.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  const btn = f.querySelector('[type="submit"]'); if (btn) btn.disabled = true;
  try {
    if (f.id === 'join-form') {
      joinMsg = ''; joinDraft = { code: v.code || '', name: v.name || '' };
      if (!/^\d{4}$/.test(v.pin || '')) throw new Error(JOIN_ERRORS.PIN_FORMAT);
      await cloudJoin(v.code, v.name, v.pin);
      toast(`Bienvenue ${store.d.cloud.name} : tes résultats seront envoyés à ton professeur.`, 'check');
    }
    if (f.id === 'prof-form') {
      P.error = ''; P.msg = ''; profDraft = v.email || '';
      if (P.signup) {
        const r = await sb('/auth/v1/signup', { method: 'POST', body: { email: v.email, password: v.password } });
        if (r.access_token) store.d.prof = { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at || Date.now() / 1000 + r.expires_in, email: v.email };
        else { P.signup = false; P.msg = 'Compte créé. Ouvrez l’e-mail de confirmation, puis connectez-vous ici.'; }
      } else {
        const r = await sb('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: v.email, password: v.password } });
        store.d.prof = { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: r.expires_at || Date.now() / 1000 + r.expires_in, email: v.email };
      }
      store.save(); P.key = '';
    }
    if (f.id === 'class-form') {
      if (!v.name.trim()) throw new Error('Donnez un nom à la classe.');
      await api('/rest/v1/classes', { method: 'POST', body: { name: v.name.trim(), level: v.level }, prefer: 'return=minimal' });
      toast('Classe créée', 'check'); P.key = ''; profLoad(true);
    }
  } catch (err) {
    const m = AUTH_ERRORS[err.code] || err.message;
    if (f.id === 'join-form') joinMsg = m; else P.error = m;
  }
  render();
});

app.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act;
  if (act === 'cloud-leave' && await confirmSheet('Changer d’élève ?', 'Cet appareil ne sera plus relié à ta classe. Tes résultats déjà envoyés restent chez ton professeur.', 'Changer', 'Annuler')) { cloudLeave(); store.d.stats = {}; store.save(); render(); }
  if (act === 'prof-toggle') { P.signup = !P.signup; P.error = ''; P.msg = ''; render(); }
  if (act === 'prof-logout') { delete store.d.prof; store.save(); Object.assign(P, { key: '', classes: null, students: null, stats: null }); render(); }
  if (act === 'class-del') {
    const c = P.classes.find(x => x.id === route.cls);
    if (await confirmSheet(`Supprimer ${c.name} ?`, 'Les élèves inscrits et tous leurs résultats seront effacés définitivement.', 'Supprimer', 'Annuler')) {
      try { await api(`/rest/v1/classes?id=eq.${c.id}`, { method: 'DELETE' }); toast('Classe supprimée', 'check'); go('#/prof'); profLoad(true); } catch (err) { P.error = err.message; render(); }
    }
  }
  if (act === 'stu-del') {
    const s = P.students.find(x => x.id === route.stu);
    if (await confirmSheet(`Retirer ${s.name} ?`, 'Ses résultats seront effacés définitivement.', 'Retirer', 'Annuler')) {
      try { await api(`/rest/v1/students?id=eq.${s.id}`, { method: 'DELETE' }); toast('Élève retiré', 'check'); go(`#/prof/${s.class_id}`); profLoad(true); } catch (err) { P.error = err.message; render(); }
    }
  }
  if (act === 'stu-pin') {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const s = P.students.find(x => x.id === route.stu);
    if (await confirmSheet(`Nouveau code : ${pin}`, `Donnez ce code à ${s.name}. L’ancien ne fonctionnera plus et l’élève devra se reconnecter.`, 'Valider ce code', 'Annuler')) {
      try { const r = await rpc('mq_reset_pin', { p_student: s.id, p_pin: pin }, await profToken()); if (r.error) throw new Error('Action refusée.'); toast(`Code de ${s.name} : ${pin}`, 'check'); } catch (err) { P.error = err.message; render(); }
    }
  }
});
