# Audit des questions de 4e et 3e

Date : 18 octobre 2026. Référence : programme de mathématiques du cycle 4 (BO spécial n°11 du 26 novembre 2015, ajusté en 2020) et repères annuels de progression (BO n°22 du 29 mai 2019). Ce programme reste en vigueur en 4e jusqu'à la rentrée 2027 et en 3e jusqu'à la rentrée 2028.

## Méthode

1. **Contenus** : chaque notion de la banque (1 233 questions en 3e, 1 411 en 4e, révisions comprises) a été confrontée au texte officiel du programme.
2. **Exactitude** : `tools/check-questions.cjs` recalcule toutes les questions purement numériques (1 065 calculs, tous niveaux confondus), vérifie que chaque QCM contient sa bonne réponse et sans option en double, et cherche les doublons contradictoires. Résultat : aucune erreur.
3. **Lecture** : une question par notion a été relue à la main (énoncé, réponse, méthode).

## Corrections appliquées

Les corrections sont dans `src/data/corrections-cycle4.json` et s'appliquent à chaque build : la banque d'origine reste intacte.

| Notion | Décision | Raison |
|---|---|---|
| Vecteurs (5 questions, 3e) | Retirées | Absents du programme du cycle 4 (programme de 2de). |
| Statistiques : quartiles (4, 3e) | Retirées | Le programme cite moyenne, médiane, étendue. |
| Probabilité : réunion et intersection (3, 3e) | Retirées | P(A ∪ B), P(A ∩ B) relèvent de la 2de. |
| Probabilités : ensembles, ∩, ∪, ensemble vide (6 en tout, avec les révisions) | Retirées | Notations ensemblistes de 2de. La question sur l'événement contraire est gardée. |
| PGCD (12, 3e et brevet) | Reformulées | Le programme ne nomme plus le PGCD : « Plus grand diviseur commun de a et b ? », avec la méthode par décomposition en facteurs premiers. |
| « Même série : la moyenne… » (4e et 3e) | Réécrite | La question dépendait de la précédente. |
| Dénombrement « 3 lettres × 10 chiffres » | Réécrite | Énoncé ambigu. |

Bilan : 18 questions retirées, 15 reformulées ; 4 494 questions publiées.

## Vérifié et conservé

- **Inéquations du premier degré** (3e) : présentes dans le programme (« équations ou inéquations du premier degré »).
- **Trigonométrie** sinus, cosinus, tangente ; **Thalès** ; **homothétie** ; **sphère et boule** ; **latitude et longitude** ; **identités remarquables** pour factoriser une équation produit ; **racine carrée** et carrés parfaits jusqu'à 144 ; **préfixes de nano à giga** ; **nombres premiers** et décomposition.
- **Fonction x ↦ x²** : gardée comme fonction donnée par une formule (images, antécédents en lien avec l'équation x² = a).
- **Effectifs cumulés** : gardés comme outil pour la médiane.

## À surveiller

- Le brevet 2026 comporte une première partie « automatismes » (6 points, 20 minutes, sans calculatrice). Le chapitre « Spécial Brevet » s'en rapproche ; la liste indicative officielle d'octobre 2025 pourra servir à le compléter.
- Nouveaux programmes : 4e à la rentrée 2027, 3e à la rentrée 2028. Refaire cet audit à leur publication.
