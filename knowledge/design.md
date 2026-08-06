---
type: design-system
title: RUMOAR Design System — "Engine"
description: Canonical tokens, components, layout and motion rules for the RUMOAR product UI across mobile, tablet and desktop.
plane_issues:
  - RUM-1 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/c75cbaa1-6120-4fe4-af86-c5e51c93d169
  - RUM-7 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/668b1e8e-f0a7-4d9f-a059-eada57a2077c
  - RUM-9 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/7df04b78-6464-450a-89e0-d56ff89828e9
  - RUM-14 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/448905c3-9fb6-45c6-b132-16e625a02da5
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

Three rules, because an icon font fails loudly and stupidly — an unknown ligature renders
as its own literal text, so `favorite_border` appears on screen as the words
"favorite\_border":

1. **Never use a Material *Icons* name.** The `*_border`, `*_outline` and `*_filled`
   suffixes belong to the old set and do not exist in Symbols.
2. **State is the `FILL` axis, not a different glyph.** One ligature per icon;
   `font-variation-settings: 'FILL' 0|1`. Fill is a shape change, so the state survives
   greyscale and colour blindness — a colour swap alone does not.
3. **Inline `font-variation-settings` replaces the whole property**, so any inline override
   must restate `wght` and `opsz` or the glyph silently changes optical size.

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
- **One primary action per screen.** The primary is whatever moves you forward *from the
  current state* — "Take photo" on an empty step becomes "Next" once a photo exists.
  Secondary actions are `.btn-ghost` — real buttons, since they are real alternatives —
  but never a second ink block: two black full-width buttons on one screen means neither
  is primary. Cap: one `.btn`, up to two `.btn-ghost` side by side, then text links.
- **Media is capped, not full-bleed.** A hero image runs to `max-w-[280px]` centred at 3:4.
  Letting it fill the column pushes every control below the fold and makes a step look
  like it has nothing to do.
- **Streaming read-out** — for any generation over ~3s. A pulsing 6px dot beside a mono
  status line naming the current phase, a display heading, and the model's own narration
  streaming in at 17px with a 2px caret. Skeleton lines fill the gap before the first
  token. **A progress bar over silence is not an acceptable loading state** — if the work
  takes long enough to need an indicator, it takes long enough to owe the user something
  to read. **Pace the reveal client-side**: Gemini streams in very coarse chunks — often a
  whole reply in two frames — so piping the raw stream to the DOM still lands as a wall of
  text. Buffer what arrives and reveal it on a ~30ms tick, accelerating with the backlog.
- **Reaction bar** — 40px targets: like · not-for-me · save on the left, share pushed
  right. Active state fills the Material Symbol (`'FILL' 1`) rather than only changing
  colour, so it survives greyscale and colour blindness. Optimistic: the tap paints
  immediately and the request follows; a failed write is never surfaced as an error.
- **Generated card** — image first, at 3:4. Name and one-liner sit in an ink gradient over
  the foot of the image; the palette runs as 20px chips down the top-right corner.
  Rationale collapses behind a "Why this works" disclosure. Anything generated from the
  user's own photo carries a line saying it is an impression, not real garments.
- **Swatch grid** — 4-up square colour chips, no radius, name in 11px beneath. Each chip is
  `role="img"` with the colour name as its label: colour alone must never be the only
  carrier of meaning. A swatch whose hex fails `#RRGGBB` validation is dropped rather than
  rendered, so a parse failure can't masquerade as a black recommendation.
- **Confidence meter** — a 2px `--line` track with an `--ink` fill and the percentage in
  mono beside it. Used wherever the product states a machine judgement about the user; it
  is never decorative and never hidden when low.
- **Intake instruction list** — numbered mono index, bold 13.5px label, `--mute` 13px hint.
  For steps the user performs away from the screen.
- **Progress** — **one counter per screen.** Stage-level position is a segmented bar
  (2px × 24px per stage, `--ink` filled / `--line` empty) with no numerals; a numeric
  "n of N" belongs only to a step that owns a sub-sequence, such as the three photos.
  Two numeric counters on one screen read as one broken counter.
- **Back** — a single left-aligned text link at the **top** of the step content, on every
  step, labelled with where it goes ("← Front") rather than just "Back". Never in a header:
  a control that appears conditionally there shifts everything beside it.
