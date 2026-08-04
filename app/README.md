# RUMOAR — the product app

Next.js 15 (App Router) + Supabase + Ollama Cloud. Installable PWA that runs fully on
Android, iOS and desktop from one codebase.

The deck at the repository root is a separate deployment and is not affected by anything
in this folder.

## Run it

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev
```

## Set up Supabase

1. Create a project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates every table, the
   RLS policies, the three storage buckets and the trigger that gives each new user a
   profile row.
3. Put the project URL and anon key in `.env.local`.
4. Seed the catalog (needs the service-role key):

   ```bash
   npm run seed
   ```

5. For Google and Apple sign-in, enable those providers in Authentication → Providers and
   add `https://<your-domain>/auth/callback` as a redirect URL.

## Deploy

A **second** Vercel project, with **Root Directory set to `app/`**. The existing deck
project stays pointed at the repository root and keeps its URL.

Environment variables to set in Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OLLAMA_API_KEY`, and optionally
`OLLAMA_CHAT_MODEL` / `OLLAMA_VISION_MODEL`. `SUPABASE_SERVICE_ROLE_KEY` is only needed
locally for seeding — do not add it to the deployment.

## Layout

    src/app/            routes
      page.tsx          landing
      sign-in/          email OTP + Google + Apple
      onboarding/       the four-step call flow
      app/              the product shell — stylist, wardrobe, saved, shop, settings
      api/stylist       chat proxy (server holds the model key)
      api/vision        photo → wardrobe items
    src/components/     shell, nav, stylist, wardrobe capture, install prompt
    src/lib/platform/   camera · share · haptics · notifications · speech · kv
    src/lib/supabase/   browser, server and middleware clients
    supabase/           SQL migration
    scripts/            icon generation, catalog seeding

## Cross-platform notes

- `npm run icons` regenerates the PWA icon set. No image dependencies — the mark is drawn
  in code.
- Nothing in `src/app` or `src/components` touches a browser capability directly; it all
  goes through `src/lib/platform`. That indirection is what makes a Capacitor shell a
  configuration change rather than a rewrite.
- Speech recognition is absent on iOS Safari and Firefox, so the mic button is hidden
  there rather than shown broken. Onboarding never depends on it.
- Notifications are only offered on iOS once the app is installed to the Home Screen,
  because that is the only place iOS grants them.

Canon lives in [`../knowledge`](../knowledge/README.md) — design system, architecture and
data model.
