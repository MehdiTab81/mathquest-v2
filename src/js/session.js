/* Séries en solo.
   train     Entraînement : correction et méthode après chaque erreur, coup de pouce, question de rattrapage.
   review    Révisions du jour : les notions dont la date de révision est arrivée (révisions espacées).
   homework  Devoir donné par le professeur : comme l'entraînement.
   exam      Examen : chronométré, correction à la fin.
   daily     Défi du jour : les mêmes 10 questions pour tous, correction à la fin.
   sprint    Chrono : un maximum de bonnes réponses en 60 secondes.
   place     Test de positionnement : 2 questions par chapitre, sans chrono, bilan par chapitre. */

const EXAM_MS = 9 * 60 * 1000, SPRINT_MS = 60 * 1000, MAX_REMEDY = 5;
const MODES = {
  train: { n: 20, feedback: true, help: true, remedy: true, label: 'Entraînement' },
  review: { n: 12, feedback: true, help: true, remedy: true, label: 'Révisions du jour' },
  homework: { n: 10, feedback: true, help: true, remedy: true, label: 'Devoir' },
  exam: { n: 20, feedback: false, clock: EXAM_MS, label: 'Examen' },
  daily: { feedback: false, label: 'Défi du jour' },
  place: { feedback: false, label: 'Test de positionnement' },
  sprint: { feedback: 'flash', clock: SPRINT_MS, stream: true, label: 'Chrono' },
};
let session = null;

function overlay(cls) {
  const el = document.createElement('div');
  el.className = cls;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  if (!(history.state && history.state.overlay)) history.pushState({ overlay: true }, '');
  return el;
}
function closeOverlay(el, keepHistory) {
  el.remove();
  document.body.style.overflow = '';
  stopSpeaking();
  if (!keepHistory && history.state && history.state.overlay) history.back();
}

/* opts : { lv, chapter, mode, pool, qs?, n?, assignment? } */
function startSession(opts) {
  const { lv, chapter, mode, pool } = opts;
  const M = MODES[mode] || MODES.train;
  let qs;
  if (opts.qs) qs = [...opts.qs];
  else if (M.stream) qs = [];
  else qs = pickQuestions(pool, opts.n || M.n, weakCats(lv), lv);
  const stream = M.stream ? { list: shuffle(pool), k: 0 } : null;
  if (stream && !stream.list.length) { toast('Aucune question disponible ici.', 'cross'); return; }
  if (!stream && !qs.length) { toast('Aucune question disponible ici.', 'cross'); return; }
  if (store.touchDay()) store.save();
  const clockMs = M.clock ? (mode === 'sprint' ? (timed(SPRINT_MS) || SPRINT_MS * 1.5) : timed(M.clock)) : null;
  session = {
    opts, M, lv, chapter, mode, pool: pool || qs, qs, stream, i: 0, input: '', log: [], helped: {}, remedies: 0,
    combo: 0, xp: 0, busy: false, t0: Date.now(), qStart: Date.now(), clockMs, deadline: 0,
    el: overlay('play'), timer: null,
  };
  if (stream) nextFromStream();
  document.documentElement.dataset.level = lv;
  drawQuestion();
  dropCountdown(session.el, () => {
    const s = session; if (!s) return;
    s.qStart = Date.now(); s.t0 = Date.now();
    if (s.clockMs) { s.deadline = Date.now() + s.clockMs; s.timer = setInterval(tickClock, 250); }
    if (prefsEff().tts && prefsEff().autoRead) readQuestion(s.qs[s.i], s.choices);
  });
}
function nextFromStream() {
  const s = session, st = s.stream;
  if (st.k >= st.list.length) { st.list = shuffle(st.list); st.k = 0; }
  s.qs.push(st.list[st.k++]);
}

/* Lancement façon « drop » : 3·2·1, puis la première question. */
function dropCountdown(host, done) {
  const box = document.createElement('div');
  box.className = 'count3';
  host.appendChild(box);
  const steps = reduceMotion() ? ['Go'] : ['3', '2', '1', 'Go'];
  steps.forEach((s, i) => setTimeout(() => {
    box.innerHTML = `<div><b>${s}</b><span>${s === 'Go' ? 'C’est parti' : 'Prêt ?'}</span></div>`;
    s === 'Go' ? sfx.go() : sfx.tick();
  }, i * 600));
  setTimeout(() => { box.remove(); done(); }, steps.length * 600);
}

