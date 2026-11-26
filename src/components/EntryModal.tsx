'use client';

import { useState } from 'react';
import type { CalendarEvent, Priority } from '@/lib/types';

export interface NewTaskPayload {
  type: 'task';
  title: string;
  category: string;
  due_date: string | null;
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

function getInitialReminder(editingEvent?: CalendarEvent | null, mode?: 'task' | 'event') {
  if (editingEvent) {
    const preset = editingEvent.reminder_preset || 'relative';
    if (preset !== 'relative') return `${preset}:0`;
    return `relative:${editingEvent.notify_minutes_before ?? 15}`;
  }
  return mode === 'event' ? 'relative:15' : 'same_day_08:0';
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
  const [saving, setSaving] = useState(false);

  function toggleTaskReminder(value: string) {
    setTaskReminders((prev) => {
      if (prev.includes(value)) {
        return prev.length > 1 ? prev.filter((item) => item !== value) : prev;
      }
      return [...prev, value];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);

    const [preset, minsStr] = reminderChoice.split(':');
    const minutesBefore = Number(minsStr || 0);

    try {
      if (mode === 'task') {
        await onSave({
          type: 'task',
          title: trimmed,
          category,
          due_date: date || null,
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
          event_date: date || defaultDate,
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
                  <label htmlFor="entryDue">Data</label>
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
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="entryDate">Data</label>
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
