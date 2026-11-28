-- Devocional: reading plan checkins, virtual Bible highlights, verse notes, and 22h30 alert tracking

alter table public.profiles
  add column if not exists last_devotional_alert_date date;

create table if not exists public.devotional_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null,
  completed_date date not null default current_date,
  reflection text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, day_number)
);

create index if not exists idx_devotional_checkins_user
  on public.devotional_checkins (user_id, day_number);

alter table public.devotional_checkins enable row level security;

drop policy if exists "devotional_checkins_select_own" on public.devotional_checkins;
create policy "devotional_checkins_select_own"
  on public.devotional_checkins for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "devotional_checkins_insert_own" on public.devotional_checkins;
create policy "devotional_checkins_insert_own"
  on public.devotional_checkins for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "devotional_checkins_update_own" on public.devotional_checkins;
create policy "devotional_checkins_update_own"
  on public.devotional_checkins for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "devotional_checkins_delete_own" on public.devotional_checkins;
create policy "devotional_checkins_delete_own"
  on public.devotional_checkins for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.bible_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_abbrev text not null,
  chapter integer not null,
  verse integer not null,
  color text not null default 'yellow',
  created_at timestamptz not null default now(),
  unique (user_id, book_abbrev, chapter, verse)
);

create index if not exists idx_bible_highlights_user_ref
  on public.bible_highlights (user_id, book_abbrev, chapter);

alter table public.bible_highlights enable row level security;

drop policy if exists "bible_highlights_select_own" on public.bible_highlights;
create policy "bible_highlights_select_own"
  on public.bible_highlights for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bible_highlights_insert_own" on public.bible_highlights;
create policy "bible_highlights_insert_own"
  on public.bible_highlights for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "bible_highlights_update_own" on public.bible_highlights;
create policy "bible_highlights_update_own"
  on public.bible_highlights for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "bible_highlights_delete_own" on public.bible_highlights;
create policy "bible_highlights_delete_own"
  on public.bible_highlights for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.bible_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_abbrev text not null,
  chapter integer not null,
  verse integer not null,
  verse_text text not null default '',
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bible_notes_user_ref
  on public.bible_notes (user_id, book_abbrev, chapter);

alter table public.bible_notes enable row level security;

drop policy if exists "bible_notes_select_own" on public.bible_notes;
create policy "bible_notes_select_own"
  on public.bible_notes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bible_notes_insert_own" on public.bible_notes;
create policy "bible_notes_insert_own"
  on public.bible_notes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "bible_notes_delete_own" on public.bible_notes;
create policy "bible_notes_delete_own"
  on public.bible_notes for delete to authenticated
  using ((select auth.uid()) = user_id);
