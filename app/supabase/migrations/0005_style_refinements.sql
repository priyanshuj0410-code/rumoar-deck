-- Per-style refinement. Every note a user writes about a generated style is kept, both
-- on the style (so the next generation has the context) and as its own row (so the notes
-- can be read across users to improve the prompts).

alter table public.style_suggestions
  add column if not exists refinements text[] not null default '{}';

create table if not exists public.style_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  style_id    uuid references public.style_suggestions (id) on delete set null,
  -- Kept verbatim alongside the note: the style row will be overwritten by the very
  -- regeneration this note triggers, so without a snapshot the signal loses its subject.
  style_name  text,
  note        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists style_feedback_user_idx
  on public.style_feedback (user_id, created_at desc);

alter table public.style_feedback enable row level security;

drop policy if exists "own rows" on public.style_feedback;
create policy "own rows" on public.style_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
