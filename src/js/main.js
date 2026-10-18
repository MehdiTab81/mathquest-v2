/* Démarrage. */
store.load();
document.documentElement.dataset.level = store.d.level;
window.addEventListener('hashchange', () => { if (!session && !arena) { render(); window.scrollTo(0, 0); } });
render();
cloudFlush();
window.addEventListener('online', cloudFlush);
if (/[?&]debug\b/.test(location.search)) window.__mq = { FIG, DATA, store, startSession, startArena, questionsOf, choicesFor, duoPool, arena: () => arena, session: () => session };
