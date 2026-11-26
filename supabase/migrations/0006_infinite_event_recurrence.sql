-- Support unlimited weekly recurring events (e.g. every Sunday forever)

alter table public.events
  add column if not exists recurrence_days integer[],
  add column if not exists last_notified_date date;

