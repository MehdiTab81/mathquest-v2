# MathQuest

Automatismes de mathématiques au collège, de la 6e à la 3e (priorité 6e et 5e). Gratuit, sans compte, sans installation : tout tient dans `index.html`.

En ligne : https://mehditab81.github.io/mathquest/

## Ce que contient l'appli

- **≈ 4 500 questions** réparties par niveau et par chapitre, avec la méthode à chaque erreur et des figures dessinées (droite graduée, triangles, Thalès, parallèles, repère, diagramme circulaire…).
- **Entraînement** : 20 questions, correction et méthode après chaque erreur. Les notions où l'élève a moins de 60 % de réussite reviennent plus souvent.
- **Examen 9 minutes** : 20 questions chronométrées, relevé du temps par question et correction complète à la fin.
- **Duel à deux** (téléphone ou tablette) : les deux joueurs face à face, l'écran posé à plat. Même question, quatre réponses ; chaque bonne réponse pousse la ligne centrale vers l'adversaire. Trois bonnes réponses d'affilée : point double.
- **Battle 2 à 4 joueurs** (tablette) : chacun son coin d'écran, le premier à 5 points gagne.
- **Progrès** : niveau de joueur, jours d'affilée, médailles par chapitre (bronze, argent, or), notions à retravailler.

Sur ordinateur, les modes à plusieurs affichent un message : ils se jouent avec les doigts, sur téléphone ou tablette.

## Programmes

- **6e** : programme du cycle 3 en vigueur depuis la rentrée 2025 (BO n°16 du 17 avril 2025).
- **5e** : nouveau programme de la rentrée 2026 (BO n°10 du 5 mars 2026). Des automatismes ont été ajoutés : probabilités sous plusieurs écritures, 1 %, 10 %, 50 %, quadrilatères et triangles particuliers, nature des angles, ×10/÷1 000, retour à l'unité et linéarité (`src/data/complements-5e-2026.json`).
- **4e et 3e** : programme du cycle 4 de 2015 ajusté en 2020, jusqu'aux nouveaux programmes annoncés pour la 4e (rentrée 2027) et la 3e (rentrée 2028).

Relisez les intitulés au moment de chaque rentrée.

## Données personnelles

Aucun compte, aucune donnée envoyée. La progression reste dans le navigateur de l'élève (`localStorage`).

## Modifier l'appli

Le code lisible est dans `src/` ; `index.html` est généré.

```
src/index.html                 gabarit de la page
src/styles.css                 design (univers « Colorway » : un coloris par niveau)
src/js/core.js                 banque, progression, tirage des questions, vérification des réponses
src/js/kit.js                  icônes, sons, vibrations
src/js/figures.js              figures géométriques en SVG
src/js/screens.js              écrans Jouer, chapitre, À deux, Progrès
src/js/session.js              Entraînement et Examen
src/js/duo.js                  Duel et Battle
src/data/questions.json        banque de questions (extraite de l'ancienne version, gardée dans legacy/)
src/data/complements-5e-2026.json  questions ajoutées pour la 5e
```

Après une modification, régénérez `index.html` (Node.js requis) :

```
node tools/build.cjs
```

Pour tester en local : `python -m http.server 8795` puis ouvrez http://localhost:8795.

## Mettre en ligne

Déposez `index.html` à la racine du dépôt GitHub. Pages publie la branche `main` (Settings → Pages → Deploy from a branch).
