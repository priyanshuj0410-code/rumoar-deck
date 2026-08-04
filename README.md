# RUMOAR — The Complete Submission

A self-contained HTML slide deck (49 slides) for **RUMOAR**, a men's fashion-accessories
styling engine for India. Built in the "Engine" brand system (Clash Display / General Sans /
Space Mono; porcelain-ink monochrome + Dusk accent + Voltage flash).

## The deployed site
`index.html` is the whole site (no build step). Navigate with the arrow keys or click; F for fullscreen.
It's live on Vercel; every `git push` redeploys it.

## Editing the deck
Don't hand-edit `index.html` (it's generated). Edit the content in **`build_deck.js`**, then:

    node build_deck.js      # regenerates index.html

Commit and push to redeploy.

## The product app
`app/` is the RUMOAR product — a Next.js PWA on Supabase that runs on Android, iOS and
desktop from one codebase. It deploys as a **separate Vercel project** (root directory
`app/`), so it never touches this deck's URL. See [`app/README.md`](app/README.md).

`rumoar-app.html` is the original single-file prototype, kept as reference. It is no
longer the product.

## Repo layout
    index.html        the deployed deck (generated)
    build_deck.js     the deck source — edit this
    vercel.json       static config
    app/              the product app (Next.js + Supabase, its own Vercel project)
    knowledge/        design system, architecture, data model, playbooks
    rumoar-app.html   the original prototype (reference only)
    project/          internal strategy materials (git-ignored, local only)

> Brand fonts load from Fontshare/Google, so the live view needs internet.
