---
type: index
title: RUMOAR Knowledge Repository
description: Index of all persistent knowledge for RUMOAR: a men's fashion-accessories styling engine for India.
plane_issues:
  - RUM-19 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/a36beac7-b766-4ef8-8b19-c5fb9740d2a5
---

# RUMOAR Knowledge

RUMOAR is a men's fashion-accessories styling engine for India. The repository currently
holds the investor/submission deck (`build_deck.js` → `index.html`, deployed on Vercel)
and the original app prototype (`rumoar-app.html`, archived in place) with local catalog, wardrobe, feed and styled
assets plus an Ollama-backed API shim (`api/ollama.js`).

## Structure

| Path | Contents |
|---|---|
| [`design.md`](design.md) | Design system: tokens, components, layout, motion, accessibility |
| [`architecture/overview.md`](architecture/overview.md) | Product architecture and cross-platform strategy |
| [`schemas/data-model.md`](schemas/data-model.md) | Tables, buckets and row-level security |
| [`playbooks/deploy-app.md`](playbooks/deploy-app.md) | Provisioning Supabase and deploying `app/` |
| [`plane.config.md`](plane.config.md) | Plane workspace / project / state identifiers |

## Project tracking

All work is tracked in Plane project **RUM**, see [`plane.config.md`](plane.config.md).
