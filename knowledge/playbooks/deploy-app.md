---
type: playbook
title: Deploying the RUMOAR product app
description: Step-by-step for provisioning Supabase and deploying app/ as a second Vercel project without disturbing the deck.
plane_issues:
  - RUM-2 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/e23f2378-0386-4801-be08-e0946564f8a9
  - RUM-3 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/be88f126-e377-48c1-8dc2-e333ef4b6682
---

# Deploying the product app

The deck and the product are two Vercel projects over one repository. Nothing here
touches the deck.

## 1. Supabase

1. Create a project. Note the URL, anon key and service-role key.
2. SQL editor → paste and run [`app/supabase/migrations/0001_init.sql`](../../app/supabase/migrations/0001_init.sql).
   It is idempotent; re-running it is safe.
3. Authentication → Providers: enable Email, Google and Apple. Add the redirect URL
   `https://<product-domain>/auth/callback` (and `http://localhost:3000/auth/callback`
   for local work).
4. Seed the catalog from a machine with the service-role key in `app/.env.local`:

       cd app && npm run seed

   This uploads `public/samples/catalog/*.jpg` to the public `catalog` bucket and upserts
   the nine product rows.

## 2. Vercel

New project → same Git repository → **Root Directory: `app/`**. Framework preset is
detected as Next.js.

Environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `OLLAMA_API_KEY` | Ollama Cloud key |
| `OLLAMA_CHAT_MODEL` | optional, defaults to `gpt-oss:120b` |
| `OLLAMA_VISION_MODEL` | optional, defaults to `qwen3-vl:235b-cloud` |

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` — the deployment never needs it, and adding it
turns a single server-side bug into a full data breach.

## 3. Verify after deploy

- Sign in with email on desktop, then on a phone with the same address — the wardrobe
  must be identical.
- Android Chrome: the install prompt appears; install and confirm the app opens
  full-screen with no browser chrome.
- iOS Safari: Share → Add to Home Screen; confirm the icon is the R mark and the app
  clears the home indicator.
- Turn on airplane mode and reload — the offline screen appears rather than a browser
  error.
- Resize desktop through 1120px — the tab bar gives way to the rail and the stylist
  column.

## Rolling back

Vercel → the product project → Deployments → promote a previous build. The deck project
is untouched by any of this.

See also: [Architecture overview](../architecture/overview.md) · [Data model](../schemas/data-model.md)
