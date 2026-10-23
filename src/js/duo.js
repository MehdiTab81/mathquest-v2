/* Duel (2 joueurs, tir à la corde) et Battle (2 à 4 joueurs, premier à 5) sur un seul écran tactile. */

const DUEL_TARGET = 5, BATTLE_TARGET = 5;
let arena = null;

function startArena({ mode, n, lv, pool, names }) {
  if (pool.length < 10) { toast('Pas assez de questions courtes ici.', 'cross'); return; }
  if (store.touchDay()) store.save();
  arena = {
    mode, n, lv, names, pool, queue: [], used: 0,
    scores: Array(n).fill(0), combos: Array(n).fill(0), wrongThisRound: new Set(),
    rope: 0, round: 0, state: 'count', q: null, choices: null, timers: [], roundMs: mode === 'duel' ? 12000 : 10000,
    el: overlay('arena'),
  };
  document.documentElement.dataset.level = lv;
  layoutArena();
  countdown();
}

function zoneHTML(p, flipped) {
  return `<section class="zone ${flipped ? 'flipz' : ''}" data-p="${p}" aria-label="${esc(arena.names[p - 1])}">
    <div class="zh"><span class="who">${esc(arena.names[p - 1])}</span><span class="zs"></span></div>
    <div class="zq"></div>
    <div class="tiles"></div>
  </section>`;
}
function layoutArena() {
  const a = arena, el = a.el;
  const rope = `<div class="rope" aria-hidden="true"><div class="t"></div>${a.mode === 'duel' ? '<div class="knot">0</div>' : ''}</div>`;
  let html;
  if (a.n === 2) {
    el.className = `arena ${a.mode === 'duel' ? 'duel' : 'duel b2'}`;
    html = zoneHTML(2, true) + rope + zoneHTML(1, false);
  } else if (a.n === 3) {
    el.className = 'arena b3';
    html = zoneHTML(3, true) + rope + `<div class="row2">${zoneHTML(1, false)}<div class="gap"></div>${zoneHTML(2, false)}</div>`;
  } else {
    el.className = 'arena b4';
    html = `<div class="row2">${zoneHTML(4, true)}<div class="gap"></div>${zoneHTML(3, true)}</div>` + rope + `<div class="row2">${zoneHTML(1, false)}<div class="gap"></div>${zoneHTML(2, false)}</div>`;
  }
  el.innerHTML = html + `<button class="arena-x" data-ax="quit" aria-label="Quitter la partie">${icon('close')}</button>`;
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', a.mode === 'duel' ? 'Duel' : 'Battle');
  drawScores();
}
const zone = p => arena.el.querySelector(`.zone[data-p="${p}"]`);

function drawScores() {
  const a = arena;
  for (let p = 1; p <= a.n; p++) {
    const z = zone(p); if (!z) continue;
    const filled = a.mode === 'duel' ? Math.max(0, p === 1 ? a.rope : -a.rope) : a.scores[p - 1];
    const target = a.mode === 'duel' ? DUEL_TARGET : BATTLE_TARGET;
    const combo = a.combos[p - 1];
    z.querySelector('.zs').innerHTML = `${combo >= 2 ? `<span class="combo">${combo >= 3 ? '×2' : 'série ' + combo}</span>` : ''}<span class="pts" aria-label="${filled} sur ${target}">${Array.from({ length: target }, (_, k) => `<i class="${k < filled ? 'f' : ''}"></i>`).join('')}</span>`;
  }
  if (a.mode === 'duel') {
    const share = 50 + a.rope * 5;
    a.el.style.setProperty('--top', `${100 - share}fr`);
    a.el.style.setProperty('--bot', `${share}fr`);
    const k = a.el.querySelector('.knot'); if (k) k.textContent = a.rope === 0 ? '0' : `+${Math.abs(a.rope)}`;
  }
}

function later(fn, ms) { const t = setTimeout(fn, ms); arena.timers.push(t); return t; }
function clearArenaTimers() { if (!arena) return; arena.timers.forEach(clearTimeout); arena.timers = []; cancelAnimationFrame(arena.raf); }

