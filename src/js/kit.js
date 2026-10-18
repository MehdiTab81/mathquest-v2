/* Icônes dessinées (24 px, trait 2), sons et vibrations. */

const ICONS = {
  play: '<path d="M7 4.5v15l12.5-7.5z"/>',
  duo: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18"/><path d="M9 7.5h6M9 16.5h6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  sound: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  flame: '<path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.1 2-5.2 3.6-6.7.4 1.6 1.3 2.6 2.4 3 0-3.3 1.4-5.9 3.5-7.7.4 2.6 1.6 4.3 3 5.9 1.1 1.3 1.5 3 1.5 4.6C19 17.9 15.9 21 12 21z"/>',
  bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  cross: '<path d="M6 6l12 12M18 6 6 18"/>',
  book: '<path d="M4 4.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  crowd: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5M14.5 14.3c.8-.4 1.6-.6 2.5-.6 2.6 0 4.5 2 4.5 5"/>',
  shuffle: '<path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.8-1.3 3.8-3M14 10c1-1.7 2.2-3 3.8-3H21"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  tablet: '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  del: '<path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
  sign: '<path d="M7 4v6M4 7h6M14 17h6"/><path d="M17 5 7 19"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5 6 3h4l2 5M15.5 10.5 18 3h-4l-2 5"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const sfx = (() => {
  let ctx = null;
  const tone = (f, d = .09, type = 'triangle', g = .06, at = 0) => {
    if (!store.d.sound) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime + at, o = ctx.createOscillator(), v = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(v).connect(ctx.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) { /* audio indisponible */ }
  };
  return {
    tap: () => tone(520, .04, 'sine', .03),
    good: () => { tone(660, .08); tone(990, .12, 'triangle', .06, .07); },
    combo: () => { tone(660, .07); tone(880, .07, 'triangle', .06, .06); tone(1320, .14, 'triangle', .06, .12); },
    bad: () => tone(170, .2, 'square', .035),
    tick: () => tone(880, .05, 'sine', .04),
    go: () => tone(1180, .25, 'triangle', .07),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .18, 'triangle', .06, i * .1)),
  };
})();
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* pas de vibreur */ } };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

function toast(text, ic = 'medal') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = icon(ic) + `<span>${esc(text)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function confirmSheet(title, text, yes, no = 'Continuer') {
  return new Promise(res => {
    const d = document.createElement('dialog');
    d.className = 'sheet';
    d.innerHTML = `<div class="in"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="acts"><button class="btn line" value="no">${esc(no)}</button><button class="btn ink" value="yes">${esc(yes)}</button></div></div>`;
    document.body.appendChild(d);
    const done = v => { d.close(); d.remove(); res(v); };
    d.addEventListener('click', e => { const b = e.target.closest('button'); if (b) done(b.value === 'yes'); else if (e.target === d) done(false); });
    d.addEventListener('cancel', e => { e.preventDefault(); done(false); });
    d.showModal();
    d.querySelector('[value="no"]').focus();
  });
}
