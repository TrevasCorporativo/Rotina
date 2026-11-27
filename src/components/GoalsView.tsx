'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Goal } from '@/lib/types';

interface GoalsViewProps {
  userId: string;
  todayStr: string;
  goals: Goal[];
  onGoalsChange: React.Dispatch<React.SetStateAction<Goal[]>>;
  onToast: (msg: string) => void;
}

const GOAL_CATEGORIES = [
  'Pessoal',
  'Financeiro',
  'Saúde',
  'Carreira',
  'Estudos',
  'Espiritual',
  'Outros',
];

function getDaysDiffLabel(targetDate: string | null, todayStr: string, done: boolean) {
  if (!targetDate) return { text: 'Sem data alvo', overdue: false };
  const t = new Date(`${targetDate}T12:00:00`).getTime();
  const now = new Date(`${todayStr}T12:00:00`).getTime();
  const diff = Math.round((t - now) / 86_400_000);
  const formatted = new Date(`${targetDate}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (done) return { text: `Alvo: ${formatted}`, overdue: false };
  if (diff < 0) return { text: `${formatted} · Atrasada (${Math.abs(diff)}d)`, overdue: true };
  if (diff === 0) return { text: `${formatted} · É hoje!`, overdue: false };
  if (diff === 1) return { text: `${formatted} · Amanhã`, overdue: false };
  return { text: `${formatted} · Faltam ${diff} dias`, overdue: false };
}

export function GoalsView({
  userId,
  todayStr,
  goals,
  onGoalsChange: setGoals,
  onToast,
}: GoalsViewProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pessoal');
  const [targetDate, setTargetDate] = useState(todayStr);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activeCount = goals.filter((g) => !g.done).length;
  const doneCount = goals.filter((g) => g.done).length;
  const avgProgress = goals.length
    ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)
    : 0;

  const filteredGoals = useMemo(() => {
    return goals
      .filter((g) =>
        filter === 'all' ? true : filter === 'done' ? g.done : !g.done
      )
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          (a.target_date || '9999').localeCompare(b.target_date || '9999')
      );
  }, [goals, filter]);

  function openNewGoal() {
    setEditingGoal(null);
    setTitle('');
    setCategory('Pessoal');
    setTargetDate(todayStr);
    setProgress(0);
    setNotes('');
    setModalOpen(true);
  }

  function openEditGoal(goal: Goal) {
    setEditingGoal(goal);
    setTitle(goal.title);
    setCategory(goal.category);
    setTargetDate(goal.target_date ?? todayStr);
    setProgress(goal.progress);
    setNotes(goal.notes ?? '');
    setModalOpen(true);
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const clampedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const isDone = clampedProgress === 100;

    setSaving(true);
    const supabase = createClient();

    try {
      if (editingGoal) {
        const { data, error } = await supabase
          .from('goals')
          .update({
            title: trimmed,
            category,
            target_date: targetDate || null,
            progress: clampedProgress,
            done: isDone,
            notes: notes.trim() || null,
          })
          .eq('id', editingGoal.id)
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao atualizar meta.');
          return;
        }
        setGoals((prev) =>
          prev.map((g) => (g.id === editingGoal.id ? (data as Goal) : g))
        );
        onToast('Meta atualizada!');
      } else {
        const { data, error } = await supabase
          .from('goals')
          .insert({
            user_id: userId,
            title: trimmed,
            category,
            target_date: targetDate || null,
            progress: clampedProgress,
            done: isDone,
            notes: notes.trim() || null,
          })
          .select('*')
          .single();

        if (error || !data) {
          onToast('Erro ao criar meta.');
          return;
        }
        setGoals((prev) => [data as Goal, ...prev]);
        onToast('Meta criada!');
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(goal: Goal, nextProgress: number) {
    const clamped = Math.min(100, Math.max(0, nextProgress));
    const nextDone = clamped === 100;

    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, progress: clamped, done: nextDone } : g
      )
    );

    const supabase = createClient();
    const { error } = await supabase
      .from('goals')
      .update({ progress: clamped, done: nextDone })
      .eq('id', goal.id);

    if (error) {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
      onToast('Erro ao atualizar progresso.');
    }
  }

  async function deleteGoal(id: string) {
    if (!confirm('Excluir esta meta?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      onToast('Erro ao excluir meta.');
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    onToast('Meta excluída');
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">VISÃO DE FUTURO</div>
          <h1>Minhas metas</h1>
          <p className="subtitle">
            Defina objetivos com data alvo e acompanhe sua evolução.
          </p>
        </div>
        <button className="btn" type="button" onClick={openNewGoal}>
          ＋ Nova meta
        </button>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="stat">
          <div className="stat-top">
            Metas ativas <span className="stat-icon">◎</span>
          </div>
          <strong>{activeCount}</strong>
          <small>Em andamento</small>
        </div>
        <div className="stat">
          <div className="stat-top">
            Alcançadas <span className="stat-icon">✓</span>
          </div>
          <strong>{doneCount}</strong>
          <small>Concluídas 100%</small>
        </div>
        <div className="stat">
          <div className="stat-top">
            Média geral <span className="stat-icon">↗</span>
          </div>
          <strong>{avgProgress}%</strong>
          <small>Progresso médio</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Lista de metas</h2>
          <div className="filter-row" style={{ marginBottom: 0 }}>
            <button
              className={`chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todas
            </button>
            <button
              className={`chip ${filter === 'open' ? 'active' : ''}`}
              onClick={() => setFilter('open')}
            >
              Em andamento
            </button>
            <button
              className={`chip ${filter === 'done' ? 'active' : ''}`}
              onClick={() => setFilter('done')}
            >
              Alcançadas
            </button>
          </div>
        </div>

        {filteredGoals.length ? (
          <div className="tips-grid">
            {filteredGoals.map((g) => {
              const dateInfo = getDaysDiffLabel(g.target_date, todayStr, g.done);
              return (
                <div
                  key={g.id}
                  className={`panel tip-card ${
                    g.done ? 'tip-good' : dateInfo.overdue ? 'tip-alert' : ''
                  }`}
                  style={{ background: 'var(--surface-2)' }}
                >
                  <div className="panel-head" style={{ marginBottom: 8 }}>
                    <span className="tag">{g.category}</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        type="button"
                        className="event-edit"
                        title="Editar meta"
                        onClick={() => openEditGoal(g)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="task-delete"
                        title="Excluir meta"
                        onClick={() => deleteGoal(g.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <h2
                    style={{
                      fontSize: 16,
                      marginBottom: 4,
                      textDecoration: g.done ? 'line-through' : 'none',
                      color: g.done ? 'var(--green)' : 'var(--text)',
                    }}
                  >
                    {g.title}
                  </h2>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: dateInfo.overdue ? 'var(--red)' : 'var(--muted)',
                      marginBottom: 10,
                    }}
                  >
                    {dateInfo.text}
                  </div>

                  {g.notes && (
                    <p
                      className="muted"
                      style={{ fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}
                    >
                      {g.notes}
                    </p>
                  )}

                  <div className="progress-label">
                    <span>Evolução</span>
                    <strong>{g.progress}%</strong>
                  </div>
                  <div className="progress" style={{ height: 8, marginBottom: 12 }}>
                    <span
                      style={{
                        width: `${g.progress}%`,
                        background: g.done ? 'var(--green)' : 'var(--accent)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => updateProgress(g, g.progress - 10)}
                      disabled={g.progress <= 0}
                    >
                      -10%
                    </button>
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => updateProgress(g, g.progress + 10)}
                      disabled={g.progress >= 100}
                    >
                      +10%
                    </button>
                    {!g.done && (
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => updateProgress(g, 100)}
                      >
                        Concluir ✓
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            Nenhuma meta cadastrada aqui ainda. Clique em &ldquo;＋ Nova meta&rdquo; para
            começar!
          </div>
        )}
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
              <h2>{editingGoal ? 'Editar meta' : 'Nova meta'}</h2>
              <button
                className="close"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal}>
              <div className="field">
                <label htmlFor="goalTitle">Qual é a sua meta?</label>
                <input
                  id="goalTitle"
                  required
                  maxLength={90}
                  autoFocus
                  placeholder="Ex.: Juntar reserva de emergência, Ler 12 livros..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="goalCategory">Categoria</label>
                  <select
                    id="goalCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {GOAL_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="goalDate">Data alvo</label>
                  <input
                    id="goalDate"
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="goalProgress">Progresso inicial ({progress}%)</label>
                <input
                  id="goalProgress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  style={{ padding: 0 }}
                />
              </div>

              <div className="field">
                <label htmlFor="goalNotes">Observações (opcional)</label>
                <textarea
                  id="goalNotes"
                  rows={2}
                  maxLength={300}
                  placeholder="Ex.: Guardar R$ 500 por mês até lá..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
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
                  {saving ? 'Salvando...' : editingGoal ? 'Atualizar' : 'Salvar meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