- **Guided capture** (`PhotoCapture`) — one shot per screen: `LABEL · n of N` eyebrow,
  display heading, hint, then a 1:1-ish live viewport with a full-body framing rectangle
  inset 18%/6% in `--paper` at 70% opacity. Camera opens only on an explicit tap, never on
  mount, so the permission prompt is always attached to a visible intent. Preview is
  mirrored for the front-facing camera; the captured frame never is. **Upload sits beside
  capture as an equal, not a fallback** — on desktop it is usually the better path, and
  where `getUserMedia` is unavailable or blocked it is the only one. Denial is explained
  in words with the alternative in the same breath, never a dead end.

## 3. Layout

The phone frame from the prototype is **removed** in the product. Desktop is not the phone
layout with air around it: every screen either recomposes or it does not deserve the width.

### 3.1 The shell

| Range | Layout |
|---|---|
| `< 1024px` | Single column. Bottom tab bar (`--tabh`). Stylist is a full-screen view. |
| `≥ 1024px` | Three-pane: 88px icon rail (left) · content column (fluid) · persistent 380px stylist (right). No tab bar. |
| `≥ 1536px` | Same, stylist widens to 440px. |

Desktop keeps the stylist visible at all times — the conversation is the product's centre
of gravity, not a modal. On mobile it is a tab.

### 3.2 Breakpoints answer to the column, not the window

The content column sits between a fixed rail and a fixed stylist, so its width never
tracked the viewport: at a 1280px window the column is only 812px. Viewport breakpoints
inside it described the wrong box. **The content column is a CSS container** (`@container`
on `<main>` in `AppShell`), and everything inside it uses container variants:

| Variant | Column width | Typical use |
|---|---|---|
| `@lg` | 512px | padding step |
| `@xl` | 576px | looks grid → 2-up |
| `@2xl` | 672px | product grid → 3-up |
| `@3xl` | 768px | headings scale up; PDP splits two-up |
| `@4xl` | 896px | product grid → 4-up; looks → 3-up; wide padding |
| `@6xl` | 1152px | wardrobe → 5-up |

Viewport breakpoints (`lg:`, `2xl:`) stay for the **shell itself** — what appears and
disappears — and for onboarding, which has no rail beside it.

### 3.3 Measures

Content is capped and centred (`mx-auto`) rather than left-shunted against the rail:
1120px for grid screens, 980px for the product detail, 620px for settings. Onboarding runs
440px on mobile, 1160px at `lg`, 1320px at `xl` — the last step so three style cards stay
at least as wide as the phone shows them.

### 3.4 Screens that recompose

- **Photo capture** — two panes: the subject frame holds the left column across both rows
  at `min(64vh, 600px)`; the flow — tiles, title, hint, actions, privacy line — runs down
  the right. DOM order stays the mobile order. There is no back link: the thumbnail tiles
  are the navigation, and a second way back only made the two disagree about which one
  meant "previous".
- **Analysis** — a masthead (season at 68px left, confidence as its byline right), then a
  full-width colour band with named swatches and hex, then the readings in two columns
  (`columns-2`, `break-inside-avoid` per section).
- **Styles** — one direction at a time, in the same two-pane machine: the look holds the
  left column with its palette plate at exactly the picture's measure, and the flow runs
  down the right. Tiles are the only way between directions; the back link stays, because
  here the tiles move sideways and the link moves between steps, so they do not collide.
  The tiles carry each direction's **name** — three photographs of the same man are hard
  to tell apart at thumbnail size, and the name is what distinguishes them.
- **Product detail** — image left, price and actions right, image sticky while the right
  column scrolls.

Forward CTAs stay sticky, but on desktop they right-align above a hairline instead of
running the full width of the page.

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

## 7. The nine states

Every surface that shows data must answer all nine before it is finished. Most bugs a user
notices are a missing state, not a broken feature.

| State | What it must do | Where it lives |
|---|---|---|
| **Empty** | Say what goes here and give one way to fill it. An empty screen with no action is a wall. | `<EmptyState>` — icon, title, body, optional CTA |
| **Loading** | Hold the shape of what is coming, not a spinner in the void. | `loading.tsx` per route, `<Skeleton>` |
| **Partial** | Show what has arrived and keep a place for the rest. Never block on the slowest item. | style cards stream in; placeholders for the pending ones |
| **One** | Read correctly in the singular. "1 pieces" is a bug. | count copy pluralises |
| **Ideal** | The designed case. | — |
| **Overflow** | Degrade by scroll or truncation, never by breaking the grid. Say what was dropped. | rails scroll; lists cap and label the cap |
| **Error** | Plain language, what is safe, and two exits: retry and somewhere that works. Never a stack trace; carry the digest for support. | `error.tsx` |
| **Invalid** | Say which field and why, next to the field, before submit where possible. | inline `role="alert"` |
| **Success** | Confirm anything whose result is off-screen or too small to notice. | `useToast()` |

