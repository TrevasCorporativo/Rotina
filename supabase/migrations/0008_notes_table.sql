-- Personal notes with optional photo attachment and strict per-user RLS

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  category text not null default 'Geral',
  image_url text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_user_pinned_created
  on public.notes (user_id, pinned desc, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own"
  on public.notes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
  on public.notes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
  on public.notes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
  on public.notes for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

