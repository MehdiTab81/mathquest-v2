---
name: MathQuest
description: Automatismes de maths au collège, un coloris par niveau.
colors:
  sail: "#F4F3EF"
  paper: "#FFFFFF"
  ink: "#111111"
  ink-2: "#4A4842"
  ink-3: "#6B685F"
  line: "#D9D6CC"
  shade: "#E7E5DD"
  volt: "#D4FF3A"
  university-blue: "#5B9BFF"
  grape: "#A47BFF"
  infrared: "#FF5A36"
  ok: "#2FD67B"
  bad: "#FF4040"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "min(40px, fitted to the longest word)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  numeral:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "320px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  question:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(26px, 7.2vw, 40px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  cell: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "52px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "52px"
  segmented-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    rounded: "{rounded.pill}"
  key:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "clamp(48px, 7.5vh, 64px)"
  key-validate:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    rounded: "{rounded.md}"
  choice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px 8px 12px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "52px"
  tab-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.volt}"
    height: "64px"
---

# Design System: MathQuest

## Overview

**Creative North Star: "Colorway"**

MathQuest borrows its grammar from sneaker drops: every level owns a signature colourway, the way a shoe release owns its colours, and every game launches like a drop with a 3·2·1 countdown. The ground is a warm voile (sail), the ink is almost black, and one saturated colourway per level fills whole regions of the screen instead of decorating corners.

The screens stay working screens. Navigation, segmented controls, lists, a numeric keypad and four-choice tiles are the standard controls a 12-year-old already knows; the world shows up only through type (a variable grotesque pushed to condensed black caps), the colourway fields, the dense size-run cells that show mastery, and the full-screen inversion that greets a right answer.

Density is low on the phone (one task per screen, thumb-sized targets) and opens into a two-column layout on a computer, with the colourway block held sticky on the left.

**Key Characteristics:**
- One colourway per level, applied as a full-bleed field, never as a tint.
- Ink on colourway, colourway on ink: two-tone pairs, no gradients.
- A giant cropped level numeral as the signature on the home and chapter screens.
- Mastery shown as four "size-run" cells: started, bronze, silver, gold.
- Tabular figures everywhere numbers live.

## Colors

A committed two-tone system: sail and ink carry the interface, one saturated colourway per level owns the hero field and the selected states.

