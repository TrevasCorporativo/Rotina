import type { CalendarEvent } from '@/lib/types';

export function doesEventOccurOnDate(
  ev: CalendarEvent,
  dateStr: string
): boolean {
  if (!ev.recurrence_days || ev.recurrence_days.length === 0) {
    return ev.event_date === dateStr;
  }
  if (dateStr < ev.event_date) return false;
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  return ev.recurrence_days.includes(dow);
}

export function getNextOccurrenceDate(
  ev: CalendarEvent,
  fromDateStr: string
): string | null {
  if (!ev.recurrence_days || ev.recurrence_days.length === 0) {
    return ev.event_date >= fromDateStr ? ev.event_date : null;
  }

  const startStr = ev.event_date > fromDateStr ? ev.event_date : fromDateStr;
  const base = new Date(`${startStr}T12:00:00`);
  for (let i = 0; i < 8; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (ev.recurrence_days.includes(d.getDay())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return null;
}

