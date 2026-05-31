-- 0001_init.sql — first Supabase migration for chordHelperv2.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) after creating
-- a fresh project. See docs/SUPABASE-SETUP.md for the full setup walkthrough.

-- ----------------------------------------------------------------------------
-- Table: public.songs — per-user saved progressions.
-- Composite primary key (user_id, id) so different users can use the same id.
-- ----------------------------------------------------------------------------

create table if not exists public.songs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key jsonb not null,
  chords jsonb not null,
  extensions jsonb,
  chord_extensions jsonb,
  locked jsonb,
  envelope jsonb,
  bpm int,
  octave int,
  style text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ----------------------------------------------------------------------------
-- Row-level security: a user can only read/write their own rows.
-- ----------------------------------------------------------------------------

alter table public.songs enable row level security;

drop policy if exists "owner_rw" on public.songs;
create policy "owner_rw" on public.songs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- delete_account() — security-definer function so the client SDK can ask
-- the server to delete the current user's auth row. The FK above cascades
-- the songs table; auth.users(id) deletion handles the rest.
-- ----------------------------------------------------------------------------

create or replace function public.delete_account()
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;

-- ----------------------------------------------------------------------------
-- Optional: a no-op view used by the keep-alive cron — see
-- src/app/api/keepalive/route.ts. Reading a real table keeps the DB warm
-- under Supabase's free-tier inactivity timer (paused after 7 days idle).
-- ----------------------------------------------------------------------------

create or replace view public.keepalive as
  select now() as ts;

grant select on public.keepalive to anon, authenticated;