function quitSession(force) {
  const s = session; if (!s) return;
  clearInterval(s.timer);
  session = null;
  closeOverlay(s.el, force);
  if (!force) render();
}
async function askQuit() {
  const s = session; if (!s) return;
  if (!s.log.length || s.finished) { quitSession(); return; }
  const ok = await confirmSheet('Quitter la série ?', 'Tes réponses déjà données restent comptées dans ta progression.', 'Quitter', 'Continuer');
  if (ok) quitSession();
}

function clock(ms) { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }
function runHTML(s) {
  if (s.mode === 'sprint') {
    const good = s.log.filter(l => l && l.ok).length;
    return `<div class="sprint-score" aria-live="polite"><b>${good}</b><span>bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''}</span></div>`;
  }
  return `<div class="run" aria-hidden="true">${s.qs.map((q, k) => {
    const l = s.log[k];
    const cls = l ? (s.M.feedback ? (l.ok ? 'ok' : 'ko') : 'ok') : k === s.i ? 'now' : '';
    return `<i class="${cls}${q.remedy ? ' rem' : ''}"></i>`;
  }).join('')}</div>`;
}
function countText(s) {
  if (s.clockMs) return s.deadline ? clock(s.deadline - Date.now()) : clock(s.clockMs);
  return `${s.i + 1}/${s.qs.length}`;
}

function drawQuestion() {
  const s = session, q = s.qs[s.i];
  const choice = !!q.options;
  s.input = ''; s.busy = false; s.qStart = Date.now(); s.choices = choice ? shuffle(q.options) : null;
  const prompt = promptOf(q);
  const p = prefsEff();
  const method = s.M.help ? methodFor(s.lv, q) : null;
  s.el.innerHTML = `<div class="play-in">
    <div class="play-head">
      <button class="icon-btn" data-k="quit" aria-label="Quitter la série">${icon('close')}</button>
      ${runHTML(s)}
      <span class="count" aria-live="off">${countText(s)}</span>
    </div>
    <div class="q-zone">
      <div class="q-meta">
        ${q.remedy ? '<span class="chip">Rattrapage</span>' : ''}
        ${s.mode === 'place' ? '' : `<span class="tier" title="${TIER_NAMES[q.d || 2]}" aria-label="${TIER_NAMES[q.d || 2]}">${[1, 2, 3].map(k => `<i class="${k <= (q.d || 2) ? 'f' : ''}"></i>`).join('')}</span>`}
        <span class="grow"></span>
        ${p.tts && canSpeak() ? `<button class="mini" data-k="read" aria-label="Écouter la question">${icon('sound', 'sm')}<span>Écouter</span></button>` : ''}
        ${method ? `<button class="mini" data-k="help" aria-expanded="false">${icon('bulb', 'sm')}<span>Coup de pouce</span></button>` : ''}
      </div>
      <h2 class="q-text ${prompt.length > 48 ? 'long' : prompt.length <= 16 && !q.figure ? 'short' : ''}" id="q-text">${mathHTML(prompt)}</h2>
      ${q.figure ? `<div class="fig">${FIG(q.figure)}</div>` : ''}
      ${method ? `<div class="helpbox" id="helpbox" hidden><b>Coup de pouce :</b> ${mathHTML(method)}</div>` : ''}
    </div>
    <div class="a-zone">
      ${choice
        ? `<div class="choices" role="group" aria-labelledby="q-text">${s.choices.map((o, k) => `<button class="choice" data-c="${k}"><span class="l">${'ABCD'[k]}</span><span>${mathHTML(o)}</span></button>`).join('')}</div>`
        : `<div class="answer" aria-live="polite" aria-label="Ta réponse"><span class="ph">?</span></div>
           <div class="keypad" aria-label="Pavé numérique">${[['7'], ['8'], ['9'], ['del', icon('del'), 'Effacer'], ['4'], ['5'], ['6'], ['/', 'a/b', 'Barre de fraction'], ['1'], ['2'], ['3'], ['sign', icon('sign'), 'Changer le signe'], ['0'], [',', ',', 'Virgule'], ['ok', 'Valider', 'Valider']]
              .map(([k, t, a]) => `<button class="key ${['del', '/', 'sign', ','].includes(k) ? 'fn' : ''} ${k === 'ok' ? 'go' : ''}" data-k="${k}" ${a ? `aria-label="${a}"` : ''}>${t && t.startsWith('<svg') ? t : esc(t || k)}</button>`).join('')}</div>`}
    </div>
  </div>`;
  if (s.i > 0 && p.tts && p.autoRead) readQuestion(q, s.choices);
}

