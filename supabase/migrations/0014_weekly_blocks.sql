-- Recurring weekly routine blocks (visible in Semana, excluded from Agenda)

create table if not exists public.weekly_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_time text not null,
  end_time text,
  weekdays integer[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_weekly_blocks_user
  on public.weekly_blocks (user_id);

alter table public.weekly_blocks enable row level security;

drop policy if exists "weekly_blocks_select_own" on public.weekly_blocks;
create policy "weekly_blocks_select_own"
  on public.weekly_blocks for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "weekly_blocks_insert_own" on public.weekly_blocks;
create policy "weekly_blocks_insert_own"
  on public.weekly_blocks for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "weekly_blocks_update_own" on public.weekly_blocks;
create policy "weekly_blocks_update_own"
  on public.weekly_blocks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "weekly_blocks_delete_own" on public.weekly_blocks;
create policy "weekly_blocks_delete_own"
  on public.weekly_blocks for delete to authenticated
  using ((select auth.uid()) = user_id);
