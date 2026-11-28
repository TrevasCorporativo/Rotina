-- Add interactive lesson activity checklist tracking to course_progress
alter table public.course_progress
  add column if not exists checklist_done jsonb not null default '[]'::jsonb;

