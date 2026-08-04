---
type: schema
title: RUMOAR Data Model
description: Postgres tables, storage buckets and row-level-security rules backing the RUMOAR product.
plane_issues:
  - RUM-3 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/be88f126-e377-48c1-8dc2-e333ef4b6682
  - RUM-4 https://app.plane.so/claude-pri/projects/0f74bf02-2d16-4c07-a0f7-af537f8cb725/issues/3175d347-ab1f-49e2-9a62-f9353d1ad013
---

# RUMOAR Data Model

Supabase Postgres. Every user-owned table has RLS enabled with `auth.uid() = user_id`.
The catalog is the only publicly readable table.

## Tables

### `profiles`
One row per account, keyed to `auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id` |
| `display_name` | `text` | Captured in onboarding ("what should I call you") |
| `vibe` | `text` | Free-text style self-description |
| `occasions` | `text[]` | What he dresses for |
| `budget_band` | `text` | `value` / `mid` / `premium` |
| `onboarding_stage` | `text` | `photos` → `analysis` → `styles` → `done` |
| `reference_photo_path` | `text` | The photo every generated image is rendered from (`wardrobe` bucket) |
| `photo_paths` | `text[]` | The full intake set in upload order; `[1]` is the front shot |
| `analysis` | `jsonb` | Colour/contrast/season analysis — see below |
| `analysed_at` | `timestamptz` | When the analysis last ran |

`vibe`, `occasions` and `budget_band` are retained but no longer collected during
onboarding — the photos answer those questions better than the form did. The stylist still
reads them if they are ever populated.

### `profiles.analysis`

```jsonc
{
  "undertone": "warm|cool|neutral|olive",
  "depth": "light|medium|deep",
  "contrast": "low|medium|high",
  "chroma": "soft|muted|clear|bright",
  "season": "Deep Autumn",          // one of the twelve seasons
  "season_confidence": 0.72,        // 0–1, surfaced in the UI
  "features": { "skin": "", "hair": "", "eyes": "" },
  "build":    { "frame": "", "proportions": "", "fit_notes": "" },
  "best_colours":  [{ "name": "Deep olive", "hex": "#3B4A2F", "why": "" }],
  "avoid_colours": [{ "name": "Icy pink",   "hex": "#F6D4DF", "why": "" }],
  "metals": "gold|silver|both",
  "notes": "",
  "caveat": ""                      // set when the lighting was poor
}
```

Every field is re-validated server-side after the model returns: seasons must be one of
the twelve, hex values must match `#RRGGBB` or the swatch is dropped, and confidence is
clamped to 0–1. A malformed hex would otherwise render as a black chip and read as a
deliberate recommendation.

### `style_suggestions`
Three directions generated from the analysis. Regenerating replaces the whole set.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `rank` | `int` | 0–2, display order |
| `name` | `text` | "Quiet Utility" |
| `one_liner` | `text` | |
| `why_it_works` | `text` | Must reference the analysis, not generic flattery |
| `palette` | `jsonb` | `[{name, hex}]` |
| `key_pieces` | `text[]` | Garment descriptions, not brands |
| `product_slugs` | `text[]` | Validated against `products`; invented slugs are dropped |
| `occasions` | `text[]` | |
| `image_path` | `text` | The style rendered on his own photo (`looks` bucket) |
| `created_at` / `updated_at` | `timestamptz` | |

### `wardrobe_items`
What he already owns. Populated by photo upload + vision read, editable by hand.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → profiles | |
| `image_path` | `text` | Object path in the `wardrobe` bucket |
| `label` | `text` | "Brown trousers" |
| `kind` | `text` | `top`/`bottom`/`footwear`/`outerwear`/`bag`/`eyewear`/`headwear`/`other` |
| `colour` | `text` | |
| `source` | `text` | `vision` / `manual` / `sample` |
| `confidence` | `numeric` | Vision confidence, null when manual |
| `created_at` | `timestamptz` | |

### `looks`
A styled outfit the stylist produced, with the pieces it used.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `title` | `text` | "Keystone" |
| `subtitle` | `text` | |
| `image_path` | `text` | Rendered look image |
| `rating` | `int` | The reveal slider, 0–100 |
| `item_refs` | `jsonb` | `[{type:'wardrobe'|'product', id, x, y}]` — `x`/`y` place the hotspot markers |
| `saved` | `boolean` | Drives the Saved tab |
| `kind` | `text` | `reveal` / `tryon` / `other` — provenance of a generated image |
| `product_slug` | `text` | Which product a try-on rendered |
| `stage` | `int` | 0/1/2 for the onboarding reveal, null otherwise |
| `created_at` | `timestamptz` | |

Generated renders are looked up by `(user_id, kind, product_slug, stage)` before calling
the model. There is deliberately **no unique constraint** on that tuple: a partial or
expression unique index cannot act as an `ON CONFLICT` arbiter through PostgREST, so
`/api/render` deletes the superseded row and its storage object explicitly instead.

### `products`
The catalog. **Publicly readable**, service-role writable.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `slug` | `text` unique | `leather-sling` |
| `name` | `text` | |
| `kind` | `text` | Same vocabulary as `wardrobe_items.kind` |
| `price_inr` | `int` | Stored in whole rupees, never floats |
| `image_path` | `text` | `catalog` bucket |
| `description` | `text` | |
| `active` | `boolean` | Soft delete |

### `saved_products`
| Column | Type |
|---|---|
| `user_id` | `uuid` FK |
| `product_id` | `uuid` FK |
| `created_at` | `timestamptz` |

Composite PK `(user_id, product_id)`.

### `messages`
The stylist conversation, so it survives a reload and a device change.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `role` | `text` | `user` / `assistant` |
| `content` | `text` | |
| `meta` | `jsonb` | Attached product/look references |
| `created_at` | `timestamptz` | |

## Storage buckets

| Bucket | Access | Contents |
|---|---|---|
| `wardrobe` | private, RLS by path prefix `{user_id}/` | User wardrobe photos |
| `looks` | private, same prefix rule | Rendered looks |
| `catalog` | public read | Product imagery |

## RLS

Every user-owned table gets the same four policies:

```sql
create policy "own rows: select" on <table> for select using (auth.uid() = user_id);
create policy "own rows: insert" on <table> for insert with check (auth.uid() = user_id);
create policy "own rows: update" on <table> for update using (auth.uid() = user_id);
create policy "own rows: delete" on <table> for delete using (auth.uid() = user_id);
```

`profiles` uses `auth.uid() = id`. `products` is `for select using (active)` to `anon` and
`authenticated`, with no client write policy at all.

Storage objects are guarded by `(storage.foldername(name))[1] = auth.uid()::text`.

See also: [Architecture overview](../architecture/overview.md) · [Design system](../design.md)
