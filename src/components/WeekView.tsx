'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const dow = d.getDay();
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
  const activeDay =
    weekDays.find((d) => d.dateStr === selectedDate) ?? weekDays[0];

  // Clean Add Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formKind, setFormKind] = useState<'task' | 'event'>('task');
  const [formDate, setFormDate] = useState<string>(activeDay.dateStr);
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
            done: boolean;
            event: CalendarEvent;
          }
        | {
            kind: 'task';
            id: string;
            title: string;
            time: string;
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
            done: boolean;
            event: CalendarEvent;
          }
        | {
            kind: 'task';
            id: string;
            title: string;
            time: string;
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

  function openAddModal(dateStr?: string) {
    setFormTitle('');
    setFormTime('09:00');
    setFormKind('task');
    setFormDate(dateStr ?? activeDay.dateStr);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const title = formTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      if (formKind === 'event') {
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title,
            event_date: formDate,
            event_time: formTime || '09:00',
            category: 'Pessoal',
            notify_enabled: true,
            notify_minutes_before: 15,
            reminder_preset: 'relative',
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao salvar na Agenda.');
          return;
        }
        onEventsChange((prev) => [...prev, data as CalendarEvent]);
        onToast('Adicionado na semana e na Agenda!');
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title,
            category: 'Pessoal',
            due_date: formDate,
            due_time: formTime || null,
            priority: 'medium',
            notify_enabled: true,
            reminder_preset: 'same_day_08',
            reminder_presets: ['same_day_08', 'relative:0'],
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao salvar tarefa.');
          return;
        }
        onTasksChange((prev) => [data as Task, ...prev]);
        onToast('Tarefa adicionada na semana!');
      }
      setSelectedDate(formDate);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const weekRangeLabel = `${weekDays[0].monthLabel} – ${weekDays[6].monthLabel}`;
  const dayItems = itemsByDate.get(activeDay.dateStr) ?? [];

  return (
    <section className="week-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">PLANEJAMENTO SEMANAL</div>
          <h1>Semana</h1>
          <p className="subtitle">
            {weekOffset === 0 ? `Atual · ${weekRangeLabel}` : weekRangeLabel}
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
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Próxima semana"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="btn small"
            onClick={() => openAddModal()}
          >
            ＋ Adicionar
          </button>
        </div>
      </div>

      {/* 7-Day Selector Strip */}
      <div className="week-strip" style={{ marginBottom: 14 }}>
        {weekDays.map((d) => {
          const count = itemsByDate.get(d.dateStr)?.length ?? 0;
          const isSelected = d.dateStr === activeDay.dateStr;
          const isToday = d.dateStr === todayStr;
          return (
            <button
              key={d.dateStr}
              type="button"
              className={`week-strip-btn ${isSelected ? 'active' : ''} ${
                isToday ? 'today' : ''
              }`}
              onClick={() => setSelectedDate(d.dateStr)}
            >
              <span>{d.label}</span>
              <strong>{d.dayNum}</strong>
              <small>{count > 0 ? `${count}` : '·'}</small>
            </button>
          );
        })}
      </div>

      {/* Focused Day Schedule */}
      <div className="panel">
        <div className="panel-head" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 17 }}>
              {activeDay.label}, {activeDay.monthLabel}
              {activeDay.dateStr === todayStr && (
                <span className="tag prio-ok" style={{ marginLeft: 8 }}>
                  Hoje
                </span>
              )}
            </h2>
          </div>
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
                  </div>
                </div>
                <span className="muted" style={{ fontSize: 13 }}>
                  ›
                </span>
              </div>
            ))
          ) : (
            <div className="empty">
              Nada marcado para {activeDay.label}. Toque em &ldquo;＋ Adicionar&rdquo; para
              planejar este dia.
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <h2>Planejar na semana</h2>
              <button
                type="button"
                className="close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="field">
                <label htmlFor="weekTitle">O que você vai fazer?</label>
                <input
                  id="weekTitle"
                  required
                  autoFocus
                  placeholder="Ex: Treinar, Reunião, Estudar..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="weekDay">Dia</label>
                  <select
                    id="weekDay"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  >
                    {weekDays.map((d) => (
                      <option key={d.dateStr} value={d.dateStr}>
                        {d.label}, {d.monthLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="weekTime">Horário</label>
                  <input
                    id="weekTime"
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="weekKind">Salvar em</label>
                <select
                  id="weekKind"
                  value={formKind}
                  onChange={(e) => setFormKind(e.target.value as 'task' | 'event')}
                >
                  <option value="task">Tarefa</option>
                  <option value="event">Agenda (compromisso)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
