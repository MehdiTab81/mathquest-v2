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
- **4e et 3e** : programme du cycle 4 de 2015 ajusté en 2020, jusqu'aux nouveaux programmes annoncés pour la 4e (rentrée 2027) et la 3e (rentrée 2028). Un audit a retiré les questions hors programme (vecteurs, quartiles, réunion et intersection d'événements) et reformulé le PGCD en « plus grand diviseur commun » : voir `AUDIT-4e-3e.md` et `src/data/corrections-cycle4.json`.

Pour recontrôler la banque (recalcul des réponses, QCM, doublons) : `node tools/check-questions.cjs`.

Relisez les intitulés au moment de chaque rentrée.

## Données personnelles

Sans suivi de classe : aucun compte, aucune donnée envoyée, la progression reste dans le navigateur de l'élève.

Avec le suivi de classe (Supabase) : l'élève donne seulement un prénom (ou un pseudo) et un code secret à 4 chiffres, stocké chiffré. Sont enregistrés : la réussite par notion (deux compteurs) et un résumé des 60 dernières séries. Ni e-mail, ni nom de famille, ni adresse IP stockée par MathQuest. Informez les familles et votre établissement (RGPD).

## Suivi des élèves avec Supabase (gratuit)

L'élève rejoint sa classe dans **Progrès → Rejoindre ma classe** (code de classe + prénom + code secret à 4 chiffres). Le professeur voit dans **Progrès → Espace professeur** : réussite de la classe, notions à retravailler, élèves à accompagner, et pour chaque élève ses points forts, ses points faibles, ses compétences et ses dernières séries.

Pour rester dans l'offre gratuite, MathQuest n'enregistre pas chaque réponse : un seul envoi par série, avec deux compteurs par notion. Une classe de 30 élèves sur une année occupe environ 1 à 2 Mo (l'offre gratuite en donne 500).

### 1. Créer le projet
1. Allez sur https://supabase.com, cliquez sur **Start your project** et connectez-vous (avec GitHub, c'est le plus simple).
2. Cliquez sur **New project**. Nom : `mathquest`. Choisissez un mot de passe de base de données (notez-le, l'appli ne s'en sert pas). Région : **West EU (Paris)** ou **Central EU (Frankfurt)**. Offre : **Free**. Cliquez sur **Create new project** et attendez environ 2 minutes.

### 2. Installer les tables
1. Menu de gauche : **SQL Editor** → **New query**.
2. Ouvrez le fichier `supabase/schema.sql` de ce dépôt, copiez tout son contenu et collez-le.
3. Cliquez sur **Run**. Le message « Success. No rows returned » doit s'afficher.

### 3. Régler la connexion des professeurs
1. Menu **Authentication** → **Sign In / Providers** : vérifiez que **Email** est activé.
2. Menu **Authentication** → **URL Configuration** : dans **Site URL**, mettez `https://mehditab81.github.io/mathquest-v2/` (c'est là que mène le lien de l'e-mail de confirmation).

### 4. Relier l'appli
1. Menu **Project Settings** → **API Keys** (ou bouton **Connect**) : copiez l'**URL du projet** (`https://xxxx.supabase.co`) et la **clé publique** (*Publishable key* `sb_publishable_…`, ou la clé `anon public` dans l'onglet *Legacy*). N'utilisez **jamais** la clé *secret* ou `service_role`.
2. Collez-les dans `src/cloud-config.json`, puis `node tools/build.cjs` et publiez `index.html`.

La clé publique peut être visible dans la page : elle ne permet que les actions prévues par `supabase/schema.sql` (rejoindre une classe, envoyer ses compteurs). Chaque professeur ne voit que ses classes.

### À savoir sur l'offre gratuite
- Un projet sans aucune activité pendant 7 jours est mis en pause : il se relance d'un clic depuis le tableau de bord Supabase (les données sont conservées).
- Taille occupée : SQL Editor → `select pg_size_pretty(pg_database_size(current_database()));`.
- L'artefact claude.ai ne peut pas joindre Supabase (sécurité de l'artefact) : le suivi de classe fonctionne sur la version GitHub Pages.

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
src/js/cloud.js                connexion Supabase, envoi des compteurs, compétences
src/js/prof.js                 « Ma classe » et Espace professeur
src/cloud-config.json          URL et clé publique Supabase
supabase/schema.sql            tables, droits et fonctions à installer dans Supabase
src/data/questions.json        banque de questions (extraite de l'ancienne version, gardée dans legacy/)
src/data/complements-5e-2026.json  questions ajoutées pour la 5e
src/data/corrections-cycle4.json   corrections de conformité 4e/3e (appliquées au build)
```

Après une modification, régénérez `index.html` (Node.js requis) :

```
node tools/build.cjs
```

Pour tester en local : `python -m http.server 8795` puis ouvrez http://localhost:8795.

## Mettre en ligne

Déposez `index.html` à la racine du dépôt GitHub. Pages publie la branche `main` (Settings → Pages → Deploy from a branch).
