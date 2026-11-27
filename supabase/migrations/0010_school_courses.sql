-- School / Courses progress tracking with strict per-user RLS

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  lesson_id text not null,
  completed boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, lesson_id)
);

create index if not exists idx_course_progress_user_course
  on public.course_progress (user_id, course_id);

alter table public.course_progress enable row level security;

drop policy if exists "course_progress_select_own" on public.course_progress;
create policy "course_progress_select_own"
  on public.course_progress for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "course_progress_insert_own" on public.course_progress;
create policy "course_progress_insert_own"
  on public.course_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "course_progress_update_own" on public.course_progress;
create policy "course_progress_update_own"
  on public.course_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "course_progress_delete_own" on public.course_progress;
create policy "course_progress_delete_own"
  on public.course_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_course_progress_updated_at on public.course_progress;
create trigger set_course_progress_updated_at
  before update on public.course_progress
  for each row execute function public.set_updated_at();