function countdown() {
  const a = arena;
  const twin = a.n === 2 || a.n >= 3;
  const box = document.createElement('div');
  box.className = 'count3';
  a.el.appendChild(box);
  const steps = ['3', '2', '1', 'Go'];
  steps.forEach((s, i) => later(() => {
    const one = `<div><b>${s}</b><span>${s === 'Go' ? 'Tout le monde répond !' : 'Prêts ?'}</span></div>`;
    box.innerHTML = `<div style="display:grid;grid-template-rows:1fr 1fr;height:100%;width:100%;place-items:center">${twin ? `<div class="twin">${one}</div>` : '<div></div>'}${one}</div>`;
    s === 'Go' ? sfx.go() : sfx.tick();
  }, i * 650));
  later(() => { box.remove(); a.state = 'play'; nextRound(); }, steps.length * 650);
}

function drawTimer(ms) {
  const t = arena.el.querySelector('.rope .t');
  if (t) t.style.transform = `scaleX(${Math.max(0, ms / arena.roundMs)})`;
}

function nextRound() {
  const a = arena; if (!a) return;
  if (!a.queue.length) a.queue = shuffle(a.pool);
  let q, ch;
  do { q = a.queue.pop(); ch = q && choicesFor(q); } while (q && !ch && a.queue.length);
  if (!ch) { a.queue = shuffle(a.pool); return nextRound(); }
  a.q = q; a.choices = ch; a.round++; a.state = 'play'; a.wrongThisRound = new Set();
  const prompt = promptOf(q);
  for (let p = 1; p <= a.n; p++) {
    const z = zone(p);
    z.classList.remove('locked'); z.querySelector('.lock')?.remove(); z.querySelector('.flash')?.remove();
    const zq = z.querySelector('.zq');
    zq.className = `zq ${prompt.length > 34 ? 'long' : ''}`;
    zq.innerHTML = `<span>${mathHTML(prompt)}</span>`;
    z.querySelector('.tiles').innerHTML = ch.map((c, k) => `<button class="tile" data-t="${k}">${mathHTML(c.v)}</button>`).join('');
  }
  const start = performance.now();
  const loop = now => {
    if (!arena || arena.state !== 'play') return;
    const left = a.roundMs - (now - start);
    drawTimer(left);
    if (left <= 0) return reveal(null);
    a.raf = requestAnimationFrame(loop);
  };
  a.raf = requestAnimationFrame(loop);
}

function tap(p, k) {
  const a = arena; if (!a || a.state !== 'play') return;
  if (a.wrongThisRound.has(p)) return;
  const z = zone(p), btn = z.querySelector(`.tile[data-t="${k}"]`);
  if (a.choices[k].ok) {
    a.combos[p - 1]++;
    const pts = a.combos[p - 1] >= 3 ? 2 : 1;
    if (a.mode === 'duel') a.rope = Math.max(-DUEL_TARGET, Math.min(DUEL_TARGET, a.rope + (p === 1 ? pts : -pts)));
    else a.scores[p - 1] += pts;
    for (let o = 1; o <= a.n; o++) if (o !== p) a.combos[o - 1] = 0;
    a.combos[p - 1] >= 3 ? sfx.combo() : sfx.good(); buzz(25);
    const f = document.createElement('div'); f.className = 'flash'; f.innerHTML = `<b>${pts === 2 ? '+2' : '+1'}</b>`; z.appendChild(f);
    reveal(p);
  } else {
    btn.classList.add('wrong');
    a.combos[p - 1] = 0;
    a.wrongThisRound.add(p);
    z.classList.add('locked');
    const lk = document.createElement('span'); lk.className = 'lock'; lk.textContent = 'Bloqué'; z.querySelector('.zh').insertBefore(lk, z.querySelector('.zs'));
    sfx.bad(); buzz([20, 30, 20]);
    drawScores();
    if (a.wrongThisRound.size >= a.n) reveal(null);
  }
}

