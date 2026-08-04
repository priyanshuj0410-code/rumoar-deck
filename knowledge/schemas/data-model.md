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
| `onboarding_stage` | `text` | `call` → `vibe` → `photos` → `wardrobe` → `reveal` → `done` |
| `reference_photo_path` | `text` | The photo every generated image is rendered from (`wardrobe` bucket) |
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
