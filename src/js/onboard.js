/* Première ouverture : choisir sa classe, puis le test de positionnement ou le jeu direct. */

let onboardEl = null;
function startOnboarding() {
  if (onboardEl) onboardEl.remove();
  onboardEl = document.createElement('div');
  onboardEl.className = 'onboard';
  onboardEl.setAttribute('role', 'dialog');
  onboardEl.setAttribute('aria-modal', 'true');
  onboardEl.setAttribute('aria-labelledby', 'ob-t');
  document.body.appendChild(onboardEl);
  document.body.style.overflow = 'hidden';
  onboardStep(1);
}
function onboardStep(n) {
  const lv = store.d.level;
  if (n === 1) {
    onboardEl.innerHTML = `<div class="ob-in">
      <div class="wordmark">MATH<span>QUEST</span></div>
      <h1 id="ob-t" class="display">Bienvenue</h1>
      <p class="ob-lead">Des automatismes de maths en séries de cinq minutes. Ta progression reste sur cet appareil.</p>
      <h2 class="cond">En quelle classe es-tu ?</h2>
      <div class="ob-levels">${LEVEL_IDS.map(id => `<button class="ob-level" data-level="${id}" data-ob-level="${id}"><b>${LEVELS[id].short}</b><span>${LEVELS[id].name}</span></button>`).join('')}</div>
    </div>`;
    onboardEl.querySelector('.ob-level').focus();
  } else {
    document.documentElement.dataset.level = lv;
    onboardEl.innerHTML = `<div class="ob-in">
      <div class="wordmark">MATH<span>QUEST</span></div>
      <h1 id="ob-t" class="display">${LEVELS[lv].short}, c’est parti</h1>
      <p class="ob-lead">Par quoi veux-tu commencer ?</p>
      <div class="modes">
        <button class="mode" data-ob="place"><span class="ico">${icon('chart')}</span><span><b>Test de positionnement</b><small>${placementQuestions(lv).length} questions, sans chrono, environ 5 minutes. MathQuest saura par où commencer.</small></span>${icon('next')}</button>
        <button class="mode" data-ob="play"><span class="ico">${icon('play')}</span><span><b>Jouer tout de suite</b><small>Tu pourras faire le test plus tard depuis l’accueil.</small></span>${icon('next')}</button>
        ${cloudOn() ? `<button class="mode" data-ob="class"><span class="ico">${icon('crowd')}</span><span><b>J’ai un code de classe</b><small>Ton professeur suivra tes progrès.</small></span>${icon('next')}</button>` : ''}
      </div>
      <p class="ob-foot"><button class="link" data-ob="settings">Besoin d’aménagements (police dys, lecture à voix haute, tiers-temps) ?</button></p>
      <p class="ob-foot"><button class="link" data-ob="back">${icon('back', 'sm')} Changer de classe</button></p>
    </div>`;
    onboardEl.querySelector('.mode').focus();
  }
}
function endOnboarding() {
  store.d.onboarded = true; store.save();
  if (onboardEl) { onboardEl.remove(); onboardEl = null; }
  document.body.style.overflow = '';
}
document.addEventListener('click', e => {
  if (!onboardEl || !onboardEl.contains(e.target)) return;
  const lvB = e.target.closest('[data-ob-level]');
  if (lvB) { store.d.level = lvB.dataset.obLevel; store.save(); onboardStep(2); return; }
  const b = e.target.closest('[data-ob]'); if (!b) return;
  const act = b.dataset.ob;
  if (act === 'back') return onboardStep(1);
  endOnboarding();
  if (act === 'place') startPlacement(store.d.level);
  else if (act === 'class') go('#/progres');
  else if (act === 'settings') go('#/reglages');
  else render();
});
