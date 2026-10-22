-- SONVIX AI Music: persistent, user-owned song drafts.
-- Run once in the existing shared SONVIX Supabase project.
create table if not exists public.ai_music_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Unbenannter Song',
  prompt text not null default '',
  genre text not null default 'Pop',
  mood text not null default 'Energetisch',
  language text not null default 'Deutsch',
  instrumental boolean not null default false,
  lyrics_mode text not null default 'ai' check (lyrics_mode in ('ai','own','none')),
  lyrics text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_music_drafts_user_created_idx
  on public.ai_music_drafts(user_id, created_at desc);
alter table public.ai_music_drafts enable row level security;
drop policy if exists "AI Music users read own drafts" on public.ai_music_drafts;
create policy "AI Music users read own drafts" on public.ai_music_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "AI Music users create own drafts" on public.ai_music_drafts;
create policy "AI Music users create own drafts" on public.ai_music_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "AI Music users edit own drafts" on public.ai_music_drafts;
create policy "AI Music users edit own drafts" on public.ai_music_drafts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "AI Music users delete own drafts" on public.ai_music_drafts;
create policy "AI Music users delete own drafts" on public.ai_music_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);
