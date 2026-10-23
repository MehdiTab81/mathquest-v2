/* Démarrage. */
store.load();
document.documentElement.dataset.level = store.d.level;
applyPrefs();
window.addEventListener('hashchange', () => { if (!session && !arena) { render(); window.scrollTo(0, 0); } });
render();
if (!store.d.onboarded) startOnboarding();
cloudFlush();
cloudSync();
if (canSpeak()) try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch (e) { /* voix chargées plus tard */ }
window.addEventListener('online', cloudFlush);
if (/[?&]debug\b/.test(location.search)) window.__mq = { FIG, DATA, store, startSession, startArena, questionsOf, choicesFor, duoPool, arena: () => arena, session: () => session, cloudSync, pupil };
