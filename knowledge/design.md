---
type: design-system
title: RUMOAR Design System — "Engine"
description: Canonical tokens, components, layout and motion rules for the RUMOAR product UI across mobile, tablet and desktop.
plane_issues:
  - RUM-1 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/c75cbaa1-6120-4fe4-af86-c5e51c93d169
  - RUM-7 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/668b1e8e-f0a7-4d9f-a059-eada57a2077c
  - RUM-9 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/7df04b78-6464-450a-89e0-d56ff89828e9
---

# RUMOAR Design System — "Engine"

Audited from the working prototype (`rumoar-app.html`) and the deck brand system
(`build_deck.js`). This is the single source of truth for product UI. Do not introduce a
colour, typeface, radius, spacing step or component pattern that is not defined here —
extend this file first, then build.

## 1. Foundations

### Colour

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#17171B` | Primary text, primary buttons, selection outline |
| `--paper` | `#FFFFFF` | Surface / page background |
| `--wash` | `#F4F3EF` | Recessed surface — cards, tiles, image wells, ghost buttons |
| `--line` | `#E9E8E3` | Hairlines, input borders, slider track |
| `--mute` | `#8C8B85` | Secondary text, inactive icons, placeholder |
| `--volt` | `#6152F0` | Voltage accent — links, focus rings, live/active state |
| `--peri` | `#B3ACEF` | Periwinkle — accents *on dark only* (toast icon, waveform) |
| `--ok` | `#3E7D5A` | Success |
| `--glass` | `rgba(255,255,255,.66)` | Backdrop-blurred bars |

Monochrome carries the interface; Voltage is a flash, never a fill. Never place `--peri`
on `--paper` — it is a dark-surface accent only.

**Dark mode is out of scope for v1.** The brand is porcelain-and-ink; if added later it
must be specified here first.

### Typography

| Token | Family | Use |
|---|---|---|
| `--display` | Clash Display 600 | Headings, prices-as-statement, rating numerals |
| `--sans` | General Sans 400/500/600 | All body, labels, buttons |
| `--mono` | Space Mono 400 | Eyebrows, prices, ticks, metadata |

Scale (px): display 44 / 32 / 26 / 24 / 21 / 19 / 17 · body 15 (base) / 14 / 13.5 / 12.5 /
12 · mono 15 / 12 / 11 / 10 / 9.

Display headings set `letter-spacing:-.01em` (`-.02em` at 44). The eyebrow style (`.k`) is
mono 10px, `letter-spacing:.24em`, uppercase, `--mute`.

Icons: **Material Symbols Rounded**, `wght 300`, `opsz 24`. No other icon set.

### Geometry — square by default

**Corner radius is `0` for every rectangular surface**: cards, tiles, buttons, inputs,
panels, toasts, image wells. This is the strongest brand signal in the system.

The only round things are: avatars/orbs, the mic and send buttons' circular variants,
marker dots, the floating PDP back button (40px circle), and pills that are explicitly
capsule-shaped (`999px`) — the status island and filter chips.

### Spacing & sizing

4px base. Common steps: 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 44.
Gutters: 16px mobile, 24px tablet, 32px desktop. Grid gap: 10px.

| Token | Value |
|---|---|
| `--btnh` | 52px (primary button / input / send) |
| `--tabh` | 62px (mobile tab bar) |
| Small button | 38px |
| Icon button | 40px |
| Min touch target | 44×44 |

## 2. Components

- **Button** — `.btn`: full-height `--btnh`, `--ink` on white, weight 500, 15px, square.
  `.ghost` = `--wash` on `--ink`. `.sm` = 38px, 13px. Press: `scale(.975)`, `opacity .92`.
- **Card** (`.card`) — `--wash` surface, 1:1 thumb, meta block 11/12px padding; name at
  13.5px/600, price in mono 12px `--mute`.