function drawInput() {
  const box = session.el.querySelector('.answer');
  if (!box) return;
  box.innerHTML = session.input ? `<span>${esc(showInput(session.input))}</span><span class="caret"></span>` : '<span class="ph">?</span>';
}

function tickClock() {
  const s = session; if (!s || !s.deadline) return;
  const left = s.deadline - Date.now();
  const c = s.el.querySelector('.count');
  if (c) { c.textContent = clock(left); c.classList.toggle('warn', left < Math.min(60000, s.clockMs / 4)); }
  if (left <= 0) { clearInterval(s.timer); finishSession(true); }
}

function submit(value) {
  const s = session; if (!s || s.busy || s.finished) return;
  const q = s.qs[s.i], choice = !!q.options;
  if (!choice && !value) return;
  const ok = isRight(value, q.answer, choice);
  const helped = !!s.helped[s.i];
  s.busy = true;
  stopSpeaking();
  s.log[s.i] = { q, given: value, ok, helped, ms: Date.now() - s.qStart };
  store.record(s.lv, q.category, ok);
  if (ok) { s.combo++; s.xp += helped ? 5 : 10 + (s.combo >= 3 ? 5 : 0); } else s.combo = 0;
  store.save();

  if (!s.M.feedback) { sfx.tap(); return advance(); }

  if (s.M.feedback === 'flash') { // chrono : un éclair, puis on enchaîne
    const zone = s.el.querySelector('.a-zone');
    ok ? (sfx.good(), buzz(15)) : (sfx.bad(), buzz([20, 30, 20]));
    const f = document.createElement('div');
    f.className = `flash-mini ${ok ? 'ok' : 'ko'}`; f.setAttribute('role', 'status');
    f.innerHTML = ok ? `<b>${icon('check')}</b>` : `<b>${answerHTML(q.answer, choice)}</b><span>était la bonne réponse</span>`;
    zone.appendChild(f);
    setTimeout(advance, ok ? 260 : 1100);
    return;
  }

  const btns = s.el.querySelectorAll('.choice');
  if (choice) btns.forEach(b => { b.disabled = true; const o = s.choices[+b.dataset.c]; if (o === q.answer) b.classList.add('right'); else if (o === value) b.classList.add('wrong'); });
  if (ok) {
    s.combo % 5 === 0 ? sfx.combo() : sfx.good(); buzz(20);
    const f = document.createElement('div');
    f.className = 'flip'; f.setAttribute('role', 'status');
    f.innerHTML = `<div><b>${s.combo >= 3 ? `×${s.combo}` : 'Juste'}</b><span>${helped ? 'avec le coup de pouce, +5 XP' : s.combo >= 3 ? `${s.combo} d'affilée, +15 XP` : '+10 XP'}</span></div>`;
    s.el.appendChild(f);
    setTimeout(advance, reduceMotion() ? 700 : 520);
  } else {
    sfx.bad(); buzz([30, 40, 30]);
    // Remédiation : une autre question de la même notion revient un peu plus loin.
    let remedyMsg = '';
    if (s.M.remedy && s.remedies < MAX_REMEDY) {
      const used = new Set(s.qs);
      const r = sameNotion(q, s.pool, used);
      if (r) { s.qs.splice(Math.min(s.i + 3, s.qs.length), 0, { ...r, remedy: true }); s.remedies++; remedyMsg = '<p class="remedy-note">Une question de rattrapage sur cette notion arrive dans quelques questions.</p>'; }
    }
    const zone = s.el.querySelector('.a-zone');
    zone.classList.add('shake');
    const method = methodFor(s.lv, q);
    const showHint = q.hint && q.hint !== method;
    zone.innerHTML = `<div class="fix" role="alert">
      <div class="head"><span class="dot">${icon('cross', 'sm')}</span>Pas tout à fait</div>
      <p class="yours">Ta réponse : <s>${choice ? mathHTML(value) : esc(showInput(value))}</s></p>
      <p class="good">Bonne réponse<strong>${answerHTML(q.answer, choice)}</strong></p>
      ${method ? `<p class="how"><b>Méthode :</b> ${mathHTML(method)}</p>` : ''}
      ${showHint ? `<p class="how-2">${mathHTML(q.hint)}</p>` : ''}
      ${remedyMsg}
      <p class="notion-name">Notion : ${esc(q.category)}</p>
      <button class="btn ink block" data-k="next">${s.i + 1 < s.qs.length ? 'Question suivante' : 'Voir mon score'} ${icon('next', 'sm')}</button></div>`;
    zone.querySelector('[data-k="next"]').focus();
  }
}

