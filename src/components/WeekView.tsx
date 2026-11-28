'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { doesEventOccurOnDate } from '@/lib/recurrence';
import type { CalendarEvent, Task, WeeklyBlock } from '@/lib/types';

interface WeekViewProps {
  userId: string;
  todayStr: string;
  tasks: Task[];
  events: CalendarEvent[];
  weeklyBlocks: WeeklyBlock[];
  onTasksChange: React.Dispatch<React.SetStateAction<Task[]>>;
  onEventsChange: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  onWeeklyBlocksChange: React.Dispatch<React.SetStateAction<WeeklyBlock[]>>;
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
  weeklyBlocks,
  onTasksChange,
  onEventsChange,
  onWeeklyBlocksChange,
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
  const [formTime, setFormTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('');
  const [formKind, setFormKind] = useState<'routine' | 'task' | 'event'>('routine');
  const [formDays, setFormDays] = useState<number[]>([activeDay.idx]);
  const [saving, setSaving] = useState(false);

  const itemsByDate = useMemo(() => {
    type DayItem =
      | {
          kind: 'routine';
          id: string;
          title: string;
          time: string;
          endTime: string | null;
          done: boolean;
          block: WeeklyBlock;
        }
      | {
          kind: 'event';
          id: string;
          title: string;
          time: string;
          endTime: string | null;
          done: boolean;
          event: CalendarEvent;
        }
      | {
          kind: 'task';
          id: string;
          title: string;
          time: string;
          endTime: string | null;
          done: boolean;
          task: Task;
        };

    const map = new Map<string, DayItem[]>();

    for (const day of weekDays) {
      const list: DayItem[] = [];

      for (const b of weeklyBlocks) {
        if (b.weekdays.includes(day.idx)) {
          list.push({
            kind: 'routine',
            id: `blk-${b.id}-${day.idx}`,
            title: b.title,
            time: b.start_time.slice(0, 5),
            endTime: b.end_time ? b.end_time.slice(0, 5) : null,
            done: false,
            block: b,
          });
        }
      }

      for (const ev of events) {
        if (doesEventOccurOnDate(ev, day.dateStr)) {
          list.push({
            kind: 'event',
            id: `ev-${ev.id}-${day.dateStr}`,
            title: ev.title,
            time: ev.event_time.slice(0, 5),
            endTime: ev.end_time ? ev.end_time.slice(0, 5) : null,
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
            endTime: t.end_time ? t.end_time.slice(0, 5) : null,
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
  }, [weekDays, weeklyBlocks, events, tasks]);

  function openAddModal() {
    setFormTitle('');
    setFormTime('08:00');
    setFormEndTime('');
    setFormKind('routine');
    setFormDays([activeDay.idx]);
    setModalOpen(true);
  }

  function toggleWeekday(idx: number) {
    setFormDays((prev) =>
      prev.includes(idx)
        ? prev.length > 1
          ? prev.filter((d) => d !== idx)
          : prev
        : [...prev, idx].sort((a, b) => a - b)
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const title = formTitle.trim();
    if (!title || formDays.length === 0) return;
    const cleanEnd = formEndTime.trim() || null;
    setSaving(true);
    try {
      if (formKind === 'routine') {
        const { data, error } = await supabase
          .from('weekly_blocks')
          .insert({
            user_id: userId,
            title,
            start_time: formTime || '08:00',
            end_time: cleanEnd,
            weekdays: formDays,
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao salvar rotina semanal.');
          return;
        }
        onWeeklyBlocksChange((prev) => [...prev, data as WeeklyBlock]);
        onToast('Rotina fixa salva na Semana (não vai para a Agenda)!');
      } else if (formKind === 'event') {
        const firstDay = weekDays.find((d) => d.idx === formDays[0]) ?? activeDay;
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title,
            event_date: firstDay.dateStr,
            event_time: formTime || '08:00',
            end_time: cleanEnd,
            recurrence_days: formDays.length > 1 ? formDays : null,
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
        const rows = formDays.map((dayIdx) => {
          const d = weekDays.find((w) => w.idx === dayIdx) ?? activeDay;
          return {
            user_id: userId,
            title,
            category: 'Pessoal',
            due_date: d.dateStr,
            due_time: formTime || null,
            end_time: cleanEnd,
            priority: 'medium' as const,
            notify_enabled: true,
            reminder_preset: 'same_day_08',
            reminder_presets: ['same_day_08', 'relative:0'],
          };
        });

        const { data, error } = await supabase
          .from('tasks')
          .insert(rows)
          .select('*');

        if (error || !data) {
          onToast('Erro ao salvar tarefa(s).');
          return;
        }
        onTasksChange((prev) => [...(data as Task[]), ...prev]);
        onToast(
          data.length > 1
            ? `${data.length} tarefas replicadas na semana!`
            : 'Tarefa adicionada na semana!'
        );
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBlock(id: string) {
    const { error } = await supabase.from('weekly_blocks').delete().eq('id', id);
    if (error) {
      onToast('Erro ao remover bloco semanal.');
      return;
    }
    onWeeklyBlocksChange((prev) => prev.filter((b) => b.id !== id));
    onToast('Bloco removido da semana.');
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
          <button type="button" className="btn small" onClick={openAddModal}>
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
          <h2 style={{ fontSize: 17 }}>
            {activeDay.label}, {activeDay.monthLabel}
            {activeDay.dateStr === todayStr && (
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
                style={{ cursor: item.kind === 'routine' ? 'default' : 'pointer' }}
                onClick={() => {
                  if (item.kind === 'task') onEditTask(item.task);
                  else if (item.kind === 'event') onEditEvent(item.event);
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
                  <span
                    className={`prio-kind-dot ${
                      item.kind === 'event' ? 'kind-event' : ''
                    }`}
                    aria-hidden="true"
                  >
                    {item.kind === 'event' ? '◷' : '▥'}
                  </span>
                )}
                <div>
                  <div className="task-title">{item.title}</div>
                  <div className="task-meta">
                    <span className="tag prio-ok">
                      {item.time === '99:99'
                        ? 'Sem hora'
                        : item.endTime
                        ? `${item.time} – ${item.endTime}`
                        : item.time}
                    </span>
                    <span className="tag prio-type">
                      {item.kind === 'routine'
                        ? 'Rotina'
                        : item.kind === 'event'
                        ? 'Agenda'
                        : 'Tarefa'}
                    </span>
                  </div>
                </div>
                {item.kind === 'routine' ? (
                  <button
                    type="button"
                    className="icon-mini-btn"
                    title="Remover rotina"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBlock(item.block.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <span className="muted" style={{ fontSize: 13 }}>
                    ›
                  </span>
                )}
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
                  placeholder="Ex: Trabalho, Treinar, Reunião..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="weekTime">Início</label>
                  <input
                    id="weekTime"
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="weekEndTime">Fim (opcional)</label>
                  <input
                    id="weekEndTime"
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <label style={{ margin: 0 }}>Repetir nos dias</label>
                  <button
                    type="button"
                    className="btn secondary small"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => setFormDays([1, 2, 3, 4, 5])}
                  >
                    Seg a Sex
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {WEEKDAY_SHORT.map((lbl, idx) => (
                    <button
                      key={lbl}
                      type="button"
                      className={`chip ${formDays.includes(idx) ? 'active' : ''}`}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => toggleWeekday(idx)}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="weekKind">Onde salvar</label>
                <select
                  id="weekKind"
                  value={formKind}
                  onChange={(e) =>
                    setFormKind(e.target.value as 'routine' | 'task' | 'event')
                  }
                >
                  <option value="routine">
                    Rotina fixa (só na Semana, não vai pra Agenda)
                  </option>
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
