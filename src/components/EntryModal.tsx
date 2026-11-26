'use client';

import { useState } from 'react';
import type { CalendarEvent, Priority } from '@/lib/types';

export interface NewTaskPayload {
  type: 'task';
  title: string;
  category: string;
  due_date: string | null;
  due_dates: string[];
  due_time: string | null;
  priority: Priority;
  notify_enabled: boolean;
  reminder_preset: string;
  reminder_presets: string[];
}

export interface NewEventPayload {
  type: 'event';
  id?: string;
  title: string;
  event_date: string;
  event_dates: string[];
  event_time: string;
  location: string | null;
  notes: string | null;
  notify_enabled: boolean;
  notify_minutes_before: number;
  reminder_preset: string;
}

interface EntryModalProps {
  mode: 'task' | 'event';
  defaultDate: string;
  editingEvent?: CalendarEvent | null;
  onClose: () => void;
  onSave: (payload: NewTaskPayload | NewEventPayload) => Promise<void>;
}

const REMINDER_OPTIONS = [
  { value: 'relative:0', label: 'Na hora exata' },
  { value: 'relative:15', label: '15 minutos antes' },
  { value: 'relative:30', label: '30 minutos antes' },
  { value: 'relative:60', label: '1 hora antes' },
  { value: 'relative:120', label: '2 horas antes' },
  { value: 'relative:360', label: '6 horas antes' },
  { value: 'same_day_08:0', label: 'No dia pela manhã (08h)' },
  { value: 'day_before_08:0', label: '1 dia antes pela manhã (08h)' },
  { value: 'day_before_20:0', label: '1 dia antes à noite (20h)' },
  { value: 'relative:1440', label: '1 dia antes (mesmo horário)' },
];

const TASK_REMINDER_OPTIONS = [
  { value: 'same_day_08', label: 'No dia pela manhã (08h)' },
  { value: 'relative:0', label: 'No horário da tarefa' },
  { value: 'relative:60', label: '1 hora antes' },
  { value: 'day_before_08', label: '1 dia antes pela manhã (08h)' },
  { value: 'day_before_20', label: '1 dia antes à noite (20h)' },
];

const WEEKDAYS = [
  { dow: 1, label: 'Seg' },
  { dow: 2, label: 'Ter' },
  { dow: 3, label: 'Qua' },
  { dow: 4, label: 'Qui' },
  { dow: 5, label: 'Sex' },
  { dow: 6, label: 'Sáb' },
  { dow: 0, label: 'Dom' },
];

function getInitialReminder(editingEvent?: CalendarEvent | null, mode?: 'task' | 'event') {
  if (editingEvent) {
    const preset = editingEvent.reminder_preset || 'relative';
    if (preset !== 'relative') return `${preset}:0`;
    return `relative:${editingEvent.notify_minutes_before ?? 15}`;
  }
  return mode === 'event' ? 'relative:15' : 'same_day_08:0';
}

function formatShortBR(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

function buildWeekdayDates(
  startDateStr: string,
  selectedDows: number[],
  weeks: number
): string[] {
  if (selectedDows.length === 0) return [startDateStr];
  const start = new Date(`${startDateStr}T12:00:00`);
  const totalDays = weeks * 7;
  const out: string[] = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (selectedDows.includes(d.getDay())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      out.push(`${y}-${m}-${day}`);
    }
  }
  return out.length > 0 ? out : [startDateStr];
}

