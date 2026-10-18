# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JavaScript, no build step at runtime, published as a single `index.html` on GitHub Pages (https://mehditab81.github.io/mathquest/). Source lives in `src/`; `tools/build.cjs` inlines it into `index.html`. Chosen by the maintainer: "reconstruire proprement".

## Users

- **Collège students, 6e to 3e, priority on 6e and 5e (11–13 ans).** They open the app on their own phone, a family tablet, or a school computer, alone or with a friend, for short sessions (2–10 minutes): homework rituals, revision before a test, or playing against a classmate.
- **Their maths teacher** (the maintainer is one) recommends it and uses it in class; no teacher dashboard is in scope.

## Product Purpose

MathQuest trains the *automatismes* of the French collège maths programmes: quick, reliable recall of facts and procedures (tables, fractions, relatifs, conversions, proportionnalité, angles…). Success = students come back on their own, play often in short bursts, and their success rate per notion rises.

## Positioning

A free, account-free, installable-feeling web app whose question bank (≈4 400 questions with method hints and generated figures) follows the current official programmes chapter by chapter, and which turns automatismes into a game two kids can play on one device.

## Operating Context

- Phone in portrait is the primary device; tablets and laptops must work equally well.
- Two-player modes share one device: phone or tablet laid flat between players (duel, top half rotated 180°), tablet for 3–4 players (battle buzzers). These modes need a touch screen and say so on a computer.
- Used in noisy classrooms and at home; sound must be optional.

## Capabilities and Constraints

- Levels: 6e, 5e, 4e, 3e. Chapters per level with notions (categories) mapped by prefix. 5e/4e/3e include an "entretien" set of earlier-level questions.
- Modes kept: **Entraînement** (20 questions, correction and method after each error), **Examen** (20 questions, 9 minutes, correction at the end), **Duel 2 joueurs** (same screen), **Battle 2 à 4 joueurs** (buzzers). Projection classe was dropped.
- Answers: numeric keypad with comma, fraction bar, sign; tolerant numeric comparison; QCM for non-numeric answers.
- Progress (XP, level, streak, medals per chapter, success per notion) stored in `localStorage` only. No accounts, no server, no personal data (RGPD argument).
- Programmes: 6e = cycle 3 programme in force since rentrée 2025 (BO n°16, 17 avril 2025). 5e = new cycle 4 programme in force rentrée 2026 (BO n°10, 5 mars 2026). 4e (2027) and 3e (2028) still follow the 2015/2020 cycle 4 programme until their new programme applies.

## Brand Commitments

- Name: **MathQuest**. Language: French, tutoiement, short encouraging sentences, no condescension.
- Mathematical writing follows French conventions: decimal comma, `−` minus sign, `×`, `÷`, units with spaces.

## Evidence on Hand

- Question bank extracted from the previous release: `src/data/questions.json` (legacy build kept in `legacy/index.html`).
- No testimonials, usage numbers, or institutional endorsement exist; never invent them.

## Product Principles

1. Every second of a session is maths: no menus deeper than two taps between home and a question.
2. Mistakes teach: a wrong answer always shows the right one and the method.
3. Faithful to the programmes: chapter names and notions follow the BO of each level.
4. Play is the hook, never the point: rewards celebrate effort and progress, not just speed.
5. Works offline-ish, instantly, on a cheap phone.

## Accessibility & Inclusion

Large touch targets (≥ 48 px), legible maths typography, WCAG AA contrast, `prefers-reduced-motion` respected, sound off switch, colour never the only signal for right/wrong, keyboard play on computers.