function advance() {
  const s = session; if (!s || s.finished) return;
  s.i++;
  if (s.stream) { if (s.i >= s.qs.length) nextFromStream(); return drawQuestion(); }
  if (s.i >= s.qs.length) finishSession(false); else drawQuestion();
}

/* ---------- Fin de série ---------- */
function perCategory(log) {
  const by = {};
  for (const l of log.filter(Boolean)) { const c = (by[l.q.category] ||= { t: 0, k: 0 }); c.t++; if (l.ok) c.k++; }
  return by;
}
function finishSession(timeUp) {
  const s = session; if (!s || s.finished) return;
  clearInterval(s.timer);
  stopSpeaking();
  if (s.stream && !s.log[s.i]) s.qs.length = s.i; // la question en cours au gong ne compte pas
  const done = s.log.filter(Boolean);
  const good = done.filter(l => l.ok).length;
  const total = s.stream ? done.length : s.qs.length;
  if (s.mode === 'exam' || s.mode === 'daily') s.xp = good * 10 + (good === total ? 30 : 0);
  if (s.mode === 'place') s.xp = 50;
  if (s.mode === 'sprint') s.xp = good * 5;
  const before = s.chapter && s.chapter.prefixes ? chapterStats(s.lv, s.chapter) : null;
  store.d.xp += s.xp;

  // Révisions espacées, compteurs, records
  srsUpdate(s.lv, perCategory(s.log));
  const c = counts();
  bump('series'); bump('good', good);
  if (['train', 'review', 'homework'].includes(s.mode) && total >= 10 && good === total) bump('perfect');
  if (s.mode === 'review') bump('review');
  if (s.mode === 'place') { bump('placed'); (store.d.placed ||= {})[s.lv] = today(); }
  if (s.mode === 'sprint') {
    c.sprint = Math.max(c.sprint || 0, good);
    const best = ((store.d.best ||= {}).sprint ||= {});
    s.record = good > (best[s.lv] || 0); best[s.lv] = Math.max(best[s.lv] || 0, good); s.best = best[s.lv];
  }
  if (s.mode === 'daily') {
    const prev = dailyState(s.lv);
    if (!prev) bump('daily');
    const ms = Date.now() - s.t0;
    if (!prev || good > prev.score || (good === prev.score && ms < prev.ms)) (store.d.daily ||= {})[s.lv] = { date: today(), score: good, ms };
  }
  if (s.mode === 'homework' && s.opts.assignment && store.d.cloud) (store.d.cloud.done ||= {})[s.opts.assignment] = { score: good, total };
  store.save();
  cloudRecordSession(s);
  s.finished = { wrong: done.filter(l => !l.ok).map(l => l.q) };
  s.el.innerHTML = s.mode === 'place' ? placementResultHTML(s) : resultHTML(s, good, total, timeUp);
  sfx.win();
  const after = s.chapter && s.chapter.prefixes ? chapterStats(s.lv, s.chapter) : null;
  if (after && after.medal && (!before || !before.medal || before.medal !== after.medal)) setTimeout(() => toast(`Médaille ${after.medal.label.toLowerCase()} débloquée : ${s.chapter.name}`), 600);
  checkTrophies();
}

