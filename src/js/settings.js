/* Réglages et aménagements (PAP, PPS, élèves dys) : police adaptée, taille du texte,
   lecture à voix haute, tiers-temps ou sans chrono, animations réduites.
   Un aménagement décidé par le professeur (Espace prof) s'impose et ne peut pas être retiré par l'élève. */

const PREF_DEFAULTS = { dys: false, size: 1, tts: false, autoRead: false, time: 1, calm: false };
function teacherAdapt() { return (store.d.cloud && store.d.cloud.adapt) || {}; }
function prefsEff() {
  const p = Object.assign({}, PREF_DEFAULTS, store.d.prefs || {});
  const a = teacherAdapt();
  if (a.dys) p.dys = true;
  if (a.tts) p.tts = true;
  if (a.time === 0 || a.time > 1) p.time = a.time;
  if (a.size > 1) p.size = Math.max(p.size, a.size);
  return p;
}
const lockedBy = key => { const a = teacherAdapt(); return key === 'time' ? (a.time === 0 || a.time > 1) : !!a[key]; };
function applyPrefs() {
  const p = prefsEff(), root = document.documentElement;
  root.classList.toggle('a-dys', !!p.dys);
  root.classList.toggle('a-calm', !!p.calm);
  root.style.setProperty('--tscale', String(p.size || 1));
}
/* Durée d'un chrono selon l'aménagement : × 4/3 pour le tiers-temps, null sans chrono. */
function timed(ms) { const t = prefsEff().time; return t === 0 ? null : Math.round(ms * (t || 1)); }

