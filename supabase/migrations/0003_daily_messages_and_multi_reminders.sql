-- Multi-reminder support for tasks & daily summary/inspiration tracking on profiles

alter table public.tasks
  add column if not exists reminder_presets text[] not null default array['same_day_08']::text[],
  add column if not exists notified_presets text[] not null default '{}'::text[];

alter table public.profiles
  add column if not exists last_daily_summary_date date,
  add column if not exists last_daily_inspiration_date date;