function resultHTML(s, good, total, timeUp) {
  const done = s.log.filter(Boolean);
  const rate = total ? good / total : 0;
  const used = Date.now() - s.t0;
  const wrong = done.filter(l => !l.ok);
  const helped = done.filter(l => l.helped).length;
  let title, line, advice;
  if (s.mode === 'sprint') {
    title = s.record && good ? 'Record' : 'Chrono';
    line = `${plural(good, 'bonne réponse', 'bonnes réponses')} en ${clock(s.clockMs)} · record : ${s.best}`;
    advice = good >= 15 ? 'Rapide et juste : garde ce rythme.' : 'Vise la justesse d’abord : la vitesse vient avec l’entraînement.';
  } else {
    title = rate === 1 ? 'Sans faute' : rate >= .9 ? 'Excellent' : rate >= .75 ? 'Très bien' : rate >= .5 ? 'Bien joué' : 'À retravailler';
    line = `${esc((s.chapter && s.chapter.name) || s.M.label)}${s.mode === 'exam' ? ` · examen ${timeUp ? 'terminé au chrono' : `en ${clock(used)}`}` : s.mode === 'daily' ? ` · en ${clock(used)}` : ''}`;
    advice = s.mode === 'daily' ? 'Un nouveau défi t’attend demain : les mêmes 10 questions pour tous les élèves de ton niveau.'
      : rate >= .75 ? 'Tu maîtrises bien ces automatismes. Les révisions du jour te les feront revoir au bon moment.'
      : rate >= .5 ? 'C’est en bonne voie. Relis les méthodes ci-dessous puis relance une série.'
      : 'Prends le temps de relire chaque méthode, puis refais une série sur les erreurs.';
  }
  const ledger = s.mode === 'exam' || s.mode === 'daily'
    ? `<div class="sec"><h2>Relevé</h2><span class="muted" style="font-size:13px">${clock(used)}${s.clockMs ? ` sur ${clock(s.clockMs)}` : ''}</span></div>
      <table class="ledger"><thead><tr><th>#</th><th>Question</th><th>Temps</th><th><span class="sr">Résultat</span></th></tr></thead><tbody>
      ${s.qs.map((q, k) => { const l = s.log[k]; return `<tr><td>${k + 1}</td><td class="q">${mathHTML(promptOf(q))}</td><td>${l ? `${(l.ms / 1000).toFixed(1).replace('.', ',')} s` : '–'}</td><td>${l ? `<span class="mark ${l.ok ? 'ok' : 'ko'}" aria-label="${l.ok ? 'juste' : 'faux'}">${icon(l.ok ? 'check' : 'cross')}</span>` : '<span class="mark ko" aria-label="sans réponse">' + icon('cross') + '</span>'}</td></tr>`; }).join('')}
      </tbody></table>` : '';
  const again = s.mode === 'daily' ? 'Rejouer le défi' : s.mode === 'sprint' ? 'Rejouer' : 'Nouvelle série';
  return `<div class="shell res" style="padding-bottom:32px;overflow-y:auto;height:100%">
    <div class="top"><div class="wordmark">MATH<span>QUEST</span></div><button class="icon-btn" data-k="home" aria-label="Fermer">${icon('close')}</button></div>
    <div class="layout">
      <div class="side">
        <section class="drop" aria-labelledby="res-title">
          <h1 id="res-title">${title}</h1>
          <p class="score" aria-label="${good} sur ${total}">${good}${s.mode === 'sprint' ? '' : `<small>/${total}</small>`}</p>
          <p>${line}</p>
          <div class="gains">${s.xp ? `<span class="pill">${icon('bolt')}+${s.xp} XP</span>` : ''}${helped ? `<span class="pill">${icon('bulb')}${helped} coup${helped > 1 ? 's' : ''} de pouce</span>` : ''}${s.mode === 'exam' && done.length < total ? `<span class="pill">${total - done.length} sans réponse</span>` : ''}</div>
        </section>
      </div>
      <div class="main">
        <p class="note" style="margin-top:24px">${advice}</p>
        ${ledger}
        ${wrong.length ? `<div class="sec"><h2>Tes erreurs</h2></div><div class="review">${wrong.map(l => `<article>
            <p class="qq">${mathHTML(promptOf(l.q))}</p>
            <p class="aa">Ta réponse : <s>${l.q.options ? mathHTML(l.given) : esc(showInput(l.given))}</s> · Bonne réponse : <strong>${answerHTML(l.q.answer, !!l.q.options)}</strong></p>
            ${methodFor(s.lv, l.q) ? `<p class="hh">${mathHTML(methodFor(s.lv, l.q))}</p>` : ''}</article>`).join('')}</div>` : ''}
        <div class="bottom-actions">
          ${wrong.length ? '<button class="btn ink block" data-k="redo">Refaire mes erreurs</button>' : ''}
          <button class="btn ${wrong.length ? 'line' : 'ink'} block" data-k="again">${again}</button>
          <button class="btn line block" data-k="home">Retour à l’accueil</button>
        </div>
      </div>
    </div></div>`;
}

