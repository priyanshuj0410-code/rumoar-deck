-- Onboarding becomes photo-led: upload → colour/contrast/season analysis → three styles.
-- The call screen and the name/vibe/occasions form are gone; the photos answer those
-- questions better than a questionnaire did. See knowledge/schemas/data-model.md.

-- ─────────────────────────────────────────────── profiles

alter table public.profiles
  add column if not exists analysis jsonb,
  add column if not exists analysed_at timestamptz,
  -- Every photo from the intake set, in upload order. photo_paths[1] is the front shot
  -- and doubles as reference_photo_path for image generation.
  add column if not exists photo_paths text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_onboarding_stage_check;

update public.profiles
   set onboarding_stage = case
     when onboarding_stage in ('call', 'vibe', 'photos') then 'photos'
     when onboarding_stage in ('wardrobe', 'reveal')     then 'analysis'
     else onboarding_stage
   end;

alter table public.profiles
  add constraint profiles_onboarding_stage_check
  check (onboarding_stage in ('photos', 'analysis', 'styles', 'done'));

alter table public.profiles alter column onboarding_stage set default 'photos';

-- ─────────────────────────────────────────────── style suggestions

create table if not exists public.style_suggestions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  rank           int not null default 0,
  name           text not null,
  one_liner      text,
  why_it_works   text,
  -- [{ "name": "Deep olive", "hex": "#3B4A2F" }]
  palette        jsonb not null default '[]'::jsonb,
  key_pieces     text[] not null default '{}',
  product_slugs  text[] not null default '{}',
  occasions      text[] not null default '{}',
  image_path     text,
  created_at     timestamptz not null default now()
);

create index if not exists style_suggestions_user_idx
  on public.style_suggestions (user_id, rank);

alter table public.style_suggestions enable row level security;

drop policy if exists "own rows" on public.style_suggestions;
create policy "own rows" on public.style_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
