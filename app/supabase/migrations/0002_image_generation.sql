-- Gemini image generation: a reference photo to generate from, and provenance on looks.
-- See knowledge/schemas/data-model.md.

alter table public.profiles
  add column if not exists reference_photo_path text;

alter table public.looks
  add column if not exists kind text not null default 'other'
    check (kind in ('reveal', 'tryon', 'other')),
  add column if not exists product_slug text,
  -- Stage 0/1/2 of the onboarding reveal. Null for anything else.
  add column if not exists stage int;

-- Lookup path for "have we already generated this one?". Deliberately not unique: a
-- partial/expression unique index cannot serve as an ON CONFLICT arbiter through
-- PostgREST, so the route replaces the previous row explicitly instead.
create index if not exists looks_generated_idx
  on public.looks (user_id, kind, product_slug, stage);