function placementResultHTML(s) {
  const lv = s.lv;
  const rows = DATA.chapters[lv].map(ch => {
    const ls = s.log.filter(l => l && l.q.chapter === ch.id);
    const k = ls.filter(l => l.ok).length;
    return { ch, k, n: ls.length };
  }).filter(r => r.n);
  const weakest = [...rows].sort((a, b) => a.k / a.n - b.k / b.n)[0];
  const label = r => r.k === r.n ? 'Acquis' : r.k === 0 ? 'À travailler' : 'En cours';
  const good = s.log.filter(l => l && l.ok).length;
  return `<div class="shell res" style="padding-bottom:32px;overflow-y:auto;height:100%">
    <div class="top"><div class="wordmark">MATH<span>QUEST</span></div><button class="icon-btn" data-k="home" aria-label="Fermer">${icon('close')}</button></div>
    <div class="layout">
      <div class="side">
        <section class="drop" aria-labelledby="res-title">
          <h1 id="res-title" style="--tw:11">Ton point de départ</h1>
          <p class="score" aria-label="${good} sur ${s.qs.length}">${good}<small>/${s.qs.length}</small></p>
          <p>Test de positionnement de ${LEVELS[lv].short}. Ces réponses règlent déjà la difficulté de tes prochaines séries.</p>
          ${weakest ? `<div class="actions"><button class="btn ink" data-k="startch" data-ch="${weakest.ch.id}">Commencer par ${esc(weakest.ch.name)} ${icon('next', 'sm')}</button></div>` : ''}
        </section>
      </div>
      <div class="main">
        <div class="sec"><h2>Chapitre par chapitre</h2></div>
        <div class="rows">${rows.map(r => `<div class="row static"><div><div class="n">${esc(r.ch.name)}</div><div class="s">${r.k}/${r.n} · ${label(r)}</div></div>
          <span class="cells" aria-hidden="true">${Array.from({ length: r.n }, (_, i) => `<i class="${i < r.k ? 'f' : ''}"></i>`).join('')}</span></div>`).join('')}</div>
        <div class="bottom-actions"><button class="btn line block" data-k="home">Retour à l’accueil</button></div>
      </div>
    </div></div>`;
}

/* ---------- Lanceurs ---------- */
function startPlacement(lv) {
  startSession({ lv, chapter: { id: 'place', name: 'Test de positionnement' }, mode: 'place', qs: shuffle(placementQuestions(lv)) });
}
function startDaily(lv) {
  startSession({ lv, chapter: { id: 'daily', name: 'Défi du jour' }, mode: 'daily', qs: dailyQuestions(lv) });
}
function startSprint(lv) {
  startSession({ lv, chapter: { id: 'sprint', name: 'Chrono' }, mode: 'sprint', pool: sprintPool(lv) });
}
function startReview(lv) {
  const { due, pool } = reviewPool(lv);
  if (!pool.length) { toast('Rien à réviser aujourd’hui. Reviens demain !', 'check'); return; }
  startSession({ lv, chapter: { id: 'review', name: 'Révisions du jour' }, mode: 'review', pool, n: Math.min(12, Math.max(6, due.length * 2)) });
}

