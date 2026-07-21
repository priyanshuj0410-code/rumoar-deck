# RUMOAR — The Complete Submission

A self-contained HTML slide deck (49 slides) for **RUMOAR**, a men's fashion-accessories
styling engine for India. Built in the "Engine" brand system (Clash Display / General Sans /
Space Mono; porcelain-ink monochrome + Dusk accent + Voltage flash).

## View locally
Open `index.html` in any browser. Navigate with **← / →** or click; **F** for fullscreen.

## Deploy to Vercel
It's a pure static site (`index.html`, no build step).

**Easiest — Vercel dashboard:** push to GitHub (below), then vercel.com → *Add New → Project →
Import* the repo → **Deploy**. Zero config.

**Or the Vercel CLI**, from inside this folder:

    npx vercel --prod

## Push to GitHub

    git remote add origin https://github.com/<your-username>/rumoar-deck.git
    git branch -M main
    git push -u origin main

…or with the GitHub CLI, in one line:

    gh repo create rumoar-deck --public --source=. --push

> Fonts load from Fontshare/Google, so a live view needs internet.
