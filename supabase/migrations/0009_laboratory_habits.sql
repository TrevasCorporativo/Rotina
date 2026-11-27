-- Personal recovery & discipline tracks ("Laboratório") with strict per-user RLS

create table if not exists public.recovery_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Pureza',
  why_statement text not null default '',
  triggers text not null default '',
  replacement_action text not null default '',
  streak_started_at timestamptz not null default now(),
  best_streak_days integer not null default 0,
  last_checkin_date date,
  relapse_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recovery_tracks_user
  on public.recovery_tracks (user_id, created_at desc);

alter table public.recovery_tracks enable row level security;

drop policy if exists "recovery_tracks_select_own" on public.recovery_tracks;
create policy "recovery_tracks_select_own"
  on public.recovery_tracks for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recovery_tracks_insert_own" on public.recovery_tracks;
create policy "recovery_tracks_insert_own"
  on public.recovery_tracks for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "recovery_tracks_update_own" on public.recovery_tracks;
create policy "recovery_tracks_update_own"
  on public.recovery_tracks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "recovery_tracks_delete_own" on public.recovery_tracks;
create policy "recovery_tracks_delete_own"
  on public.recovery_tracks for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_recovery_tracks_updated_at on public.recovery_tracks;
create trigger set_recovery_tracks_updated_at
  before update on public.recovery_tracks
  for each row execute function public.set_updated_at();

create table if not exists public.recovery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.recovery_tracks(id) on delete cascade,
  log_type text not null check (log_type in ('victory', 'temptation_overcome', 'relapse', 'reflection')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_recovery_logs_track
  on public.recovery_logs (user_id, track_id, created_at desc);

alter table public.recovery_logs enable row level security;

drop policy if exists "recovery_logs_select_own" on public.recovery_logs;
create policy "recovery_logs_select_own"
  on public.recovery_logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recovery_logs_insert_own" on public.recovery_logs;
create policy "recovery_logs_insert_own"
  on public.recovery_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "recovery_logs_delete_own" on public.recovery_logs;
create policy "recovery_logs_delete_own"
  on public.recovery_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