document.addEventListener('click', e => {
  const s = session; if (!s || !s.el.contains(e.target)) return;
  const b = e.target.closest('button'); if (!b) return;
  const k = b.dataset.k;
  if (b.dataset.c != null) { if (!s.busy) submit(s.choices[+b.dataset.c]); return; }
  if (k === 'quit') return askQuit();
  if (k === 'next') return advance();
  if (k === 'home') return quitSession();
  if (k === 'read') return readQuestion(s.qs[s.i], s.choices);
  if (k === 'help') {
    const box = s.el.querySelector('#helpbox'); if (!box || s.busy) return;
    box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden));
    if (!box.hidden) { s.helped[s.i] = true; if (prefsEff().tts) speak(box.textContent); }
    return;
  }
  if (k === 'startch') { const ch = chapterById(s.lv, b.dataset.ch); quitSession(true); return startSession({ lv: s.lv, chapter: ch, mode: 'train', pool: questionsOf(s.lv, ch.id) }); }
  if (k === 'again') {
    const o = s.opts; quitSession(true);
    if (o.mode === 'review') return startReview(o.lv);
    if (o.mode === 'daily') return startDaily(o.lv);
    return startSession({ ...o, qs: o.mode === 'place' ? o.qs : undefined });
  }
  if (k === 'redo') { const { lv, chapter } = s; const pool = s.finished.wrong; quitSession(true); return startSession({ lv, chapter: { id: 'weak', name: `Erreurs : ${(chapter && chapter.name) || ''}` }, mode: 'train', pool, n: Math.max(pool.length, 5) }); }
  if (s.busy || s.finished || !k) return;
  if (k === 'ok') return submit(s.input);
  s.input = typeKey(s.input, k); sfx.tap(); drawInput();
});

/* Clavier d'ordinateur : chiffres, virgule ou point, /, -, Retour arrière, Entrée ; A-D pour les QCM ; H coup de pouce. */
document.addEventListener('keydown', e => {
  const s = session; if (!s || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') { e.preventDefault(); return s.finished ? quitSession() : askQuit(); }
  if (s.finished) return;
  const q = s.qs[s.i];
  if (s.busy) { if (e.key === 'Enter' && s.el.querySelector('[data-k="next"]') && document.activeElement?.dataset?.k !== 'next') { e.preventDefault(); advance(); } return; }
  if (e.key.toLowerCase() === 'h' && s.el.querySelector('[data-k="help"]')) { e.preventDefault(); s.el.querySelector('[data-k="help"]').click(); return; }
  if (q.options) {
    const k = 'abcd'.indexOf(e.key.toLowerCase()), n = '1234'.indexOf(e.key), idx = k >= 0 ? k : n;
    if (idx >= 0 && idx < s.choices.length) { e.preventDefault(); submit(s.choices[idx]); }
    return;
  }
  const map = { Backspace: 'del', Enter: 'ok', ',': ',', '.': ',', '/': '/', '-': 'sign' };
  const k = /^\d$/.test(e.key) ? e.key : map[e.key];
  if (!k) return;
  e.preventDefault();
  const key = s.el.querySelector(`.key[data-k="${CSS.escape(k)}"]`);
  if (key) { key.classList.add('hit'); setTimeout(() => key.classList.remove('hit'), 90); }
  if (k === 'ok') return submit(s.input);
  s.input = typeKey(s.input, k); drawInput();
});

window.addEventListener('popstate', async () => {
  if (session && !session.finished && session.log.length) {
    history.pushState({ overlay: true }, '');
    askQuit();
  } else if (session) { const s = session; clearInterval(s.timer); session = null; stopSpeaking(); s.el.remove(); document.body.style.overflow = ''; render(); }
  else if (arena) { arenaBack(); }
});