/* ---------- Lecture à voix haute (synthèse vocale du navigateur, en français) ---------- */
const canSpeak = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
function speakable(text) {
  return String(text)
    .replace(/km\/h/g, ' kilomètres par heure').replace(/m\/s/g, ' mètres par seconde')
    .replace(/(\d)\s*cm²/g, '$1 centimètres carrés').replace(/(\d)\s*m²/g, '$1 mètres carrés').replace(/(\d)\s*cm³/g, '$1 centimètres cubes')
    .replace(/\bcm²/g, 'centimètres carrés').replace(/\bm²/g, 'mètres carrés').replace(/\bcm³/g, 'centimètres cubes')
    .replace(/(\d|\()\s*(km|cm|mm|kg)\b/g, (m, a, u) => `${a} ${{ km: 'kilomètres', cm: 'centimètres', mm: 'millimètres', kg: 'kilogrammes' }[u]}`)
    .replace(/\(cm\)/g, 'en centimètres').replace(/\(°\)/g, 'en degrés').replace(/\(%\)/g, 'en pourcentage')
    .replace(/(\d+|\?)\/(\d+|\?)/g, (m, a, b) => `${a === '?' ? 'combien' : a} sur ${b === '?' ? 'combien' : b}`)
    .replace(/=\s*\?/g, ' égale combien ?')
    .replace(/×/g, ' fois ').replace(/÷/g, ' divisé par ')
    .replace(/(^|[\s(;])[−-](?=\d)/g, '$1moins ')
    .replace(/−/g, ' moins ').replace(/\s-\s/g, ' moins ').replace(/(\d|\))-(?=[\d(])/g, '$1 moins ')
    .replace(/\+/g, ' plus ').replace(/=/g, ' égale ').replace(/≈/g, ' environ ')
    .replace(/²/g, ' au carré').replace(/³/g, ' au cube').replace(/√/g, 'racine carrée de ')
    .replace(/%/g, ' pour cent').replace(/π/g, 'pi').replace(/°/g, ' degrés').replace(/€/g, ' euros')
    .replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
}
function speak(text) {
  if (!canSpeak()) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.lang = 'fr-FR'; u.rate = .92;
    const v = speechSynthesis.getVoices().find(x => /^fr(-|_)FR/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^fr/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
function stopSpeaking() { try { if (canSpeak()) speechSynthesis.cancel(); } catch (e) { /* rien */ } }
function readQuestion(q, choices) {
  let t = promptOf(q);
  if (choices) t += '. ' + choices.map((c, i) => `Réponse ${'ABCD'[i]} : ${c}`).join('. ');
  return speak(t);
}

/* ---------- Écran Réglages ---------- */
const sw = (key, label, help) => {
  const p = prefsEff(), locked = lockedBy(key);
  return `<div class="setting"><div><b id="lb-${key}">${label}</b><small>${help}${locked ? ' <span class="lock-chip">Réglé par ton professeur</span>' : ''}</small></div>
    <button class="switch" role="switch" aria-checked="${!!p[key]}" aria-labelledby="lb-${key}" data-pref="${key}" ${locked ? 'disabled' : ''}><i></i></button></div>`;
};
function settingsView() {
  const p = prefsEff();
  const segPref = (key, opts) => `<div class="seg" role="group" aria-labelledby="lb-${key}">${opts.map(([v, t]) => `<button data-pref-val="${key}:${v}" aria-pressed="${p[key] === v}" ${lockedBy(key) ? 'disabled' : ''}>${t}</button>`).join('')}</div>`;
  return `${topBar()}
  <div class="layout"><div class="side">
    <section class="drop slim" aria-labelledby="rg-t"><h1 id="rg-t" style="--tw:9">Réglages</h1>
      <p>Adapte MathQuest à ta façon de lire et de travailler. Ces réglages restent sur cet appareil.</p></section>
  </div><div class="main">
    <div class="sec"><h2>Lecture</h2></div>
    <div class="settings">
      ${sw('dys', 'Police adaptée', 'Lettres plus faciles à distinguer, plus d’espace entre elles. Conseillée pour les élèves dys.')}
      <div class="setting col"><div><b id="lb-size">Taille des questions</b><small>Agrandit les questions et les réponses pendant les séries.${lockedBy('size') ? ' <span class="lock-chip">Réglé par ton professeur</span>' : ''}</small></div>
        ${segPref('size', [[1, 'Normale'], [1.2, 'Grande'], [1.4, 'Très grande']])}</div>
      ${canSpeak() ? `${sw('tts', 'Lecture à voix haute', 'Un bouton « Écouter » lit la question et les réponses.')}
      ${p.tts ? sw('autoRead', 'Lire chaque question automatiquement', 'La question est lue dès qu’elle s’affiche.') : ''}
      ${p.tts ? '<div class="setting"><div><b>Tester la voix</b><small>Mets le son de l’appareil.</small></div><button class="btn line" data-act="tts-test">Écouter</button></div>' : ''}`
        : '<p class="note" style="margin:0">La lecture à voix haute n’est pas disponible sur ce navigateur.</p>'}
    </div>
    <div class="sec"><h2>Temps</h2></div>
    <div class="settings">
      <div class="setting col"><div><b id="lb-time">Chronomètres</b><small>Examen, défi chronométré et manches à deux.${lockedBy('time') ? ' <span class="lock-chip">Réglé par ton professeur</span>' : ''}</small></div>
        ${segPref('time', [[1, 'Normal'], [1.33, 'Tiers-temps'], [0, 'Sans chrono']])}</div>
    </div>
    <div class="sec"><h2>Confort</h2></div>
    <div class="settings">
      ${sw('calm', 'Animations réduites', 'Moins de mouvements à l’écran.')}
      <div class="setting"><div><b id="lb-snd">Sons</b><small>Bips de bonne et de mauvaise réponse.</small></div>
        <button class="switch" role="switch" aria-checked="${!!store.d.sound}" aria-labelledby="lb-snd" data-act="sound"><i></i></button></div>
    </div>
    <div class="sec"><h2>Recommencer</h2></div>
    <p class="note" style="margin-top:0">Revoir l’écran d’accueil et choisir à nouveau ton niveau.</p>
    <div class="note"><button class="link" data-act="onboard-again">Revoir l’accueil</button></div>
  </div></div>`;
}

app.addEventListener('click', e => {
  const t = e.target.closest('[data-pref], [data-pref-val], [data-act="tts-test"], [data-act="onboard-again"]');
  if (!t || t.disabled) return;
  store.d.prefs ||= {};
  if (t.dataset.pref) store.d.prefs[t.dataset.pref] = !prefsEff()[t.dataset.pref];
  if (t.dataset.prefVal) { const [k, v] = t.dataset.prefVal.split(':'); store.d.prefs[k] = Number(v); }
  if (t.dataset.act === 'tts-test') { speak('Combien font 7 fois 8 ? Réponse : 56.'); return; }
  if (t.dataset.act === 'onboard-again') { store.d.onboarded = false; store.save(); startOnboarding(); return; }
  store.save(); applyPrefs(); render();
});
