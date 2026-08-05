-- Feedback on generated content. Every reaction is training signal for what to generate
-- next, so it is stored per user per subject rather than as an aggregate counter.

create table if not exists public.reactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  subject_type  text not null check (subject_type in ('style', 'look')),
  subject_id    uuid not null,
  kind          text not null check (kind in ('like', 'dislike', 'save', 'share')),
  created_at    timestamptz not null default now(),
  -- One row per reaction kind per subject. Liking twice is not twice the signal.
  unique (user_id, subject_type, subject_id, kind)
);

create index if not exists reactions_subject_idx
  on public.reactions (user_id, subject_type, subject_id);

alter table public.reactions enable row level security;

drop policy if exists "own rows" on public.reactions;
create policy "own rows" on public.reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
