-- Personal goals with target date and strict per-user RLS

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Pessoal',
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_user_done_date
  on public.goals (user_id, done, target_date);

alter table public.goals enable row level security;

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own"
  on public.goals for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own"
  on public.goals for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own"
  on public.goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own"
  on public.goals for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

