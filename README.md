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

## Repo layout
    index.html        the deployed deck (generated)
    build_deck.js     the deck source — edit this
    vercel.json       static config
    project/          internal strategy materials (git-ignored, local only)

> Brand fonts load from Fontshare/Google, so the live view needs internet.
