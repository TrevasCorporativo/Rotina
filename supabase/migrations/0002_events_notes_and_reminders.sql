-- Add notes and flexible reminder presets to events and tasks

alter table public.events
  add column if not exists notes text,
  add column if not exists reminder_preset text not null default 'relative';

alter table public.tasks
  add column if not exists reminder_preset text not null default 'relative';

