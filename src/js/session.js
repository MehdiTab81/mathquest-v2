/* Partie en solo : Entraînement (correction immédiate) et Examen 9 minutes (correction à la fin). */

const SESSION_LEN = 20, EXAM_MS = 9 * 60 * 1000;
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
  if (!keepHistory && history.state && history.state.overlay) history.back();
}

function startSession({ lv, chapter, mode, pool }) {
  const qs = pickQuestions(pool, SESSION_LEN, weakCats(lv));
  if (!qs.length) { toast('Aucune question disponible ici.', 'cross'); return; }
  if (store.touchDay()) store.save();
  session = {
    lv, chapter, mode, qs, i: 0, input: '', log: [], combo: 0, xp: 0, busy: false,
    t0: Date.now(), qStart: Date.now(), deadline: mode === 'exam' ? Date.now() + EXAM_MS : 0,
    el: overlay('play'), timer: null,
  };
  document.documentElement.dataset.level = lv;
  drawQuestion();
  dropCountdown(session.el, () => {
    if (!session) return;
    session.qStart = Date.now();
    if (mode === 'exam') { session.deadline = Date.now() + EXAM_MS; session.timer = setInterval(tickExam, 250); }
  });
}

/* Lancement façon « drop » : 3·2·1, puis la première question. */
function dropCountdown(host, done) {
  const box = document.createElement('div');
  box.className = 'count3';
  host.appendChild(box);
  const steps = reduceMotion() ? ['Go'] : ['3', '2', '1', 'Go'];
  steps.forEach((s, i) => setTimeout(() => {
    box.innerHTML = `<div><b>${s}</b><span>${s === 'Go' ? 'C’est parti' : 'Prêt ?'}</span></div>`;
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
  if (!s.log.length) { quitSession(); return; }
  const ok = await confirmSheet('Quitter la série ?', 'Tes réponses déjà données restent comptées dans ta progression.', 'Quitter', 'Continuer');
  if (ok) quitSession();
}

function runHTML(s) {
  return `<div class="run" aria-hidden="true">${s.qs.map((_, k) => {
    const l = s.log[k];
    const cls = l ? (s.mode === 'exam' ? 'ok' : l.ok ? 'ok' : 'ko') : k === s.i ? 'now' : '';
    return `<i class="${cls}"></i>`;
  }).join('')}</div>`;
}
function clock(ms) { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }

function drawQuestion() {
  const s = session, q = s.qs[s.i];
  const choice = !!q.options;
  s.input = ''; s.busy = false; s.qStart = Date.now(); s.choices = choice ? shuffle(q.options) : null;
  const prompt = promptOf(q);
  s.el.innerHTML = `<div class="play-in">
    <div class="play-head">
      <button class="icon-btn" data-k="quit" aria-label="Quitter la série">${icon('close')}</button>
      ${runHTML(s)}
      <span class="count ${s.mode === 'exam' ? 'exam' : ''}" aria-live="off">${s.mode === 'exam' ? clock(s.deadline - Date.now()) : `${s.i + 1}/${s.qs.length}`}</span>
    </div>
    <div class="q-zone">
      <h2 class="q-text ${prompt.length > 48 ? 'long' : prompt.length <= 16 && !q.figure ? 'short' : ''}" id="q-text">${mathHTML(prompt)}</h2>
      ${q.figure ? `<div class="fig">${FIG(q.figure)}</div>` : ''}
    </div>
    <div class="a-zone">
      ${choice
        ? `<div class="choices" role="group" aria-labelledby="q-text">${s.choices.map((o, k) => `<button class="choice" data-c="${k}"><span class="l">${'ABCD'[k]}</span><span>${mathHTML(o)}</span></button>`).join('')}</div>`
        : `<div class="answer" aria-live="polite" aria-label="Ta réponse"><span class="ph">?</span></div>
           <div class="keypad" aria-label="Pavé numérique">${[['7'], ['8'], ['9'], ['del', icon('del'), 'Effacer'], ['4'], ['5'], ['6'], ['/', 'a/b', 'Barre de fraction'], ['1'], ['2'], ['3'], ['sign', icon('sign'), 'Changer le signe'], ['0'], [',', ',', 'Virgule'], ['ok', 'Valider', 'Valider']]
              .map(([k, t, a]) => `<button class="key ${['del', '/', 'sign', ','].includes(k) ? 'fn' : ''} ${k === 'ok' ? 'go' : ''}" data-k="${k}" ${a ? `aria-label="${a}"` : ''}>${t && t.startsWith('<svg') ? t : esc(t || k)}</button>`).join('')}</div>`}
    </div>
  </div>`;
}

function drawInput() {
  const box = session.el.querySelector('.answer');
  if (!box) return;
  box.innerHTML = session.input ? `<span>${esc(showInput(session.input))}</span><span class="caret"></span>` : '<span class="ph">?</span>';
}

function tickExam() {
  const s = session; if (!s || s.mode !== 'exam') return;
  const left = s.deadline - Date.now();
  const c = s.el.querySelector('.count');
  if (c) { c.textContent = clock(left); c.classList.toggle('warn', left < 60000); }
  if (left <= 0) { clearInterval(s.timer); finishSession(true); }
}

function submit(value) {
  const s = session; if (!s || s.busy) return;
  const q = s.qs[s.i], choice = !!q.options;
  if (!choice && !value) return;
  const ok = isRight(value, q.answer, choice);
  s.busy = true;
  s.log[s.i] = { q, given: value, ok, ms: Date.now() - s.qStart };
  store.record(s.lv, q.category, ok);
  if (ok) { s.combo++; s.xp += 10 + (s.combo >= 3 ? 5 : 0); } else s.combo = 0;
  store.save();

  if (s.mode === 'exam') { sfx.tap(); return advance(); }

  const btns = s.el.querySelectorAll('.choice');
  if (choice) btns.forEach(b => { b.disabled = true; const o = s.choices[+b.dataset.c]; if (o === q.answer) b.classList.add('right'); else if (o === value) b.classList.add('wrong'); });
  if (ok) {
    s.combo % 5 === 0 ? sfx.combo() : sfx.good(); buzz(20);
    const f = document.createElement('div');
    f.className = 'flip'; f.setAttribute('role', 'status');
    f.innerHTML = `<div><b>${s.combo >= 3 ? `×${s.combo}` : 'Juste'}</b><span>${s.combo >= 3 ? `${s.combo} d'affilée, +15 XP` : '+10 XP'}</span></div>`;
    s.el.appendChild(f);
    setTimeout(advance, reduceMotion() ? 700 : 520);
  } else {
    sfx.bad(); buzz([30, 40, 30]);
    const zone = s.el.querySelector('.a-zone');
    zone.classList.add('shake');
    const hint = q.hint ? `<p class="how"><b>Méthode :</b> ${mathHTML(q.hint)}</p>` : '';
    zone.innerHTML = `<div class="fix" role="alert">
      <div class="head"><span class="dot">${icon('cross', 'sm')}</span>Pas tout à fait</div>
      <p class="yours">Ta réponse : <s>${choice ? mathHTML(value) : esc(showInput(value))}</s></p>
      <p class="good">Bonne réponse<strong>${answerHTML(q.answer, choice)}</strong></p>
      ${hint}
      <p class="notion-name">Notion : ${esc(q.category)}</p>
      <button class="btn ink block" data-k="next">${s.i + 1 < s.qs.length ? 'Question suivante' : 'Voir mon score'} ${icon('next', 'sm')}</button></div>`;
    zone.querySelector('[data-k="next"]').focus();
  }
}

function advance() {
  const s = session; if (!s) return;
  s.i++;
  if (s.i >= s.qs.length) finishSession(false); else drawQuestion();
}

function finishSession(timeUp) {
  const s = session; if (!s) return;
  clearInterval(s.timer);
  const done = s.log.filter(Boolean);
  const good = done.filter(l => l.ok).length;
  if (s.mode === 'exam') s.xp = good * 10 + (good === s.qs.length ? 50 : 0);
  const before = s.chapter.prefixes || s.chapter.id === MIX.id ? chapterStats(s.lv, s.chapter) : null;
  store.d.xp += s.xp;
  store.save();
  cloudRecordSession(s);
  const total = s.qs.length, rate = good / total;
  const verdict = rate === 1 ? 'Sans faute' : rate >= .9 ? 'Excellent' : rate >= .75 ? 'Très bien' : rate >= .5 ? 'Bien joué' : 'À retravailler';
  const advice = rate >= .75 ? 'Tu maîtrises bien ces automatismes. Garde le rythme avec une série par jour.' : rate >= .5 ? 'C’est en bonne voie. Relis les méthodes ci-dessous puis relance une série.' : 'Prends le temps de relire chaque méthode, puis refais une série sur les erreurs.';
  const wrong = done.filter(l => !l.ok);
  const used = Date.now() - s.t0;
  s.el.innerHTML = `<div class="shell res" style="padding-bottom:32px;overflow-y:auto;height:100%">
    <div class="top"><div class="wordmark">MATH<span>QUEST</span></div><button class="icon-btn" data-k="home" aria-label="Fermer">${icon('close')}</button></div>
    <div class="layout">
      <div class="side">
        <section class="drop" aria-labelledby="res-title">
          <h1 id="res-title">${verdict}</h1>
          <p class="score" aria-label="${good} sur ${total}">${good}<small>/${total}</small></p>
          <p>${esc(s.chapter.name)}${s.mode === 'exam' ? ` · examen ${timeUp ? 'terminé au chrono' : `en ${clock(used)}`}` : ''}</p>
          <div class="gains">${s.xp ? `<span class="pill">${icon('bolt')}+${s.xp} XP</span>` : ''}${s.mode === 'exam' && done.length < total ? `<span class="pill">${total - done.length} sans réponse</span>` : ''}</div>
        </section>
      </div>
      <div class="main">
        <p class="note" style="margin-top:24px">${advice}</p>
        ${s.mode === 'exam' ? `<div class="sec"><h2>Relevé de l'examen</h2><span class="muted" style="font-size:13px">${clock(used)} sur 9:00</span></div>
          <table class="ledger"><thead><tr><th>#</th><th>Question</th><th>Temps</th><th><span class="sr">Résultat</span></th></tr></thead><tbody>
          ${s.qs.map((q, k) => { const l = s.log[k]; return `<tr><td>${k + 1}</td><td class="q">${mathHTML(promptOf(q))}</td><td>${l ? `${(l.ms / 1000).toFixed(1).replace('.', ',')} s` : '–'}</td><td>${l ? `<span class="mark ${l.ok ? 'ok' : 'ko'}" aria-label="${l.ok ? 'juste' : 'faux'}">${icon(l.ok ? 'check' : 'cross')}</span>` : '<span class="mark ko" aria-label="sans réponse">' + icon('cross') + '</span>'}</td></tr>`; }).join('')}
          </tbody></table>` : ''}
        ${wrong.length ? `<div class="sec"><h2>Tes erreurs</h2></div><div class="review">${wrong.map(l => `<article>
            <p class="qq">${mathHTML(promptOf(l.q))}</p>
            <p class="aa">Ta réponse : <s>${l.q.options ? mathHTML(l.given) : esc(showInput(l.given))}</s> · Bonne réponse : <strong>${answerHTML(l.q.answer, !!l.q.options)}</strong></p>
            ${l.q.hint ? `<p class="hh">${mathHTML(l.q.hint)}</p>` : ''}</article>`).join('')}</div>` : ''}
        <div class="bottom-actions">
          ${wrong.length ? '<button class="btn ink block" data-k="redo">Refaire mes erreurs</button>' : ''}
          <button class="btn ${wrong.length ? 'line' : 'ink'} block" data-k="again">Nouvelle série</button>
          <button class="btn line block" data-k="home">Retour aux chapitres</button>
        </div>
      </div>
    </div></div>`;
  s.finished = { wrong: wrong.map(l => l.q) };
  sfx.win();
  if (before && before.medal) { /* médaille déjà acquise */ }
  const after = s.chapter.prefixes ? chapterStats(s.lv, s.chapter) : null;
  if (after && after.medal && (!before || !before.medal || before.medal !== after.medal)) setTimeout(() => toast(`Médaille ${after.medal.label.toLowerCase()} débloquée : ${s.chapter.name}`), 600);
}

document.addEventListener('click', e => {
  const s = session; if (!s || !s.el.contains(e.target)) return;
  const b = e.target.closest('button'); if (!b) return;
  const k = b.dataset.k;
  if (b.dataset.c != null) { if (!s.busy) submit(s.choices[+b.dataset.c]); return; }
  if (k === 'quit') return askQuit();
  if (k === 'next') return advance();
  if (k === 'home') return quitSession();
  if (k === 'again') { const { lv, chapter, mode } = s; const pool = chapter.id === 'weak' ? s.qs : questionsOf(lv, chapter.id); quitSession(true); return startSession({ lv, chapter, mode, pool: pool.length ? pool : s.qs }); }
  if (k === 'redo') { const { lv, chapter } = s; const pool = s.finished.wrong; quitSession(true); return startSession({ lv, chapter: { id: 'weak', name: `Erreurs : ${chapter.name}` }, mode: 'train', pool }); }
  if (s.busy || s.finished || !k) return;
  if (k === 'ok') return submit(s.input);
  s.input = typeKey(s.input, k); sfx.tap(); drawInput();
});

/* Clavier d'ordinateur : chiffres, virgule ou point, /, -, Retour arrière, Entrée ; A-D pour les QCM. */
document.addEventListener('keydown', e => {
  const s = session; if (!s || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') { e.preventDefault(); return s.finished ? quitSession() : askQuit(); }
  if (s.finished) return;
  const q = s.qs[s.i];
  if (s.busy) { if (e.key === 'Enter' && s.el.querySelector('[data-k="next"]') && document.activeElement?.dataset?.k !== 'next') { e.preventDefault(); advance(); } return; }
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
  } else if (session) { const s = session; clearInterval(s.timer); session = null; s.el.remove(); document.body.style.overflow = ''; render(); }
  else if (arena) { arenaBack(); }
});
