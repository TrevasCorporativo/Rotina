'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { doesEventOccurOnDate } from '@/lib/recurrence';
import type { CalendarEvent, Task } from '@/lib/types';

interface WeekViewProps {
  userId: string;
  todayStr: string;
  tasks: Task[];
  events: CalendarEvent[];
  onTasksChange: React.Dispatch<React.SetStateAction<Task[]>>;
  onEventsChange: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  onToggleTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onEditEvent: (ev: CalendarEvent) => void;
  onToast: (msg: string) => void;
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSundayOfWeek(baseDateStr: string, offsetWeeks: number): Date {
  const d = new Date(`${baseDateStr}T12:00:00`);
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - dow + offsetWeeks * 7);
  return d;
}

export function WeekView({
  userId,
  todayStr,
  tasks,
  events,
  onTasksChange,
  onEventsChange,
  onToggleTask,
  onEditTask,
  onEditEvent,
  onToast,
}: WeekViewProps) {
  const supabase = createClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'day' | 'all'>('day');

  const weekDays = useMemo(() => {
    const sunday = getSundayOfWeek(todayStr, weekOffset);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + idx);
      const dateStr = toDateStr(d);
      return {
        idx,
        dateStr,
        label: WEEKDAY_SHORT[idx],
        dayNum: String(d.getDate()).padStart(2, '0'),
        monthLabel: d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        }),
      };
    });
  }, [todayStr, weekOffset]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const activeDate = weekDays.some((d) => d.dateStr === selectedDate)
    ? selectedDate
    : weekDays[0].dateStr;

  // Quick-add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState('09:00');
  const [quickKind, setQuickKind] = useState<'task' | 'event'>('task');
  const [quickDate, setQuickDate] = useState<string>(activeDate);
  const [saving, setSaving] = useState(false);

  const itemsByDate = useMemo(() => {
    const map = new Map<
      string,
      Array<
        | {
            kind: 'event';
            id: string;
            title: string;
            time: string;
            sub: string;
            done: boolean;
            event: CalendarEvent;
          }
        | {
            kind: 'task';
            id: string;
            title: string;
            time: string;
            sub: string;
            done: boolean;
            task: Task;
          }
      >
    >();

    for (const day of weekDays) {
      const list: Array<
        | {
            kind: 'event';
            id: string;
            title: string;
            time: string;
            sub: string;
            done: boolean;
            event: CalendarEvent;
          }
        | {
            kind: 'task';
            id: string;
            title: string;
            time: string;
            sub: string;
            done: boolean;
            task: Task;
          }
      > = [];

      for (const ev of events) {
        if (doesEventOccurOnDate(ev, day.dateStr)) {
          list.push({
            kind: 'event',
            id: `ev-${ev.id}-${day.dateStr}`,
            title: ev.title,
            time: ev.event_time.slice(0, 5),
            sub: ev.location || ev.category || 'Agenda',
            done: false,
            event: ev,
          });
        }
      }

      for (const t of tasks) {
        if (t.due_date === day.dateStr) {
          list.push({
            kind: 'task',
            id: `task-${t.id}`,
            title: t.title,
            time: t.due_time ? t.due_time.slice(0, 5) : '99:99',
            sub: t.category || 'Tarefa',
            done: t.done,
            task: t,
          });
        }
      }

      list.sort(
        (a, b) => Number(a.done) - Number(b.done) || a.time.localeCompare(b.time)
      );
      map.set(day.dateStr, list);
    }

    return map;
  }, [weekDays, events, tasks]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    const targetDate = weekDays.some((d) => d.dateStr === quickDate)
      ? quickDate
      : activeDate;
    setSaving(true);
    try {
      if (quickKind === 'event') {
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title,
            event_date: targetDate,
            event_time: quickTime || '09:00',
            category: 'Pessoal',
            notify_enabled: true,
            notify_minutes_before: 15,
            reminder_preset: 'relative',
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao adicionar na Agenda.');
          return;
        }
        onEventsChange((prev) => [...prev, data as CalendarEvent]);
        onToast('Compromisso adicionado na semana e na Agenda!');
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title,
            category: 'Pessoal',
            due_date: targetDate,
            due_time: quickTime || null,
            priority: 'medium',
            notify_enabled: true,
            reminder_preset: 'same_day_08',
            reminder_presets: ['same_day_08', 'relative:0'],
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao adicionar tarefa.');
          return;
        }
        onTasksChange((prev) => [data as Task, ...prev]);
        onToast('Tarefa adicionada na semana!');
      }
      setQuickTitle('');
      setSelectedDate(targetDate);
    } finally {
      setSaving(false);
    }
  }

  const weekRangeLabel = `${weekDays[0].monthLabel} – ${weekDays[6].monthLabel}`;
  const daysToRender =
    viewMode === 'all'
      ? weekDays
      : weekDays.filter((d) => d.dateStr === activeDate);

  return (
    <section className="week-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">PLANEJAMENTO SEMANAL</div>
          <h1>Semana</h1>
          <p className="subtitle">
            Organize cada dia com horário — sincronizado automaticamente com Agenda e Tarefas.
          </p>
        </div>
        <div className="week-toolbar">
          <button
            type="button"
            className="btn secondary small"
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Semana anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => {
              setWeekOffset(0);
              setSelectedDate(todayStr);
              setQuickDate(todayStr);
            }}
          >
            {weekOffset === 0 ? `Atual (${weekRangeLabel})` : weekRangeLabel}
          </button>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Próxima semana"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Quick Planner Form (Sunday-style batch launch) */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head" style={{ marginBottom: 10 }}>
          <h2>Lançar na semana</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`chip ${viewMode === 'day' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => setViewMode('day')}
            >
              Por dia
            </button>
            <button
              type="button"
              className={`chip ${viewMode === 'all' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => setViewMode('all')}
            >
              Semana inteira
            </button>
          </div>
        </div>
        <form onSubmit={handleQuickAdd} className="week-quick-form">
          <select
            aria-label="Dia da semana"
            value={weekDays.some((d) => d.dateStr === quickDate) ? quickDate : activeDate}
            onChange={(e) => {
              setQuickDate(e.target.value);
              setSelectedDate(e.target.value);
            }}
          >
            {weekDays.map((d) => (
              <option key={d.dateStr} value={d.dateStr}>
                {d.label} ({d.dayNum})
              </option>
            ))}
          </select>
          <input
            type="time"
            aria-label="Horário"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
          />
          <select
            aria-label="Tipo"
            value={quickKind}
            onChange={(e) => setQuickKind(e.target.value as 'task' | 'event')}
          >
            <option value="task">Tarefa</option>
            <option value="event">Agenda</option>
          </select>
          <input
            type="text"
            placeholder="O que você vai fazer nesse dia e horário?"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            required
          />
          <button type="submit" className="btn small" disabled={saving}>
            <Plus size={14} />
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {/* 7-Day Selector Strip */}
      <div className="week-strip" style={{ marginBottom: 14 }}>
        {weekDays.map((d) => {
          const count = itemsByDate.get(d.dateStr)?.length ?? 0;
          const isSelected = d.dateStr === activeDate && viewMode === 'day';
          const isToday = d.dateStr === todayStr;
          return (
            <button
              key={d.dateStr}
              type="button"
              className={`week-strip-btn ${isSelected ? 'active' : ''} ${
                isToday ? 'today' : ''
              }`}
              onClick={() => {
                setSelectedDate(d.dateStr);
                setQuickDate(d.dateStr);
                setViewMode('day');
              }}
            >
              <span>{d.label}</span>
              <strong>{d.dayNum}</strong>
              <small>{count > 0 ? `${count} item` : 'Livre'}</small>
            </button>
          );
        })}
      </div>

      {/* Day Timeline Cards */}
      <div className={viewMode === 'all' ? 'lab-grid' : ''}>
        {daysToRender.map((d) => {
          const dayItems = itemsByDate.get(d.dateStr) ?? [];
          return (
            <div key={d.dateStr} className="panel" style={{ marginBottom: viewMode === 'all' ? 0 : 14 }}>
              <div className="panel-head" style={{ marginBottom: 10 }}>
                <h2 style={{ fontSize: 16 }}>
                  {d.label}, {d.monthLabel}
                  {d.dateStr === todayStr && (
                    <span className="tag prio-ok" style={{ marginLeft: 8 }}>
                      Hoje
                    </span>
                  )}
                </h2>
                <span className="muted" style={{ fontSize: 12 }}>
                  {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              <div className="task-list">
                {dayItems.length ? (
                  dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={`task ${item.done ? 'done' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (item.kind === 'task') onEditTask(item.task);
                        else onEditEvent(item.event);
                      }}
                    >
                      {item.kind === 'task' ? (
                        <input
                          type="checkbox"
                          className="check"
                          checked={item.done}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => onToggleTask(item.task)}
                        />
                      ) : (
                        <span className="prio-kind-dot kind-event" aria-hidden="true">
                          ◷
                        </span>
                      )}
                      <div>
                        <div className="task-title">{item.title}</div>
                        <div className="task-meta">
                          <span className="tag prio-ok">
                            {item.time === '99:99' ? 'Sem hora' : item.time}
                          </span>
                          <span className="tag prio-type">
                            {item.kind === 'event' ? 'Agenda' : 'Tarefa'}
                          </span>
                          <span>{item.sub}</span>
                        </div>
                      </div>
                      <span className="muted" style={{ fontSize: 13 }}>
                        ›
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    Dia livre. Use &ldquo;Lançar na semana&rdquo; acima para planejar.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
