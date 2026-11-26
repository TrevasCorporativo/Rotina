-- Simple monthly finance tracking with strict per-user RLS

create table if not exists public.finance_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null, -- YYYY-MM
  estimated_income numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

alter table public.finance_months enable row level security;

drop policy if exists "finance_months_select_own" on public.finance_months;
create policy "finance_months_select_own"
  on public.finance_months for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "finance_months_insert_own" on public.finance_months;
create policy "finance_months_insert_own"
  on public.finance_months for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "finance_months_update_own" on public.finance_months;
create policy "finance_months_update_own"
  on public.finance_months for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "finance_months_delete_own" on public.finance_months;
create policy "finance_months_delete_own"
  on public.finance_months for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_finance_months_updated_at on public.finance_months;
create trigger set_finance_months_updated_at
  before update on public.finance_months
  for each row execute function public.set_updated_at();

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null, -- YYYY-MM
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default 'Outros',
  due_day integer check (due_day between 1 and 31),
  paid boolean not null default false,
  recurrence_group_id uuid,
  installment_index integer,
  installment_total integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_expenses_user_month
  on public.finance_expenses (user_id, month_key);

alter table public.finance_expenses enable row level security;

drop policy if exists "finance_expenses_select_own" on public.finance_expenses;
create policy "finance_expenses_select_own"
  on public.finance_expenses for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "finance_expenses_insert_own" on public.finance_expenses;
create policy "finance_expenses_insert_own"
  on public.finance_expenses for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "finance_expenses_update_own" on public.finance_expenses;
create policy "finance_expenses_update_own"
  on public.finance_expenses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "finance_expenses_delete_own" on public.finance_expenses;
create policy "finance_expenses_delete_own"
  on public.finance_expenses for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_finance_expenses_updated_at on public.finance_expenses;
create trigger set_finance_expenses_updated_at
  before update on public.finance_expenses
  for each row execute function public.set_updated_at();