Rules that apply across all nine:

- **A pending action must look pending.** Server-action forms are inert between the tap and
  the re-render — long enough to tap twice on a slow connection. `SubmitButton` and
  `IconSubmit` take the pending state from `useFormStatus`.
- **Confirm, don't interrupt.** Toasts are `role="status"`, not `alert`; they never block and
  never carry an action.
- **A failure that is a safeguard must not become a gate.** The shot-angle check and the
  reaction write both fail open.
- **Every tappable surface answers the finger** — a 0.985 press scale on touch. Without it a
  tile that navigates and a tile that does nothing feel identical at the moment of contact.
- All of it is off under `prefers-reduced-motion`.

### 7.1 Invalid: a finding, not an alert

When a check disagrees with the user rather than failing, it must not arrive as a box
bolted under the composition. The screen already has slots — eyebrow, title, hint, action
stack — and the finding changes **what they say**, not what is on the page:

| Slot | Normal | Under review |
|---|---|---|
| eyebrow | — | `SECOND LOOK · 1 OF 2` |
| title | `Side` | `Is this your side shot?` |
| hint | the shooting instruction | what the model read, and that keeping it is fine |
| actions | `Next` + retake/upload | `Retake side` ink, `Keep it` ghost — same silhouette |
| subject | the photograph | the same photograph, captioned `FILED AS SIDE · READS AS FRONT` |

Rules this encodes:
- **Jump to the evidence.** The step index moves to the shot in question so the tile, the
  question and the photograph all agree.
- **The tiles carry "which one".** A queried tile keeps its badge — we still have the
  photo — and swaps `check` for `question_mark`, and its label goes ink even when it is
  not the active step.
- **A judgement is remembered; a replacement is not.** Only an explicit "Keep it" is
  memoised, so the same photo is never queried twice, while a retake is new evidence and
  gets checked like any other shot. Without this the check never terminates.
- **Never a gate.** The escape sits directly under the primary, same height, same width.
- **Two findings that are each other are a reorder, not a re-shoot.** Two shots each
  detected as the other's angle offer `Swap them`, and nothing needs photographing again.
- **A caption plate, not a label across the picture.** The reading sits under the frame
  behind a hairline, in the mono eyebrow face.

Failures (upload, session) keep `role="alert"` and ink body text. Findings like the above
are `role="status"` and mute. The screen must never blur the two.

### 7.1.1 Text arrives before pixels

A generated look streams its name, one-liner, palette and rationale seconds before its
image, which is a separate staggered request that can take a minute. The screen must be
honest and useful in that gap, not a spinner:

- Everything that has arrived is **live** while the picture is still drawing — including
  the reactions, because a reaction is about the direction, not the pixels.
- A render failure puts its message and the verbatim upstream reason **above** the reaction
  bar, never instead of it. A direction whose picture failed is still judgeable from its
  name, palette and argument, and that judgement is training signal we would otherwise
  throw away.
- Every render carries a **timeout** as well as a stagger. Without one a hung request
  shimmers for ever, which is the worst outcome on a slow connection.
- A progress strip shows a **fixed number of slots while the stream is open**, then exactly
  what arrived once it closes, so it never grows a tile under the finger.
- `aria-live` goes on a narrow status node, never on the container — a live region wrapped
  around a grid announces every mutation in it.

## 7.2 The printed surface

The reading is downloadable as **one side of A4** at `/report`. There is no PDF library and
there will not be one: the document is HTML with a print stylesheet, and "download" is the
browser's own print-to-PDF, which is the only route that works identically on desktop and
on an installed iOS PWA.

Rules that make it survive a printer:

- **Colour is drawn, not painted.** Every swatch is an inline SVG `<rect>`, never a CSS
  background — browsers strip backgrounds unless the user finds the "Background graphics"
  checkbox, and it is off by default. The hairline edge is a second `<rect>` inside the
  same SVG so a cream swatch cannot become a hole in the page, and so the edge cannot be
  dropped independently of the fill.
- **The hex is printed under every colour.** Uncalibrated printers lie; colour is never the
  sole carrier of information.
- **Absolute units only** — mm and pt, never `em` or `rem`. A slow webfont must not be able
  to reflow the sheet onto a second page. Fallback stacks are metrics-close
  (`"Clash Display", "Space Grotesk"` / `"Space Mono", ui-monospace, "Courier New"`).
