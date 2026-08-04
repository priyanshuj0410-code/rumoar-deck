---
type: architecture
title: RUMOAR Product Architecture
description: How the RUMOAR product app is built and deployed — Next.js on Vercel, Supabase, Ollama Cloud, PWA with a Capacitor-ready adapter layer.
plane_issues:
  - RUM-1 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/c75cbaa1-6120-4fe4-af86-c5e51c93d169
  - RUM-2 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/e23f2378-0386-4801-be08-e0946564f8a9
  - RUM-8 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/84ae3338-9fa7-43d9-9357-a990a582a734
---

# RUMOAR Product Architecture

The product is the app formerly prototyped in `rumoar-app.html`: a stylist that learns a
man's wardrobe and taste, then recommends accessories he can actually buy.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, TypeScript) | Server routes for the model proxy, streaming UI, first-class on Vercel |
| Hosting | Vercel — **separate project** from the deck | The deck at the repo root keeps its live URL untouched; the product owns its own domain |
| Data / auth / files | Supabase (Postgres + Auth + Storage + RLS) | One service for accounts, wardrobe rows and user images; RLS keeps a user's wardrobe private by construction |
| Model | Gemini via a server route | One provider for conversation, wardrobe photo reading **and** image generation; the key never reaches the browser |
| Packaging | Installable PWA, Capacitor-ready | One codebase for Android, iOS and desktop today; native shells are a config change, not a rewrite |
| Styling | Tailwind, tokens mapped from [`design.md`](../design.md) | Tokens live in one place and are consumed as utilities |

### Repository layout

    index.html        the deck (generated) — untouched, its own Vercel project
    build_deck.js     the deck source
    rumoar-app.html   the original prototype — kept as reference, no longer deployed
    app/              the product (Next.js) — its own Vercel project
    knowledge/        this repository

`app/` is deployed by pointing a second Vercel project at the `app/` root directory. The
existing root `vercel.json` and the deck's deployment are unaffected.

## Runtime shape

    Browser / installed PWA / (later) Capacitor shell
        │
        ├── Next.js App Router  ──  React Server Components for reads
        │        │
        │        ├── /api/stylist   → Gemini text    (conversation)
        │        ├── /api/vision    → Gemini vision  (photo → wardrobe items)
        │        └── /api/render    → Gemini image   (reveal shots, PDP try-on)
        │                             all three server-side; the key never ships
        │
        └── Supabase JS  ── auth session, wardrobe/look reads+writes, Storage uploads
                 └── Postgres with row-level security on every user-owned table

The browser never holds a model key. It does hold a Supabase anon key, which is safe
because every user-owned table is protected by RLS.

## Cross-platform strategy

The product must work fully on Android, iOS and desktop. Three things make that true:

1. **Responsive layout** — three breakpoints defined in [`design.md`](../design.md#3-layout).
   Desktop is a real two-pane app, not a stretched phone.
2. **PWA** — web app manifest, service worker (offline shell + cached wardrobe images),
   `apple-touch-icon` and `apple-mobile-web-app-*` meta for iOS installability, safe-area
   padding for the iOS home indicator and Android gesture bar.
3. **Platform adapter layer** — `app/src/lib/platform/`. Every capability that differs
   between web and native lives behind an interface: `camera`, `storage`, `share`,
   `notifications`, `haptics`. The web implementation ships today; adding Capacitor means
   adding a second implementation and a build flag, with zero changes to feature code.

Known platform limits, handled explicitly rather than assumed away:

- **Speech recognition** (the prototype's mic) is `webkitSpeechRecognition` — absent on
  iOS Safari and Firefox. The adapter feature-detects and falls back to text input; the
  mic button is hidden, never shown broken.
- **Speech synthesis** voices differ per platform, so scripted onboarding audio is served
  as pre-recorded MP3s (already in `assets/audio/`) with TTS only as a fallback.
- **Push notifications** on iOS require the PWA to be installed to the home screen. The
  app asks only after install is detected.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Anon key; safe with RLS on |
| `SUPABASE_SERVICE_ROLE_KEY` | **local only** | Catalog seeding. Never set on the deployment |
| `GEMINI_API_KEY` | server only | Gemini auth |
| `GEMINI_TEXT_MODEL` | server only | Defaults to `gemini-3.6-flash` |
| `GEMINI_IMAGE_MODEL` | server only | Defaults to `gemini-3.1-flash-image` |

## Image generation

Gemini's image model (Nano Banana 2) is used in three places, all through `/api/render`:

1. **Onboarding reveal** — three shots generated from his own photo: him as he is on a
   neutral backdrop, him with the keystone accessory added, him with the full set.
2. **PDP try-on** — "See it on me" composites a product onto his reference photo.
3. Both persist to the `looks` table and the private `looks` bucket.

Two rules make this trustworthy rather than creepy:

- **Identity is preserved, not improved.** Every prompt leads with an explicit instruction
  not to change his face, skin tone, body or pose, and not to beautify or slim him. A
  stylist that hands you a photo of a better-looking stranger is worthless.
- **Generated imagery is labelled.** The try-on carries a caption saying it approximates
  fit and scale and is not a photograph of the real product on him.

The reference photo is the first shot uploaded during onboarding, stored on
`profiles.reference_photo_path`. Renders are cached per (user, kind, product, stage) — a
repeat tap costs nothing.

## Open items

- Payments/checkout is out of scope for v1 — the PDP's buy action records intent and
  hands off; a real checkout is a separate decision.
- Catalog is seeded from `assets/catalog/`; a supplier feed is a later concern.

See also: [Design system](../design.md) · [Data model](../schemas/data-model.md) · [Plane config](../plane.config.md)
