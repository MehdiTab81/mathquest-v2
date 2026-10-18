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
      <button class="icon-btn" data-act="sound" aria-label="${store.d.sound ? 'Couper le son' : 'Activer le son'}" aria-pressed="${!store.d.sound}">${icon(store.d.sound ? 'sound' : 'mute')}</button>
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
    ['exam', 'timer', 'Examen 9 minutes', '20 questions chronométrées, correction complète à la fin.', ''],
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
        <div class="actions">${cellsHTML(st.step, 4, 'lg')}</div>
      </section>
    </div>
    <div class="main">
      <div class="sec"><h2>Choisis ton mode</h2></div>
      <div class="modes">
        ${modes.map(([m, ic, t, s, tag]) => `<button class="mode" ${m === 'duel' || m === 'battle' ? `data-duo="${m}"` : `data-start="${m}"`} data-ch="${ch.id}">
          <span class="ico">${icon(ic)}</span><span><b>${t}</b><small>${s}</small></span>${tag ? `<span class="tag">${tag}</span>` : icon('next')}</button>`).join('')}
      </div>
      <div class="sec"><h2>Notions</h2><span class="muted" style="font-size:13px">ta réussite</span></div>
      <div class="notions">
        ${names.map(n => { const c = cats[n]; const p = c && c.t ? Math.round(c.c / c.t * 100) : null;
          return `<div class="notion"><span>${esc(n)}</span><span class="bar" aria-hidden="true"><i style="width:${p || 0}%"></i></span><span class="pct">${p == null ? '–' : p + ' %'}</span></div>`; }).join('')}
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
      <p class="note">Ta progression reste sur cet appareil, dans ce navigateur. Aucun compte, aucune donnée envoyée.</p>
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
  else if (route.tab === 'duo') html = duoView();
  else if (route.chapter) html = chapterView(route.chapter);
  else html = homeView();
  app.innerHTML = `<div class="shell">${html}</div>`;
  const titles = { home: 'Jouer', duo: 'À deux', progress: 'Progrès' };
  document.title = `MathQuest · ${route.chapter ? (chapterById(store.d.level, route.chapter) || {}).name || '' : titles[route.tab]}`;
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