- **Tile** (`.wtile`) — wardrobe/selection tile. Selected state is `inset 0 0 0 2.5px
  var(--ink)` plus a 6% ink veil on the thumb and a filled 24px check at top-right. Never
  use colour to signal selection.
- **Chat bubble** (`.bub`) — agent left, user right; enters with `bubin` (9px rise, .34s).
  Typing indicator is three dots.
- **Composer** — 52px input + 52px square send. Mic is a press-and-hold affordance with a
  live state. Always pinned to the bottom of the conversation column.
- **Bar / header** (`.vhead`, `#tabbar`, `.pdp-foot`) — `--glass` with
  `backdrop-filter: blur(22px) saturate(1.8)`. Never opaque.
- **Toast** — ink block, bottom-anchored above the tab bar, `--peri` icon, auto-dismiss
  2.4s, spring transform in.
- **Empty state** (`.emptymsg`) — 44/24px padding, centred, `--mute` 14px/1.6.

## 3. Layout

Three breakpoints. The phone frame from the prototype is **removed** in the product.

| Range | Layout |
|---|---|
| `< 768px` | Single column. Bottom tab bar (`--tabh`). Stylist is a full-screen view. Product grids 2-up. |
| `768–1119px` | Single column, 640px max content width, centred. Tab bar becomes a top segmented nav. Grids 3-up. |
| `≥ 1120px` | Two-pane: 88px icon rail (left) · content (fluid, max 880px) · persistent 380px stylist column (right). Grids 3–4-up. No tab bar. |

Desktop keeps the stylist visible at all times — the conversation is the product's centre
of gravity, not a modal. On mobile it is a tab.

Safe areas: pad with `env(safe-area-inset-bottom)` on the tab bar and composer so the PWA
clears the iOS home indicator and Android gesture bar.

## 4. Motion

Standard easing `cubic-bezier(.2,.7,.2,1)` (`--ease`). Durations: press 160ms · state
200–220ms · view transition 340–400ms · panel 400ms · toast 300ms in / 500ms spring.

Every interactive element scales down on press (`.86`–`.975` depending on size). Views
enter with an 8px rise + fade; the PDP with a 30px rise. Skeletons shimmer at 1.5s linear.

Honour `prefers-reduced-motion: reduce` — drop transforms and shimmer, keep opacity fades.

## 5. Accessibility

- Ink on paper is 15.9:1; `--mute` on `--wash` is 3.1:1 — **`--mute` is for supporting text
  at 14px+ only**, never for body copy or anything below 14px that must be read.
- `--volt` on paper is 6.4:1 — safe for links and focus rings.
- Focus ring: 2px `--volt` outline with 2px offset. Never remove it on keyboard focus;
  desktop is a first-class target.
- Selection, error and success states must carry an icon or shape, not colour alone.
- All imagery (wardrobe, catalog, looks) requires alt text derived from the item label.

## 6. Evidence

Patterns validated against real products via Lazyweb (Jul 2026):

- **Stylist screen** — suggested prompt chips above a persistent composer with mic, an
  explicit AI-limitations disclaimer, and accessible conversation history. Seen in
  Walmart's assistant, Sephora "AI Beauty", ask-ai, ChatOn.
- **Wardrobe** — named collections rendered as a dense tray/collage with an item count,
  plus search and filter/sort in the header. Seen in Bins (digital closet), GOAT Spaces.
- **Shop / saved** — two-column product grid, image-dominant, brand + name + price, heart
  to save inline on the tile. Seen in Farfetch, The RealReal, Poshmark.

RUMOAR's departure from all of them is the square geometry and the monochrome restraint —
that stays.

## 7. Change log

- **2026-08-04** — Created. Audited from `rumoar-app.html` + `build_deck.js`; added the
  three-breakpoint responsive layout and accessibility rules for the productisation.

See also: [Architecture overview](architecture/overview.md) · [Data model](schemas/data-model.md) · [Plane config](plane.config.md)