export function EntryModal({
  mode,
  defaultDate,
  editingEvent,
  onClose,
  onSave,
}: EntryModalProps) {
  const isEditing = mode === 'event' && Boolean(editingEvent);

  const [title, setTitle] = useState(editingEvent?.title ?? '');
  const [category, setCategory] = useState('Pessoal');
  const [date, setDate] = useState(editingEvent?.event_date ?? defaultDate);
  const [time, setTime] = useState(
    editingEvent ? editingEvent.event_time.slice(0, 5) : '09:00'
  );
  const [priority, setPriority] = useState<Priority>('medium');
  const [location, setLocation] = useState(editingEvent?.location ?? '');
  const [notes, setNotes] = useState(editingEvent?.notes ?? '');
  const [reminderChoice, setReminderChoice] = useState(() =>
    getInitialReminder(editingEvent, mode)
  );
  const [taskReminders, setTaskReminders] = useState<string[]>([
    'same_day_08',
    'relative:0',
  ]);

  // Multi-day selection state (for creating new tasks or events)
  const [dayMode, setDayMode] = useState<'single' | 'custom' | 'weekdays'>('single');
  const [extraDates, setExtraDates] = useState<string[]>([
    editingEvent?.event_date ?? defaultDate,
  ]);
  const [pickerDate, setPickerDate] = useState(defaultDate);
  const [selectedDows, setSelectedDows] = useState<number[]>([
    new Date(`${defaultDate}T12:00:00`).getDay(),
  ]);
  const [weeksCount, setWeeksCount] = useState('2');

  const [saving, setSaving] = useState(false);

  function toggleTaskReminder(value: string) {
    setTaskReminders((prev) => {
      if (prev.includes(value)) {
        return prev.length > 1 ? prev.filter((item) => item !== value) : prev;
      }
      return [...prev, value];
    });
  }

  function addExtraDate() {
    if (!pickerDate) return;
    setExtraDates((prev) =>
      prev.includes(pickerDate) ? prev : [...prev, pickerDate].sort()
    );
  }

  function removeExtraDate(target: string) {
    setExtraDates((prev) =>
      prev.length > 1 ? prev.filter((d) => d !== target) : prev
    );
  }

  function toggleDow(dow: number) {
    setSelectedDows((prev) => {
      if (prev.includes(dow)) {
        return prev.length > 1 ? prev.filter((d) => d !== dow) : prev;
      }
      return [...prev, dow];
    });
  }

  function resolveTargetDates(): string[] {
    if (isEditing) return [date || defaultDate];
    if (dayMode === 'single') return date ? [date] : [];
    if (dayMode === 'custom') {
      return extraDates.length > 0 ? extraDates : date ? [date] : [];
    }
    const weeks = Math.min(12, Math.max(1, Number(weeksCount) || 1));
    return buildWeekdayDates(date || defaultDate, selectedDows, weeks);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);

    const [preset, minsStr] = reminderChoice.split(':');
    const minutesBefore = Number(minsStr || 0);
    const targetDates = resolveTargetDates();

    try {
      if (mode === 'task') {
        await onSave({
          type: 'task',
          title: trimmed,
          category,
          due_date: targetDates[0] ?? null,
          due_dates: targetDates,
          due_time: time || null,
          priority,
          notify_enabled: true,
          reminder_preset: taskReminders[0] || 'same_day_08',
          reminder_presets: taskReminders,
        });
      } else {
        await onSave({
          type: 'event',
          id: editingEvent?.id,
          title: trimmed,
          event_date: targetDates[0] || defaultDate,
          event_dates: targetDates.length > 0 ? targetDates : [defaultDate],
          event_time: time || '09:00',
          location: location.trim() || null,
          notes: notes.trim() || null,
          notify_enabled: true,
          notify_minutes_before: minutesBefore,
          reminder_preset: preset,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>
            {mode === 'task'
              ? 'Nova tarefa'
              : isEditing
              ? 'Editar evento'
              : 'Novo evento'}
          </h2>
          <button className="close" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="entryName">Título</label>
            <input
              id="entryName"
              required
              maxLength={90}
              autoFocus
              placeholder={
                mode === 'task'
                  ? 'Ex.: Revisar planejamento da semana'
                  : 'Ex.: Consulta médica ou reunião'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {mode === 'task' ? (
            <>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="entryCategory">Categoria</label>
                  <select
                    id="entryCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Trabalho</option>
                    <option>Pessoal</option>
                    <option>Estudos</option>
                    <option>Saúde</option>
                    <option>Financeiro</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="entryPriority">Prioridade</label>
                  <select
                    id="entryPriority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="entryDue">Data inicial</label>
                  <input
                    id="entryDue"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="entryTaskTime">Horário</label>
                  <input
                    id="entryTaskTime"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="entryDate">
                    {isEditing ? 'Data' : 'Data inicial'}
                  </label>
                  <input
                    id="entryDate"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="entryTime">Horário</label>
                  <input
                    id="entryTime"
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Multi-day selector (when creating) */}
          {!isEditing && (
            <div className="field">
              <label>Dias</label>
              <div className="filter-row" style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  className={`chip ${dayMode === 'single' ? 'active' : ''}`}
                  onClick={() => setDayMode('single')}
                >
                  Só 1 dia
                </button>
                <button
                  type="button"
                  className={`chip ${dayMode === 'custom' ? 'active' : ''}`}
                  onClick={() => {
                    setDayMode('custom');
                    if (date && !extraDates.includes(date)) {
                      setExtraDates([date]);
                    }
                  }}
                >
                  Escolher vários dias
                </button>
                <button
                  type="button"
                  className={`chip ${dayMode === 'weekdays' ? 'active' : ''}`}
                  onClick={() => setDayMode('weekdays')}
                >
                  Dias da semana
                </button>
              </div>

              {dayMode === 'custom' && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    background: 'var(--surface-2)',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="date"
                      value={pickerDate}
                      onChange={(e) => setPickerDate(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={addExtraDate}
                    >
                      ＋ Dia
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {extraDates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="chip active"
                        onClick={() => removeExtraDate(d)}
                        title="Remover dia"
                      >
                        {formatShortBR(d)} ×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dayMode === 'weekdays' && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    background: 'var(--surface-2)',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {WEEKDAYS.map((w) => (
                      <button
                        key={w.dow}
                        type="button"
                        className={`chip ${selectedDows.includes(w.dow) ? 'active' : ''}`}
                        onClick={() => toggleDow(w.dow)}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="muted" style={{ fontSize: 11 }}>
                      Repetir por
                    </span>
                    <select
                      value={weeksCount}
                      onChange={(e) => setWeeksCount(e.target.value)}
                      style={{ width: 'auto', padding: '6px 10px' }}
                    >
                      <option value="1">1 semana</option>
                      <option value="2">2 semanas</option>
                      <option value="4">4 semanas (1 mês)</option>
                      <option value="8">8 semanas (2 meses)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'task' ? (
            <div className="field">
              <label>Notificações automáticas (escolha uma ou mais)</label>
              <div style={{ display: 'grid', gap: 8, paddingTop: 2 }}>
                {TASK_REMINDER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="check"
                      checked={taskReminders.includes(opt.value)}
                      onChange={() => toggleTaskReminder(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="entryLocation">Local (opcional)</label>
                  <input
                    id="entryLocation"
                    placeholder="Ex.: Escritório, online..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="entryNotifyBefore">Avisar antes</label>
                  <select
                    id="entryNotifyBefore"
                    value={reminderChoice}
                    onChange={(e) => setReminderChoice(e.target.value)}
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="entryNotes">Observações (opcional)</label>
                <textarea
                  id="entryNotes"
                  rows={3}
                  maxLength={400}
                  placeholder="Ex.: Levar documentos, chegar 10 min antes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          <div
            style={{
              fontSize: 11,
              color: 'var(--accent)',
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            🔔 Notificação push ativada automaticamente para este item.
          </div>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
