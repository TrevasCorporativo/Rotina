-- Multiple recurring or one-off incomes per month with strict per-user RLS

create table if not exists public.finance_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null, -- YYYY-MM
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default 'Salário',
  receive_day integer check (receive_day between 1 and 31),
  recurrence_group_id uuid,
  installment_index integer,
  installment_total integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_incomes_user_month
  on public.finance_incomes (user_id, month_key);

alter table public.finance_incomes enable row level security;

drop policy if exists "finance_incomes_select_own" on public.finance_incomes;
create policy "finance_incomes_select_own"
  on public.finance_incomes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "finance_incomes_insert_own" on public.finance_incomes;
create policy "finance_incomes_insert_own"
  on public.finance_incomes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "finance_incomes_update_own" on public.finance_incomes;
create policy "finance_incomes_update_own"
  on public.finance_incomes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "finance_incomes_delete_own" on public.finance_incomes;
create policy "finance_incomes_delete_own"
  on public.finance_incomes for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_finance_incomes_updated_at on public.finance_incomes;
create trigger set_finance_incomes_updated_at
  before update on public.finance_incomes
  for each row execute function public.set_updated_at();