function reveal(winner) {
  const a = arena; if (!a || a.state !== 'play') return;
  a.state = 'reveal';
  cancelAnimationFrame(a.raf);
  const right = a.choices.findIndex(c => c.ok);
  a.el.querySelectorAll('.zone').forEach(z => {
    z.querySelectorAll('.tile').forEach((t, k) => { t.disabled = true; if (k === right) t.classList.add('right'); else if (!t.classList.contains('wrong')) t.classList.add('dim'); });
  });
  drawScores();
  const target = a.mode === 'duel' ? DUEL_TARGET : BATTLE_TARGET;
  const champ = a.mode === 'duel' ? (Math.abs(a.rope) >= target ? (a.rope > 0 ? 1 : 2) : 0) : (a.scores.findIndex(s => s >= target) + 1);
  if (champ) return later(() => endArena(champ), 900);
  if (a.round >= (a.mode === 'duel' ? 25 : 30)) return later(() => endArena(leader()), 900);
  later(nextRound, winner ? 1000 : 1500);
}
function leader() {
  const a = arena;
  if (a.mode === 'duel') return a.rope > 0 ? 1 : a.rope < 0 ? 2 : 0;
  const best = Math.max(...a.scores);
  const tops = a.scores.filter(s => s === best);
  return tops.length > 1 ? 0 : a.scores.indexOf(best) + 1;
}

function endArena(champ) {
  const a = arena; a.state = 'end';
  bump('duo'); store.save(); checkTrophies();
  sfx.win(); buzz([40, 60, 80]);
  for (let p = 1; p <= a.n; p++) {
    const z = zone(p), won = p === champ;
    const w = document.createElement('div'); w.className = 'win';
    w.innerHTML = `<div><b>${champ === 0 ? 'Égalité' : won ? 'Gagné' : 'Perdu'}</b><span>${champ === 0 ? 'Personne ne lâche rien.' : won ? `Bravo ${esc(a.names[p - 1])} !` : `${esc(a.names[champ - 1])} l’emporte.`}</span>
      <div class="endbar"><button class="btn ink" data-ax="again">Revanche</button><button class="btn line" data-ax="leave">Quitter</button></div></div>`;
    z.appendChild(w);
  }
  a.el.querySelector('.arena-x').hidden = true;
}

function leaveArena() {
  const a = arena; if (!a) return;
  clearArenaTimers(); arena = null;
  closeOverlay(a.el);
  render();
}
function arenaBack() { // bouton retour du téléphone
  const a = arena; if (!a) return;
  clearArenaTimers(); arena = null; a.el.remove(); document.body.style.overflow = ''; render();
}

async function quitArena() {
  const a = arena; if (!a) return;
  if (a.state === 'end') return leaveArena();
  const was = a.state; clearArenaTimers(); a.state = 'pause';
  const ok = await confirmSheet('Arrêter la partie ?', 'Le score de cette partie sera perdu.', 'Arrêter', 'Reprendre');
  if (!arena) return;
  if (ok) leaveArena();
  else if (was === 'count') { a.el.querySelector('.count3')?.remove(); countdown(); }
  else { a.state = 'play'; nextRound(); }
}

document.addEventListener('pointerdown', e => {
  if (!arena) return;
  const t = e.target.closest('.tile');
  if (!t || !arena.el.contains(t)) return;
  e.preventDefault();
  tap(+t.closest('.zone').dataset.p, +t.dataset.t);
});
document.addEventListener('click', e => {
  if (!arena) return;
  const b = e.target.closest('[data-ax]'); if (!b || !arena.el.contains(b)) return;
  const act = b.dataset.ax;
  if (act === 'quit') quitArena();
  if (act === 'leave') leaveArena();
  if (act === 'again') {
    const { mode, n, lv, pool, names } = arena;
    clearArenaTimers(); const el = arena.el; arena = null; el.remove();
    startArena({ mode, n, lv, pool, names });
  }
});
document.addEventListener('keydown', e => { if (arena && e.key === 'Escape') { e.preventDefault(); quitArena(); } });