- **The palette sizes itself.** Band height is derived from the number of colours so the
  column always fills — eight thin stripes and four fat ones are wrong for the same reason.
- **Print after the fonts, not before.** `Promise.race([document.fonts.ready, 2500ms])`,
  with the button reading "Preparing…" meanwhile.
- **`document.title` is the filename.** Set it before `window.print()`; a report saved as
  "localhost" is a report nobody finds again.
- **Say what CSS cannot fix.** Chrome prints its own URL and date into the margin and no
  stylesheet suppresses it, so the helper line tells the user where the switch is.
- **Have an answer for no printer.** "Copy the palette" writes a plain-text block of names
  and hexes to the clipboard; "Send the link" uses the platform share sheet.
- **Never the user's photographs.** They are private to the app.

What the sheet carries: season, the four axis words, the palette light-to-dark, what to
avoid, metal, fit rules, build and face, hair and beard. What it deliberately drops: the
summary paragraph, the feature read, the user's own corrections, and the confidence number
whenever it is above 0.75 — a good number is decoration, only bad news earns ink.

## 8. The editorial surface (landing page)

The marketing page at `/` is **deliberately not** the product system above. It is a
separate, hand-built surface — `app/public/landing.{html,css,js}`, no framework — with its
own language:

| | Product UI | Editorial surface |
|---|---|---|
| Ground | `--paper` #FFFFFF | `--bg` #F7F5F2, warm |
| Ink | #17171B | #1B1B1B |
| Display | Clash Display | Instrument Serif, italic as the only accent |
| Body | General Sans | Inter |
| Geometry | square, radius 0 | **square, radius 0** — the one rule both surfaces share |
| Depth | flat, hairlines | soft stacked shadow |

Both are legitimate; they serve different jobs. The product is an instrument and stays
plain. The landing page is a magazine and is allowed warmth and air — but **not curve**:
sharp corners are the brand's strongest signal and hold across every surface. **Do not
migrate the other tokens between them in either direction.**

Rules that do carry across: one primary action per screen (here, every CTA is the same
"Style me"), colour is never the sole carrier of meaning, `prefers-reduced-motion` is
honoured, and generated or illustrative imagery is labelled honestly.

Section rhythm is one idea per screen, on a single `--section-y` scale, with alternating
composition — hero split, card row, bleeding rail, split, centred close. Never a feature
list.

## 9. Change log

- **2026-08-04** — Created. Audited from `rumoar-app.html` + `build_deck.js`; added the
  three-breakpoint responsive layout and accessibility rules for the productisation.
- **2026-08-04** — Onboarding rebuilt around photo intake and colour analysis. Added the
  swatch grid, confidence meter and intake instruction list. The call screen and the
  name/vibe/occasions form are removed. Lazyweb coverage for colour-analysis result
  screens was weak (top similarity 0.36), so these patterns are derived from this system
  rather than from external evidence.

- **2026-08-06** — Desktop composition pass ([RUM-14](https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/448905c3-9fb6-45c6-b132-16e625a02da5/)). § 3 rewritten: the content column became a CSS container, the measures were raised and centred, and capture, analysis and the product detail were recomposed rather than widened.

- **2026-08-07** — Photo capture recomposed ([RUM-14](https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/448905c3-9fb6-45c6-b132-16e625a02da5/)). Subject moved to the left column and the flow to the right; the back link removed in favour of the tiles; § 7.1 added for the angle-check finding, which replaced a full-bleed alert box under both panes. Fixed a live defect where the camera-permission notice and the action stack were declared in the same desktop grid cell and overlapped.

- **2026-08-07** — Downloadable report added at `/report` ([RUM-14](https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/448905c3-9fb6-45c6-b132-16e625a02da5/)); § 7.2 records the print rules. The analysis footer now carries both actions behind a scrim, and the "Skip these" eyebrow aligns to the chip row rather than to a flex baseline resolved from a swatch's bottom edge.

- **2026-08-07** — Styles step rebuilt one-at-a-time in the intake two-pane ([RUM-14](https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/448905c3-9fb6-45c6-b132-16e625a02da5/)); § 7.1.1 added for streamed content that outruns its images. Render state lifted out of the card so the tiles can report it, and the reaction bar no longer disappears when a picture fails.

See also: [Architecture overview](architecture/overview.md) · [Data model](schemas/data-model.md) · [Plane config](plane.config.md)
