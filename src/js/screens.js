/* Écrans principaux : Jouer (accueil d'un niveau), chapitre, Progrès, configuration À deux. */

const app = document.getElementById('app');
let route = { tab: 'home', chapter: null };

/* Dans un artefact claude.ai, la navigation reste en mémoire (pas d'ancre dans l'adresse). */
const EMBED = !!window.__MQ_EMBED;
let curHash = '';
function go(hash) {
  if (EMBED) { curHash = hash; render(); return; }
  if (location.hash !== hash) location.hash = hash; else render();
}
function parseRoute() {
  const h = decodeURIComponent((EMBED ? curHash : location.hash).replace(/^#\/?/, ''));
  const [a, b] = h.split('/');
  if (a === 'chapitre' && b) return { tab: 'home', chapter: b };
  if (a === 'a-deux') return { tab: 'duo' };
  if (a === 'progres') return { tab: 'progress' };
  if (a === 'reglages') return { tab: 'settings' };
  if (a === 'fiche' && b) return { tab: 'home', fiche: b };
  if (a === 'prof') { const [, , c] = h.split('/'); return { tab: 'prof', cls: b || null, stu: c || null }; }
  return { tab: 'home', chapter: null };
}

function setLevel(lv) {
  store.d.level = lv; store.save();
  document.documentElement.dataset.level = lv;
  render();
}

function topBar() {
  const L = xpLevel(store.d.xp), days = store.dayStreak();
  return `<header class="top">
    <div class="wordmark" aria-label="MathQuest">MATH<span>QUEST</span></div>
    <nav class="tabs" aria-label="Navigation principale">
      ${[['home', 'play', 'Jouer', '#/'], ['duo', 'duo', 'À deux', '#/a-deux'], ['progress', 'chart', 'Progrès', '#/progres']].map(([id, ic, t, h]) =>
        `<button data-go="${h}" ${route.tab === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${t}</span></button>`).join('')}
    </nav>
    <div class="pills">
      <span class="pill" title="Ton niveau de joueur">Niv. ${L.n}</span>
      ${days ? `<span class="pill" title="Jours d'entraînement d'affilée">${icon('flame')}${days} j</span>` : ''}
      <button class="icon-btn" data-go="#/reglages" aria-label="Réglages et aménagements" ${route.tab === 'settings' ? 'aria-current="page"' : ''}>${icon('gear')}</button>
    </div>
  </header>`;
}
function levelSeg(current, attr = 'data-level-pick') {
  return `<div class="seg levels" role="tablist" aria-label="Niveau">${LEVEL_IDS.map(id =>
    `<button role="tab" ${attr}="${id}" aria-selected="${id === current}">${LEVELS[id].short}</button>`).join('')}</div>`;
}
const tw = name => `style="--tw:${Math.max(7, ...String(name).split(/\s+/).map(w => w.length))}"`;
const bigNum = lv => `<div class="num" aria-hidden="true">${LEVELS[lv].num}<sup>e</sup></div>`;

/* ---------- Jouer ---------- */
function recommend(lv) {
  const list = DATA.chapters[lv].map(ch => ({ ch, st: chapterStats(lv, ch) }));
  const started = list.filter(x => x.st.t > 0 && x.st.step < 4).sort((a, b) => a.st.rate - b.st.rate);
  return started[0] || list.find(x => x.st.t === 0) || list.sort((a, b) => a.st.rate - b.st.rate)[0];
}
function nextMedalLine(st) {
  const next = MEDALS.find(m => !(st.t >= m.n && st.rate >= m.r));
  if (!next) return 'Médaille d’or : garde le rythme avec une série d’entretien.';
  if (st.t < next.n) return `Encore ${plural(next.n - st.t, 'réponse')} pour viser la médaille ${next.label.toLowerCase()} (${Math.round(next.r * 100)} % de réussite).`;
  return `Passe à ${Math.round(next.r * 100)} % de réussite pour la médaille ${next.label.toLowerCase()} : tu es à ${Math.round(st.rate * 100)} %.`;
}
function homeView() {
  const lv = store.d.level, L = LEVELS[lv];
  const rec = recommend(lv), n = questionsOf(lv, rec.ch.id).length;
  const lead = rec.st.t ? `${nextMedalLine(rec.st)}` : `Nouveau chapitre : ${plural(n, 'question')}. Une série dure environ cinq minutes.`;
  const chs = chaptersOf(lv);
  return `${topBar()}${levelSeg(lv)}
  <div class="layout">
    <div class="side">
      <section class="drop" aria-labelledby="rec-title">
        ${bigNum(lv)}
        <h1 id="rec-title" ${tw(rec.ch.name)}>${esc(rec.ch.name)}</h1>
        <p>${esc(lead)}</p>
        <div class="actions">
          <button class="btn ink" data-start="train" data-ch="${rec.ch.id}">Lancer la série ${icon('next', 'sm')}</button>
          <button class="btn line" data-go="#/chapitre/${rec.ch.id}">Voir le chapitre</button>
        </div>
      </section>
    </div>
    <div class="main">
      ${todayHTML(lv)}
      <div class="sec"><h2>Chapitres de ${L.short}</h2><button class="link" data-start="train" data-ch="${MIX.id}">Tout mélanger</button></div>
      <div class="rows">
        ${chs.map(ch => {
          const st = chapterStats(lv, ch), cnt = questionsOf(lv, ch.id).length;
          return `<button class="row" data-go="#/chapitre/${ch.id}">
            <div><div class="n">${esc(ch.name)}</div><div class="s">${plural(cnt, 'question')} · ${medalText(st)}</div></div>
            ${cellsHTML(st.step)}</button>`;
        }).join('')}
      </div>
      ${legendHTML()}
      <p class="note">${esc(L.prog)}</p>
    </div>
  </div>`;
}
/* Aujourd'hui : devoirs, révisions espacées, défi du jour, chrono, positionnement. */
function todayHTML(lv) {
  const items = [];
  const p = pupil();
  const work = p && p.work ? p.work.filter(w => w.level === lv && !(p.done && p.done[w.id])) : [];
  for (const w of work.slice(0, 3)) {
    items.push(`<button class="mode hw" data-today="work:${w.id}"><span class="ico">${icon('calendar')}</span><span><b>Devoir : ${esc(w.title)}</b><small>${plural(w.n || 10, 'question')}${w.due ? ` · pour le ${new Date(w.due + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}</small></span>${icon('next')}</button>`);
  }
  const due = dueNotions(lv);
  items.push(`<button class="mode" data-today="review"><span class="ico">${icon('refresh')}</span><span><b>Révisions du jour</b><small>${due.length ? `${plural(due.length, 'notion')} à revoir aujourd’hui, juste avant de les oublier.` : 'À jour. Les notions travaillées reviendront ici au bon moment.'}</small></span>${due.length ? `<span class="badge">${due.length}</span>` : icon('check')}</button>`);
  const d = dailyState(lv);
  items.push(`<button class="mode" data-today="daily"><span class="ico">${icon('medal')}</span><span><b>Défi du jour</b><small>${d ? `Ton score : ${d.score}/10 en ${Math.round(d.ms / 1000)} s. Tu peux tenter de faire mieux.` : `10 questions, les mêmes pour tous les élèves de ${LEVELS[lv].short} aujourd’hui.`}</small></span>${d ? `<span class="badge">${d.score}/10</span>` : icon('next')}</button>`);
  const best = ((store.d.best || {}).sprint || {})[lv];
  items.push(`<button class="mode" data-today="sprint"><span class="ico">${icon('timer')}</span><span><b>Chrono ${Math.round((timed(60000) || 90000) / 1000)} secondes</b><small>Un maximum de bonnes réponses.${best ? ` Ton record : ${best}.` : ''}</small></span>${best ? `<span class="badge">${best}</span>` : icon('next')}</button>`);
  if (!(store.d.placed || {})[lv]) items.push(`<button class="mode" data-today="place"><span class="ico">${icon('chart')}</span><span><b>Test de positionnement</b><small>${placementQuestions(lv).length} questions sans chrono pour régler la difficulté à ton niveau.</small></span>${icon('next')}</button>`);
  return `<div class="sec"><h2>Aujourd’hui</h2></div><div class="modes today">${items.join('')}</div>`;
}

/* ---------- Fiche méthode d'un chapitre ---------- */
function ficheView(id) {
  const lv = store.d.level, ch = chapterById(lv, id);
  if (!ch) return homeView();
  const items = ficheOf(lv, id);
  const cats = store.cats(lv);
  return `${topBar()}
  <div class="layout"><div class="side">
    <button class="back" data-go="#/chapitre/${ch.id}">${icon('back', 'sm')} ${esc(ch.name)}</button>
    <section class="drop slim" aria-labelledby="fi-t"><h1 id="fi-t" ${tw('Fiche méthode')}>Fiche méthode</h1>
      <p>${esc(ch.name)} · ${LEVELS[lv].short}. Pour chaque notion : la méthode, puis des exemples corrigés.</p></section>
  </div><div class="main">
    <div class="fiches">${items.map(it => { const r = recentRate(cats[it.cat]);
      return `<article class="fiche">
        <header><h3>${esc(it.cat)}</h3>${r == null ? '' : `<span class="pct">${Math.round(r * 100)} %</span>`}</header>
        ${it.m ? `<p class="fm">${mathHTML(it.m)}</p>` : ''}
        ${it.ex.map(x => `<p class="fx"><span>${mathHTML(promptOf({ text: x.t, options: x.o ? [1] : null }))}</span><b>${answerHTML(x.a, !!x.o)}</b>${x.h && x.h !== it.m ? `<small>${mathHTML(x.h)}</small>` : ''}</p>`).join('')}
        <button class="link" data-notion="${esc(it.cat)}">S’entraîner sur cette notion</button>
      </article>`; }).join('')}</div>
  </div></div>`;
}

/* ---------- Trophées ---------- */
function trophiesHTML() {
  const got = store.d.trophies || {};
  const n = TROPHIES.filter(t => got[t.id]).length;
  return `<div class="sec"><h2>Trophées</h2><span class="muted" style="font-size:13px">${n}/${TROPHIES.length}</span></div>
    <div class="trophies">${TROPHIES.map(t => `<div class="trophy ${got[t.id] ? 'on' : ''}"><span class="ti">${icon(got[t.id] ? t.icon : 'lock')}</span><b>${t.name}</b><small>${t.how}</small></div>`).join('')}</div>`;
}

function legendHTML() {
  return `<div class="legend" aria-label="Lecture des cases"><span><i class="h"></i>Prochaine étape</span><span><i class="f"></i>Commencé</span><span><i class="f"></i><i class="f"></i>Bronze : 10 réponses, 60 %</span><span><i class="f"></i><i class="f"></i><i class="f"></i>Argent : 25, 75 %</span><span><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i>Or : 50, 90 %</span></div>`;
}

/* ---------- Chapitre ---------- */
function chapterView(id) {
  const lv = store.d.level, ch = chapterById(lv, id);
  if (!ch) return homeView();
  const pool = questionsOf(lv, id), st = chapterStats(lv, ch);
  const cats = store.cats(lv);
  const names = [...new Set(pool.map(q => q.category))];
  const touch = isTouch();
  const modes = [
    ['train', 'book', 'Entraînement', '20 questions. Après une erreur, tu vois la bonne réponse et la méthode.', ''],
    ['exam', 'timer', timed(9 * 60000) ? `Examen ${Math.round(timed(9 * 60000) / 60000)} minutes` : 'Examen sans chrono', timed(9 * 60000) ? '20 questions chronométrées, correction complète à la fin.' : '20 questions sans chronomètre, correction complète à la fin.', ''],
    ['duel', 'swords', 'Duel à deux', 'Face à face sur le même écran. Chaque point tire la corde vers toi.', touch ? '' : 'Tablette ou téléphone'],
    ['battle', 'crowd', 'Battle 2 à 4 joueurs', 'Tablette posée à plat. Le premier à 5 points gagne.', touch ? '' : 'Tablette ou téléphone'],
  ];
  return `${topBar()}
  <div class="layout">
    <div class="side">
      <button class="back" data-go="#/">${icon('back', 'sm')} Chapitres de ${LEVELS[lv].short}</button>
      <section class="drop" aria-labelledby="ch-title">
        ${bigNum(lv)}
        <h1 id="ch-title" ${tw(ch.name)}>${esc(ch.name)}</h1>
        <p>${LEVELS[lv].name} · ${plural(pool.length, 'question')}. ${st.t ? `${plural(st.t, 'réponse')}, ${Math.round(st.rate * 100)} % de réussite.` : 'Pas encore commencé.'} ${esc(nextMedalLine(st))}</p>
        <div class="actions">${cellsHTML(st.step, 4, 'lg')}<button class="btn line" data-go="#/fiche/${ch.id}">${icon('book', 'sm')} Fiche méthode</button></div>
      </section>
    </div>
    <div class="main">
      <div class="sec"><h2>Choisis ton mode</h2></div>
      <div class="modes">
        ${modes.map(([m, ic, t, s, tag]) => `<button class="mode" ${m === 'duel' || m === 'battle' ? `data-duo="${m}"` : `data-start="${m}"`} data-ch="${ch.id}">
          <span class="ico">${icon(ic)}</span><span><b>${t}</b><small>${s}</small></span>${tag ? `<span class="tag">${tag}</span>` : icon('next')}</button>`).join('')}
      </div>
      <div class="sec"><h2>Notions</h2><span class="muted" style="font-size:13px">touche une notion pour t’entraîner</span></div>
      <div class="notions">
        ${names.map(n => { const c = cats[n]; const r = recentRate(c); const p = r == null ? null : Math.round(r * 100); const tier = targetTier(lv, n);
          return `<button class="notion pick" data-notion="${esc(n)}"><span>${esc(n)}<small class="tier-txt">${TIER_NAMES[tier]}</small></span><span class="bar" aria-hidden="true"><i style="width:${p || 0}%"></i></span><span class="pct">${p == null ? '–' : p + ' %'}</span></button>`; }).join('')}
      </div>
      ${isEntretien(lv, ch) ? '<p class="note">Questions des années précédentes, pour garder les automatismes bien en place.</p>' : ''}
    </div>
  </div>`;
}

/* ---------- Progrès ---------- */
function progressView() {
  const lv = store.d.level, L = xpLevel(store.d.xp);
  const total = Object.values(store.d.stats).reduce((s, cats) => s + Object.values(cats).reduce((a, v) => a + v.t, 0), 0);
  const weak = weakCats(lv);
  const cats = store.cats(lv);
  return `${topBar()}${levelSeg(lv)}
  <div class="layout">
    <div class="side">
      ${classCardHTML()}
      <div class="kpis"><div><b>${L.n}</b><span>niveau de joueur</span></div><div><b>${store.dayStreak()}</b><span>jours d'affilée</span></div><div><b>${total.toLocaleString('fr-FR')}</b><span>réponses</span></div></div>
      <div class="xp"><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${L.need}" aria-valuenow="${L.rest}" aria-label="Expérience"><i style="width:${Math.round(L.rest / L.need * 100)}%"></i></div>
        <p>${L.rest} / ${L.need} XP avant le niveau ${L.n + 1}. Une bonne réponse rapporte 10 XP, une série d'affilée rapporte des bonus.</p></div>
      <div class="sec"><h2>À retravailler</h2></div>
      ${weak.length ? `<div class="notions">${weak.slice(0, 6).map(n => { const c = cats[n]; const p = Math.round(c.c / c.t * 100);
          return `<div class="notion"><span>${esc(n)}</span><span class="bar" aria-hidden="true"><i style="width:${p}%"></i></span><span class="pct">${p} %</span></div>`; }).join('')}</div>
        <div class="bottom-actions"><button class="btn ink block" data-start="weak">S'entraîner sur ces notions</button></div>`
        : `<p class="note">Rien à signaler en ${LEVELS[lv].short} : une notion apparaît ici quand tu as moins de 60 % de réussite après au moins trois questions.</p>`}
    </div>
    <div class="main">
      <div class="sec"><h2>Médailles de ${LEVELS[lv].short}</h2></div>
      <div class="rows">${chaptersOf(lv).map(ch => { const st = chapterStats(lv, ch);
        return `<button class="row" data-go="#/chapitre/${ch.id}"><div><div class="n">${esc(ch.name)}</div><div class="s">${st.t ? `${plural(st.t, 'réponse')} · ` : ''}${medalText(st)}</div></div>${cellsHTML(st.step)}</button>`; }).join('')}</div>
      ${legendHTML()}
      ${trophiesHTML()}
      <p class="note">${pupil() && cloudOn() ? 'Ta progression est enregistrée sur cet appareil et envoyée à ton professeur : ton prénom, ta réussite par notion et le résumé de tes séries. Rien d’autre.' : 'Ta progression reste sur cet appareil, dans ce navigateur. Aucun compte, aucune donnée envoyée.'}</p>
      ${cloudOn() ? '<div class="note"><button class="link" data-go="#/prof">Espace professeur</button></div>' : ''}
      <div class="note"><button class="danger" data-act="reset">Remettre à zéro la progression de ${LEVELS[lv].short}</button></div>
    </div>
  </div>`;
}

/* ---------- À deux ---------- */
let duoForce = false;
function duoView() {
  const d = store.d, lv = d.duoLevel || d.level, mode = d.duoMode;
  const n = mode === 'duel' ? 2 : d.duoPlayers;
  const chs = [MIX, ...chaptersOf(lv)];
  const chId = chs.some(c => c.id === d.duoChapter) ? d.duoChapter : MIX.id;
  const pool = duoPool(lv, chId);
  const touch = isTouch() || duoForce;
  return `${topBar()}
  <div class="layout">
    <div class="side">
      <section class="drop duo-hero" aria-labelledby="duo-title">
        <div class="num" aria-hidden="true">${mode === 'duel' ? '1v1' : n}</div>
        <h1 id="duo-title">${mode === 'duel' ? 'Duel' : 'Battle'}</h1>
        <p>${mode === 'duel' ? 'Posez le téléphone entre vous. Chaque bonne réponse pousse la ligne vers l’adversaire : le premier qui l’amène au bout gagne.' : 'Tablette posée à plat au milieu. Tout le monde répond en même temps, le premier juste marque. Premier à 5 points.'}</p>
      </section>
      ${touch ? '' : `<div class="warnbox" role="note">${icon('tablet')}<div><b>À jouer sur téléphone ou tablette</b><p>Ce mode se joue avec les doigts, l’écran posé à plat entre les joueurs. Ouvre MathQuest sur un téléphone ou une tablette pour lancer la partie.</p><button data-act="force-duo">Mon ordinateur a un écran tactile</button></div></div>`}
    </div>
    <div class="main">
      <div class="sec"><h2>Préparer la partie</h2></div>
      <div class="form">
        <div class="field"><span class="lab" id="lab-mode">Mode</span>
          <div class="seg" role="group" aria-labelledby="lab-mode"><button data-duo-mode="duel" aria-pressed="${mode === 'duel'}">Duel · 2</button><button data-duo-mode="battle" aria-pressed="${mode === 'battle'}">Battle · 2 à 4</button></div></div>
        ${mode === 'battle' ? `<div class="field"><span class="lab" id="lab-n">Joueurs</span><div class="seg" role="group" aria-labelledby="lab-n">${[2, 3, 4].map(k => `<button data-duo-n="${k}" aria-pressed="${n === k}">${k}</button>`).join('')}</div></div>` : ''}
        <div class="field"><span class="lab" id="lab-lv">Niveau</span>${levelSeg(lv, 'data-duo-level').replace('class="seg levels"', 'class="seg"').replace('aria-label="Niveau"', 'aria-labelledby="lab-lv"')}</div>
        <div class="field"><label for="duo-ch">Chapitre</label><select class="select" id="duo-ch">${chs.map(c => `<option value="${c.id}" ${c.id === chId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><span class="lab">Joueurs</span><div class="players">${Array.from({ length: n }, (_, i) =>
          `<div class="player"><span class="sw" style="background:var(--p${i + 1})" aria-hidden="true">${i + 1}</span><input class="input" maxlength="14" data-name="${i}" value="${esc(d.names[i] || '')}" placeholder="Joueur ${i + 1}" aria-label="Prénom du joueur ${i + 1}" autocomplete="off"></div>`).join('')}</div></div>
        <button class="btn ink block" data-act="duo-go" ${touch && pool.length >= 10 ? '' : 'disabled'}>${mode === 'duel' ? 'Lancer le duel' : 'Lancer la battle'} ${icon('next', 'sm')}</button>
        ${pool.length < 10 ? '<p class="note" style="margin:0">Ce chapitre a trop peu de questions courtes pour jouer à plusieurs. Choisis « Toutes les notions ».</p>' : ''}
      </div>
      <div class="sec"><h2>Règles</h2></div>
      <ul class="rules">
        <li>${icon('bolt')}<span>Même question pour tout le monde, quatre réponses au choix.</span></li>
        <li>${icon('cross')}<span>Une erreur et tu ne peux plus répondre à cette question : ne tape pas au hasard.</span></li>
        <li>${icon('flame')}<span>Trois bonnes réponses d'affilée : ton point compte double.</span></li>
        <li>${icon('timer')}<span>${mode === 'duel' ? '12' : '10'} secondes par question. Personne n'a trouvé ? La réponse s'affiche et on passe à la suivante.</span></li>
      </ul>
    </div>
  </div>`;
}

/* ---------- Rendu et événements ---------- */
function render() {
  route = parseRoute();
  document.documentElement.dataset.level = route.tab === 'duo' ? (store.d.duoLevel || store.d.level) : store.d.level;
  let html;
  if (route.tab === 'progress') html = progressView();
  else if (route.tab === 'prof') html = profView();
  else if (route.tab === 'settings') html = settingsView();
  else if (route.fiche) html = ficheView(route.fiche);
  else if (route.tab === 'duo') html = duoView();
  else if (route.chapter) html = chapterView(route.chapter);
  else html = homeView();
  app.innerHTML = `<div class="shell">${html}</div>`;
  const titles = { home: 'Jouer', duo: 'À deux', progress: 'Progrès', prof: 'Espace prof', settings: 'Réglages' };
  document.title = `MathQuest · ${route.fiche ? 'Fiche méthode' : route.chapter ? (chapterById(store.d.level, route.chapter) || {}).name || '' : titles[route.tab]}`;
}

app.addEventListener('click', async e => {
  const t = e.target.closest('button, [data-go]');
  if (!t) return;
  if (t.dataset.go) { go(t.dataset.go); window.scrollTo(0, 0); return; }
  if (t.dataset.levelPick) { setLevel(t.dataset.levelPick); return; }
  if (t.dataset.start) {
    const lv = store.d.level;
    if (t.dataset.start === 'weak') {
      const weak = new Set(weakCats(lv));
      const pool = questionsOf(lv, MIX.id).filter(q => weak.has(q.category));
      startSession({ lv, chapter: { id: 'weak', name: 'Notions à retravailler' }, mode: 'train', pool });
    } else {
      const ch = chapterById(lv, t.dataset.ch);
      startSession({ lv, chapter: ch, mode: t.dataset.start, pool: questionsOf(lv, ch.id) });
    }
    return;
  }
  if (t.dataset.today) {
    const lv = store.d.level, v = t.dataset.today;
    if (v === 'review') return startReview(lv);
    if (v === 'daily') return startDaily(lv);
    if (v === 'sprint') return startSprint(lv);
    if (v === 'place') return startPlacement(lv);
    if (v.startsWith('work:')) {
      const w = ((pupil() || {}).work || []).find(x => x.id === v.slice(5)); if (!w) return;
      let pool = w.chapter ? questionsOf(w.level, w.chapter) : questionsOf(w.level, MIX.id);
      if (w.categories && w.categories.length) pool = questionsOf(w.level, MIX.id).filter(q => w.categories.includes(q.category));
      return startSession({ lv: w.level, chapter: { id: 'work', name: w.title }, mode: 'homework', pool, n: w.n || 10, assignment: w.id });
    }
    return;
  }
  if (t.dataset.notion) {
    const lv = store.d.level, cat = t.dataset.notion;
    const pool = questionsOf(lv, MIX.id).filter(q => q.category === cat);
    return startSession({ lv, chapter: { id: 'notion', name: cat }, mode: 'train', pool, n: Math.min(10, Math.max(5, pool.length)) });
  }
  if (t.dataset.duo) { store.d.duoMode = t.dataset.duo; store.d.duoLevel = store.d.level; store.d.duoChapter = t.dataset.ch; store.save(); go('#/a-deux'); window.scrollTo(0, 0); return; }
  if (t.dataset.duoMode) { store.d.duoMode = t.dataset.duoMode; store.save(); render(); return; }
  if (t.dataset.duoN) { store.d.duoPlayers = +t.dataset.duoN; store.save(); render(); return; }
  if (t.dataset.duoLevel) { store.d.duoLevel = t.dataset.duoLevel; store.d.duoChapter = MIX.id; store.save(); render(); return; }
  const act = t.dataset.act;
  if (act === 'sound') { store.d.sound = !store.d.sound; store.save(); render(); if (store.d.sound) sfx.tap(); }
  if (act === 'force-duo') { duoForce = true; render(); }
  if (act === 'reset') {
    const lv = store.d.level;
    if (await confirmSheet('Tout effacer ?', `Les réponses et médailles de ${LEVELS[lv].short} seront supprimées de cet appareil. Ton niveau de joueur reste.`, 'Effacer', 'Annuler')) {
      delete store.d.stats[lv]; store.save(); render(); toast('Progression remise à zéro', 'refresh');
    }
  }
  if (act === 'duo-go') {
    const d = store.d, lv = d.duoLevel || d.level;
    const n = d.duoMode === 'duel' ? 2 : d.duoPlayers;
    startArena({ mode: d.duoMode, n, lv, pool: duoPool(lv, d.duoChapter), names: Array.from({ length: n }, (_, i) => (d.names[i] || '').trim() || `Joueur ${i + 1}`) });
  }
});
app.addEventListener('change', e => {
  if (e.target.id === 'duo-ch') { store.d.duoChapter = e.target.value; store.save(); render(); }
});
app.addEventListener('input', e => {
  const i = e.target.dataset.name;
  if (i != null) { store.d.names[+i] = e.target.value; store.save(); }
});
