---
version: alpha
name: Interflow Bold-Mono — Frame (video / frame layer)
description: >
  Video frame layer for Interflow Video Copy. Authored from brand/FRAME.md (Bold-Mono V1.0),
  not a stock preset. Unit is the 9:16 frame (1080×1920). Atoms are sacred — near-black ground,
  pure-white type + texture, ONE red (#E63946) used exactly once per frame as a ≤0.6em icon inside
  a giant line, UPPERCASE Anton English giants, Noto Sans SC 900 Chinese giants at letter-spacing 0,
  Archivo tracked micro-labels at ≤1/8 the giant, waveline texture at 0.10 in one bottom corner, and
  a static character corner mark bottom-left. Motion is low-frequency and never competes with the giant.
unit: the frame — 1080×1920 (9:16) primary
principle: atoms are sacred · one statement per frame · the giant IS the composition

# NOTE (2026-07-20): typography/motion prose below predates the v2 upgrade — the operative spec
# is generator-base COMMON + references/frame-recipes.md ("设计 DNA v2" + "动效系统").
# This file's COLOR KEYS remain load-bearing for the caption-skin pipeline; do not rename them.
# NOTE ON COLOR KEY NAMES (load-bearing for the pipeline):
# `ink` = the FOREGROUND (white) — captions map --cap-ink to it as light text on the dark ground.
# `canvas` = the GROUND (near-black) — assemble-index paints #root with it; captions map --cap-canvas.
# This inversion is intentional so a DARK brand gets a dark video ground AND light caption text.
colors:
  ink: "#FFFFFF"        # PAPER — all type + texture. foreground. approx 28% of frame.
  canvas: "#0A0A0A"     # INK — background ground. near-black, no gradient, no glow. approx 70%.
  signal: "#E63946"     # SIGNAL — the only accent. exactly once per frame, <=0.6em icon. <=2%.
  muted: "#9A9A9A"      # secondary text / dimmed caption words. low-chroma grey.

typography:
  # role: { fontFamily, cqw (=percent of 1080 width), weight, lineHeight, tracking, upper }
  # — reading + chrome ramp —
  body:    { fontFamily: "Noto Sans SC", cqw: 2.4, weight: 400, lineHeight: 1.7 }
  caption: { fontFamily: "Noto Sans SC", cqw: 3.6, weight: 700, lineHeight: 1.25 }
  label:   { fontFamily: "Archivo", cqw: 1.9, weight: 500, tracking: "0.30em", upper: true }
  wide:    { fontFamily: "Archivo", cqw: 2.0, weight: 500, tracking: "0.33em", upper: true }
  # — giant / hero ramp —
  giant-cn:{ fontFamily: "Noto Sans SC", cqw: 17.0, weight: 900, lineHeight: 1.0, tracking: "0em" }
  display: { fontFamily: "Anton", cqw: 24.0, weight: 400, lineHeight: 0.9, tracking: "-0.02em", upper: true }
  hand:    { fontFamily: "Mr Dafoe", cqw: 6.0, weight: 400, lineHeight: 1.0 }

spacing:
  # all as a fraction of frame HEIGHT (H=1920) unless noted
  safe-top: "0.12H"      # 230px
  safe-side: "0.04W"     # 43px  (W=1080)
  caption-band: "0.1667H bottom"   # 320px keep-out — NO frame content below y=1600
  card-margin: "0.06H"   # >=115px — every card outer margin
  label-to-giant: "0.15 x giant font-size"
  giant-to-wide: "0.12 x giant font-size"

components:
  giant-en:
    typography: "{typography.display}"
    rule: "one English word/short phrase, UPPERCASE, width >=88% of frame; size to fit, never stretch."
    description: "The Anton hero. One giant moment per frame."
  giant-cn:
    typography: "{typography.giant-cn}"
    rule: "Chinese giant, Noto Sans SC 900, letter-spacing 0, line-height 1.0, width >=88%."
    description: "Chinese hero. Wide tracking is forbidden on Chinese — it falls apart."
  micro-label:
    typography: "{typography.label}"
    rule: "font-size <= giant / 8. UPPERCASE, 0.30em tracking. Never enlarge to fix legibility — use position + whitespace."
    description: "The 1:8 reversal — the core tension of the system."
  signal-icon:
    color: "{colors.signal}"
    size: "approx 0.6em, replaces exactly one glyph slot inside a giant line"
    rule: "exactly ONE per frame. Never on text, borders, backgrounds, or a second icon."
    description: "The lone red. A play-triangle in a rounded square is the canonical mark."
  texture:
    stroke: "{colors.ink} 1px"
    opacity: 0.10
    rule: "12-13 parallel wavelines, <=0.35W x <=0.28H, one bottom corner only, rotate -6~-8deg. Clip where any glyph crosses it. Never behind captions, never full-bleed."
    description: "The only background ornament."
  character-mark:
    asset: "public/character.svg"
    placement: "bottom-left, above the caption band. STATIC — no float/sway/blink."
    size: "height 220px FIXED (never scale), width auto approx 172px"
    box: "left 48px · bottom 1560px (40px above band top 1600) · so top 1340px"
    rule: "present + identical on EVERY frame, full duration. No frame type or card enters its box."
    description: "Persistent corner mascot. Overrides brand/FRAME.md idle-motion tokens per this build."
  hand-signature:
    typography: "{typography.hand}"
    placement: "bottom-right, above caption band, rotate -4deg"
    description: "Optional. One per video, not per frame — reserve for the closing frame."
---

# Interflow Bold-Mono — Frame (video / frame layer)

## Overview

Interflow at frame scale is a **near-black Swiss poster where one white giant fills the field and a
single red icon punctures it once.** The whole system is built on one reversal: the giant is enormous
(>=88% of the frame width) and the label is tiny (<= 1/8 of the giant). Nothing between them. Red appears
exactly once, as a <=0.6em icon standing in for a single character inside the giant line — never as text,
never as a fill, never twice.

**Anton** carries English giants (UPPERCASE, -0.02em, line-height 0.9). **Noto Sans SC 900** carries
Chinese giants (**letter-spacing 0**, line-height 1.0). **Archivo 500** carries the micro-label and the
wide-spaced English word row (0.30-0.33em, UPPERCASE) — wide tracking belongs to English only. **Mr Dafoe**
is the handwritten signature, one per video.

**Key characteristics at frame scale:**

- **One giant moment per frame** at >=88% width; the label is <=1/8 its size — hold that gap.
- **Near-black ground `{colors.canvas}` only.** No gradient, no glow, no second ground.
- **White is everything else** — type and texture. No drop shadow, no stroke on type.
- **Red `{colors.signal}` exactly once** — a <=0.6em icon inside the giant line.
- **Waveline texture at 0.10**, one bottom corner, clipped off any glyph.
- **Static character corner mark**, bottom-left, every frame, never animated, never scaled.

## Canvas, Safe Area & Caption Band

- **Frame:** 1080x1920 (9:16). Author frame-relative sizes in **`cqw`/`cqh`** against a
  `container-type: size` root — never `vw`.
- **Safe area:** top/bottom **0.12H** (230px), left/right **0.04W** (43px). Nothing vital outside it.
- **Caption band:** the bottom **16.67% (320px, y>=1600)** is a keep-out strip owned by burned-in
  captions. **No frame content — no giant, no card, no texture — enters it.** Foreground ends at y<=1580.
- **Character box** (bottom-left, above band): left 48 · top 1340 · 172x220px. No type/card enters it.

## Colors

Two-value ground system. **Ground** `{colors.canvas}` (#0A0A0A near-black). **Foreground** `{colors.ink}`
(#FFFFFF) for all type + texture. **`{colors.signal}`** (#E63946) is the lone accent, once per frame, as a
small icon inside the giant. `{colors.muted}` (#9A9A9A) is only for secondary support text or dimmed
(not-yet-spoken) caption words. **No second hue, ever.** Red never becomes text, border, background, or a
second icon. Red is always the smallest element on screen.

## Typography

Two ramps. The **giant ramp** (`display` Anton EN / `giant-cn` Noto 900 CN) carries the one statement;
the **micro ramp** (`label`/`wide` Archivo, `body`/`caption` Noto) carries chrome + support.

- **Fit the giant to >=88% width** by choosing font-size, never by stretching or letter-spacing.
- **1:8 is law:** `label` <= `giant / 8`. If a label reads small, move it or add whitespace — do not enlarge.
- **English giant** = Anton, UPPERCASE, -0.02em, line-height 0.9. **Chinese giant** = Noto Sans SC 900,
  **letter-spacing 0**, line-height 1.0. Wide tracking (0.30em+) is **English-only**.

## Depth & Surface

Flat. No box-shadow, no radius, no gradient, no glow. Hierarchy comes only from **size** (the 8x giant),
**weight**, and **negative space**. The single red icon is the only color event.

## Texture

Waveline grid — `{colors.ink}` 1px strokes, 12-13 parallel waves, **opacity 0.10**, confined to one
bottom corner (<=0.35W x <=0.28H), rotated -6~-8deg. Clip it wherever a glyph crosses; it never sits behind
captions and never tiles the field. It is decoration in one corner, nothing more.

## Character Corner Mark

Inline `public/character.svg` **static** in the bottom-left of every frame, identical placement, for the
full duration: **height 220px (never scale), left 48px, bottom edge y=1560** (40px above the caption band).
Its brand idle-motion tokens (float/sway/blink) are **disabled for this build** — it does not move. No giant,
card, or texture may enter its box. It is a persistent mascot, not a subject.

## Captions (burned-in, Simplified Chinese)

Captions live in the bottom caption band (16.67%), centered, Noto Sans SC 700 (via `--font-body`), **no pill**.
Active word = pure white `{colors.ink}`; not-yet / already-spoken words = `{colors.muted}`. **No red on
captions** — red stays reserved for the one giant-line icon. Swiss clarity: one line, generous, no box.

## 9:16 Frame Treatments

> One statement per frame. The giant is the composition; everything else is chrome.

### A · Statement (DARK · giant carries it)
**Ground** near-black. **Focal** one giant (EN Anton or CN Noto 900) at >=88% width, vertically centered in
the safe area above the band. **Chrome** one micro-label above the giant (0.15xgiant gap); optional wide word
row between two giant lines. **Accent** at most one red icon inside the giant. **Texture** faint in one bottom
corner. **Character** bottom-left. **Density** low.

### B · Two-line stack (EN over CN, or label · giant · wide)
**Focal** a giant first line + a giant second line, the wide-spaced Archivo row pinned between them. Keep both
lines >=88% width; step font-size so neither overflows. One red icon total.

### C · Diagram / cards (the mechanism frame)
**Focal** a few white-line elements (nodes, arrows, a boxed term) built from 1px `{colors.ink}` strokes on
the ground, each card margin >=0.06H, all above the caption band and clear of the character box. Labels ride
the micro ramp; one term may take the red icon. No fills, no shadows. **Density** the one busier frame.

## Composition Rules

### Do
1. Fill the giant >=88% width; hold the 1:8 gap to the label.
2. Chinese giant letter-spacing 0; English giant -0.02em UPPERCASE.
3. One red icon per frame, <=0.6em, inside the giant line only.
4. Texture 0.10, one bottom corner, clipped off any glyph.
5. Character static bottom-left, every frame, never scaled or animated.

### Don't
1. No second color; red never spreads to text/border/background/second icon.
2. No gradient, glow, or shadow (the character's own art is flat too).
3. Never shrink the 1:8 contrast — enlarging the label is a violation.
4. Texture never covers type, never tiles, never enters the caption band.
5. Nothing enters the caption band or the character box.

## Numerals & Claims (hard rule)
Never invent figures. This explainer carries none — keep every claim to what the script states.

## Known Gaps
- **Motion low-frequency by brand**; the character is fully static in this build (user override).
- **Fonts via Google Fonts** (Anton, Noto Sans SC, Archivo, Mr Dafoe); no local font files staged.
- **9:16 only** for this video.