### Primary
- **Volt** (#D4FF3A): the 6e colourway and player 1 in two-player modes; hero field, selected text on ink, current cell.
- **University Blue** (#5B9BFF): the 5e colourway and player 3.
- **Grape** (#A47BFF): the 4e colourway and player 4.
- **Infrared** (#FF5A36): the 3e colourway and player 2.

### Neutral
- **Sail** (#F4F3EF): page ground.
- **Paper** (#FFFFFF): surfaces that receive input (keys, choices, fields, correction panel).
- **Ink** (#111111): text, 2px rules, primary buttons, tab bar, filled cells.
- **Graphite** (#4A4842): secondary text on sail (≥ 7:1).
- **Stone** (#6B685F): figure annotations.
- **Rule Grey** (#D9D6CC) and **Shade** (#E7E5DD): hairlines, segmented-control track, function keys.

### Semantic
- **Right** (#2FD67B) and **Wrong** (#FF4040): always paired with an icon or a word, never colour alone.

### Named Rules
**The One Colourway Rule.** A screen shows the colourway of exactly one level (or one colour per player in shared-screen modes). The variable `--lv` carries it; never hard-code a second level colour into a level screen.

**The Two-Tone Rule.** Colour pairs are ink on colourway or colourway on ink. No gradients, no tints, no glow.

## Typography

**Display Font:** Archivo variable (width 62–125, weight 400–900), system-ui fallback
**Body Font:** Archivo at normal width

**Character:** one family stretched across its width axis: condensed black capitals shout titles and numerals like a shoe box label, normal width keeps maths legible.

### Hierarchy
- **Numeral** (900, width 62, 320px phone / 400px desktop, line-height 1): the level number, cropped by the edge of the colourway block.
- **Display** (900, width 75, up to 40px phone / 72px desktop, fitted so the longest word never crosses the numeral): chapter titles in caps.
- **Headline** (900, width 75, 24px, caps): section headings.
- **Question** (700, 26–40px; 44–72px for short prompts): the maths itself, sentence case, balanced.
- **Title** (800, 17px): list rows, mode names.
- **Body** (500, 15px, 1.4): explanations, methods, max 70ch.
- **Label** (700, 13px): notion names, metadata.

### Named Rules
**The Tabular Rule.** Every number is set with tabular figures (`font-variant-numeric: tabular-nums`).

**The French Maths Rule.** Decimal comma, true minus sign (−), stacked fractions, non-breaking space before `: ? ! ; =`.

## Layout

Phone first. A 16px side gutter, an 8px module for every gap and padding (4, 8, 12, 16, 24, 32). The tab bar (Jouer / À deux / Progrès) sits at the bottom on phones and moves into the header from 900px, where screens become two columns (5fr / 6fr, 32px gap) with the colourway block sticky on the left. Game screens are full-screen overlays capped at 560px wide. Shared-screen modes fill the viewport and size their content with container query units so a shrinking half never overlaps.

## Elevation & Depth

Flat. No shadows. Depth comes from 2–3px ink borders, the ink tab bar and full-screen overlays. Dialogs sit on a 60% ink scrim.

## Shapes

Pills (999px) for buttons, segmented controls and status pills; 12px for keys and inputs; 16px for cards, choices and panels; 4px for the mastery cells. Rules between rows are 2px ink lines, the size-run cells are tall rectangles (16×24px) with 2px ink outlines.

## Components

### Buttons
- **Shape:** pill (999px), 52px tall.
- **Primary:** ink background, colourway text, 800 weight 17px.
- **Outline:** 2px ink border on transparent.
- **Pressed:** scale 0.97.

### Segmented controls
- **Style:** shade track, ink pill for the selected option with colourway text. Used for level, mode and player count.

### Rows and mastery cells
- **Style:** full-width rows separated by 2px ink rules; title, metadata, four cells on the right (filled ink = reached, colourway = next step).

### Keypad
- **Style:** 4×4 grid, paper keys with 2px ink border, shade function keys, an ink "Valider" key spanning two columns. Physical keyboard keys light the matching key.

### Answer tiles (duel and battle)
- **Style:** sail tiles with 3px ink border on the player's colourway. Right turns green, wrong turns ink with red text, the rest dims.

### Inversion flash (signature)
- A right answer floods the game area with ink and a giant condensed "JUSTE" (or ×3 for a streak) in the colourway, revealed by a vertical clip, 420ms, then fades.

### Duel rope (signature)
- The centre line between the two halves is the rope: every point moves it, growing the scorer's half by 5% (up to 75/25). A knot on the line shows the lead and the line itself drains as the round timer.

### Today rows
- Paper mode rows under « Aujourd’hui » on the home screen (révisions, défi, chrono, positionnement). A homework row takes the level colourway as its ground. A count or score sits in an ink badge with colourway text.

### Tier pips
- Three small ink-outlined cells next to each question show its tier (1 to 3), filled in ink up to the tier.

### Switch
- 60 × 34px track, 2px ink border, ink knob; on = colourway track. Disabled (imposed by the teacher) at 55% opacity with a colourway « Réglé par ton professeur » chip.

### Fiche (method sheet)
- Paper card, 2px ink border, 16px radius: condensed caps notion title, bold method line, worked examples split by hairlines with the answer right-aligned in 900 weight.

### Trophy
- Locked: hairline border, lock icon on shade. Unlocked: ink border, paper ground, icon in colourway on ink.

### Onboarding
- Full-screen colourway field; level choices are four tiles, each in its own level colourway with a 56px condensed numeral.

### Dys reading mode
- Reading text switches to Atkinson Hyperlegible with +0.02em tracking and 1.6 leading; the wordmark, numerals and condensed headings keep Archivo so the world stays recognisable.

## Do's and Don'ts

### Do:
- **Do** give each level its colourway through `--lv` only.
- **Do** keep targets at 48px or more and the keypad within thumb reach.
- **Do** pair every right/wrong colour with an icon or a word.
- **Do** honour `prefers-reduced-motion`: the flash and countdown become static.

### Don't:
- **Don't** add gradients, glows, glass or drop shadows.
- **Don't** use emoji as icons; icons are 24px stroked SVG at 2px.
- **Don't** put a kicker or eyebrow above a heading.
- **Don't** let display type overlap the level numeral: fit it with `--tw`.
