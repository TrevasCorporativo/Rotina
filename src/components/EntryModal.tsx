'use client';

import { useState } from 'react';
import type { Priority } from '@/lib/types';

export interface NewTaskPayload {
  type: 'task';
  title: string;
  category: string;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
  notify_enabled: boolean;
}

export interface NewEventPayload {
  type: 'event';
  title: string;
  event_date: string;
  event_time: string;
  location: string | null;
  notify_enabled: boolean;
  notify_minutes_before: number;
}

interface EntryModalProps {
  mode: 'task' | 'event';
  defaultDate: string;
  onClose: () => void;
  onSave: (payload: NewTaskPayload | NewEventPayload) => Promise<void>;
}

export function EntryModal({
  mode,
  defaultDate,
  onClose,
  onSave,
}: EntryModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pessoal');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(mode === 'event' ? '09:00' : '');
  const [priority, setPriority] = useState<Priority>('medium');
  const [location, setLocation] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(15);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);

    try {
      if (mode === 'task') {
        await onSave({
          type: 'task',
          title: trimmed,
          category,
          due_date: date || null,
          due_time: time || null,
          priority,
          notify_enabled: notifyEnabled,
        });
      } else {
        await onSave({
          type: 'event',
          title: trimmed,
          event_date: date || defaultDate,
          event_time: time || '09:00',
          location: location.trim() || null,
          notify_enabled: notifyEnabled,
          notify_minutes_before: notifyMinutesBefore,
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
          <h2>{mode === 'task' ? 'Nova tarefa' : 'Novo evento'}</h2>
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
                  <label htmlFor="entryTaskTime">Horário (lembrete)</label>
                  <input
                    id="entryTaskTime"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
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
                    value={notifyMinutesBefore}
                    onChange={(e) => setNotifyMinutesBefore(Number(e.target.value))}
                  >
                    <option value={0}>Na hora exata</option>
                    <option value={15}>15 min antes</option>
                    <option value={30}>30 min antes</option>
                    <option value={60}>1 hora antes</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 12,
              color: '#555d6a',
              marginTop: 4,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              className="check"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
            />
            Enviar notificação push no celular/navegador
          </label>

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

