-- RUMOAR initial schema. See knowledge/schemas/data-model.md.
-- Run against a fresh Supabase project: supabase db push, or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────── profiles

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  vibe              text,
  occasions         text[] not null default '{}',
  budget_band       text check (budget_band in ('value', 'mid', 'premium')),
  onboarding_stage  text not null default 'call'
                      check (onboarding_stage in ('call','vibe','photos','wardrobe','reveal','done')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Every authenticated user gets a profile row the moment they first appear.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────── wardrobe

create table if not exists public.wardrobe_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  image_path  text,
  label       text not null,
  kind        text not null default 'other'
                check (kind in ('top','bottom','footwear','outerwear','bag','eyewear','headwear','other')),
  colour      text,
  source      text not null default 'manual' check (source in ('vision','manual','sample')),
  confidence  numeric,
  created_at  timestamptz not null default now()
);

create index if not exists wardrobe_items_user_idx on public.wardrobe_items (user_id, created_at desc);

-- ─────────────────────────────────────────────── looks

create table if not exists public.looks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  subtitle    text,
  image_path  text,
  rating      int check (rating between 0 and 100),
  item_refs   jsonb not null default '[]'::jsonb,
  saved       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists looks_user_idx on public.looks (user_id, created_at desc);

-- ─────────────────────────────────────────────── catalog

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  kind         text not null default 'other'
                 check (kind in ('top','bottom','footwear','outerwear','bag','eyewear','headwear','other')),
  price_inr    int not null check (price_inr >= 0),
  image_path   text,
  description  text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.saved_products (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ─────────────────────────────────────────────── conversation

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists messages_user_idx on public.messages (user_id, created_at);

-- ─────────────────────────────────────────────── row-level security

alter table public.profiles       enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.looks          enable row level security;
alter table public.saved_products enable row level security;
alter table public.messages       enable row level security;
alter table public.products       enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['wardrobe_items', 'looks', 'saved_products', 'messages'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end;
$$;

-- The catalog is readable by anyone, including signed-out visitors. There is deliberately
-- no client write policy: seeding runs with the service role.
drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select using (active);

-- ─────────────────────────────────────────────── storage

insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false), ('looks', 'looks', false), ('catalog', 'catalog', true)
on conflict (id) do nothing;

-- Objects live under {user_id}/… so the folder name is the authorisation check.
do $$
declare b text;
begin
  foreach b in array array['wardrobe', 'looks'] loop
    execute format('drop policy if exists "%s: own folder" on storage.objects', b);
    execute format($f$
      create policy "%s: own folder" on storage.objects
        for all
        using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
        with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
    $f$, b, b, b);
  end loop;
end;
$$;

drop policy if exists "catalog: public read" on storage.objects;
create policy "catalog: public read" on storage.objects
  for select using (bucket_id = 'catalog');
