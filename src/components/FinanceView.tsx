'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FinanceExpense, FinanceMonth } from '@/lib/types';

interface FinanceViewProps {
  userId: string;
  initialMonths: FinanceMonth[];
  initialExpenses: FinanceExpense[];
  onToast: (msg: string) => void;
}

const CATEGORIES = [
  'Moradia',
  'Contas',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Assinaturas',
  'Outros',
];

const CATEGORY_COLORS: Record<string, string> = {
  Moradia: '#268675',
  Contas: '#3aa783',
  Alimentação: '#df9342',
  Transporte: '#4f7cac',
  Saúde: '#d65c65',
  Lazer: '#8a6bbf',
  Assinaturas: '#3f9bb5',
  Outros: '#858c98',
};

function getMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function addMonthsToKey(monthKey: string, offset: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return getMonthKey(d);
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 15).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function FinanceView({
  userId,
  initialMonths,
  initialExpenses,
  onToast,
}: FinanceViewProps) {
  const currentMonthKey = useMemo(() => getMonthKey(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [months, setMonths] = useState<FinanceMonth[]>(initialMonths);
  const [expenses, setExpenses] = useState<FinanceExpense[]>(initialExpenses);

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Contas');
  const [dueDay, setDueDay] = useState('');
  const [recurrenceMode, setRecurrenceMode] = useState<'single' | 'installments' | 'fixed'>('single');
  const [monthsCount, setMonthsCount] = useState('3');
  const [savingExpense, setSavingExpense] = useState(false);

  const monthIncome = useMemo(() => {
    const found = months.find((m) => m.month_key === selectedMonth);
    return Number(found?.estimated_income ?? 0);
  }, [months, selectedMonth]);

  const monthExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.month_key === selectedMonth)
      .sort((a, b) => {
        if (a.paid !== b.paid) return Number(a.paid) - Number(b.paid);
        return (a.due_day ?? 99) - (b.due_day ?? 99);
      });
  }, [expenses, selectedMonth]);

  const totalExpenses = useMemo(
    () => monthExpenses.reduce((acc, e) => acc + Number(e.amount), 0),
    [monthExpenses]
  );

  const paidTotal = useMemo(
    () =>
      monthExpenses
        .filter((e) => e.paid)
        .reduce((acc, e) => acc + Number(e.amount), 0),
    [monthExpenses]
  );

  const balance = monthIncome - totalExpenses;
  const paidPct = totalExpenses > 0 ? Math.round((paidTotal / totalExpenses) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries())
      .map(([cat, total]) => ({
        category: cat,
        total,
        pct: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
        color: CATEGORY_COLORS[cat] || '#268675',
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses, totalExpenses]);

  const maxCompare = Math.max(monthIncome, totalExpenses, 1);

  async function handleSaveIncome(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(incomeInput.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 0) {
      onToast('Informe um valor válido.');
      return;
    }

    setSavingIncome(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('finance_months')
      .upsert(
        {
          user_id: userId,
          month_key: selectedMonth,
          estimated_income: parsed,
        },
        { onConflict: 'user_id,month_key' }
      )
      .select('*')
      .single();

    setSavingIncome(false);

    if (error || !data) {
      onToast('Não foi possível salvar a receita.');
      return;
    }

    setMonths((prev) => {
      const idx = prev.findIndex((m) => m.month_key === selectedMonth);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = data as FinanceMonth;
        return copy;
      }
      return [...prev, data as FinanceMonth];
    });
    setEditingIncome(false);
    onToast('Receita estimada atualizada!');
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!trimmed || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      onToast('Preencha título e valor válido.');
      return;
    }

    const totalMonths =
      recurrenceMode === 'single'
        ? 1
        : recurrenceMode === 'fixed'
        ? 12
        : Math.min(60, Math.max(2, Number(monthsCount) || 2));

    const parsedDueDay = dueDay ? Math.min(31, Math.max(1, Number(dueDay))) : null;
    const groupId = totalMonths > 1 ? crypto.randomUUID() : null;

    const rows = Array.from({ length: totalMonths }, (_, i) => ({
      user_id: userId,
      month_key: addMonthsToKey(selectedMonth, i),
      title: trimmed,
      amount: parsedAmount,
      category,
      due_day: parsedDueDay,
      paid: false,
      recurrence_group_id: groupId,
      installment_index: totalMonths > 1 ? i + 1 : null,
      installment_total: totalMonths > 1 ? totalMonths : null,
    }));

    setSavingExpense(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('finance_expenses')
      .insert(rows)
      .select('*');

    setSavingExpense(false);

    if (error || !data) {
      onToast('Erro ao salvar gasto.');
      return;
    }

    setExpenses((prev) => [...prev, ...(data as FinanceExpense[])]);
    setTitle('');
    setAmount('');
    setDueDay('');
    setRecurrenceMode('single');
    setModalOpen(false);
    onToast(
      totalMonths > 1
        ? `Gasto lançado para ${totalMonths} meses!`
        : 'Gasto adicionado!'
    );
  }

  async function togglePaid(exp: FinanceExpense) {
    const nextPaid = !exp.paid;
    setExpenses((prev) =>
      prev.map((item) => (item.id === exp.id ? { ...item, paid: nextPaid } : item))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from('finance_expenses')
      .update({ paid: nextPaid })
      .eq('id', exp.id);

    if (error) {
      setExpenses((prev) =>
        prev.map((item) => (item.id === exp.id ? { ...item, paid: exp.paid } : item))
      );
      onToast('Erro ao atualizar pagamento.');
    }
  }

  async function deleteExpense(exp: FinanceExpense) {
    const supabase = createClient();

    if (exp.recurrence_group_id) {
      const deleteAllFuture = confirm(
        'Este gasto é recorrente/parcelado.\n\nOK = Excluir este e os próximos meses\nCancelar = Excluir somente este mês'
      );

      if (deleteAllFuture) {
        const { error } = await supabase
          .from('finance_expenses')
          .delete()
          .eq('recurrence_group_id', exp.recurrence_group_id)
          .gte('month_key', exp.month_key);

        if (error) {
          onToast('Erro ao excluir recorrência.');
          return;
        }
        setExpenses((prev) =>
          prev.filter(
            (item) =>
              !(
                item.recurrence_group_id === exp.recurrence_group_id &&
                item.month_key >= exp.month_key
              )
          )
        );
        onToast('Gastos futuros excluídos');
        return;
      }
    } else if (!confirm('Excluir este gasto?')) {
      return;
    }

    const { error } = await supabase
      .from('finance_expenses')
      .delete()
      .eq('id', exp.id);

    if (error) {
      onToast('Erro ao excluir gasto.');
      return;
    }

    setExpenses((prev) => prev.filter((item) => item.id !== exp.id));
    onToast('Gasto excluído');
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">CONTROLE SIMPLES DO MÊS</div>
          <h1>Financeiro</h1>
          <p className="subtitle">
            Lance sua receita estimada, seus gastos mensais e contas parceladas ou fixas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="calendar-toolbar">
            <button
              className="btn secondary small"
              type="button"
              onClick={() => setSelectedMonth((m) => addMonthsToKey(m, -1))}
            >
              ‹
            </button>
            <strong>{formatMonthLabel(selectedMonth)}</strong>
            <button
              className="btn secondary small"
              type="button"
              onClick={() => setSelectedMonth((m) => addMonthsToKey(m, 1))}
            >
              ›
            </button>
            <button
              className="btn secondary small"
              type="button"
              onClick={() => setSelectedMonth(currentMonthKey)}
            >
              Atual
            </button>
          </div>
          <button
            className="btn"
            type="button"
            onClick={() => setModalOpen(true)}
          >
            ＋ Novo gasto
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-top">
            Receita estimada
            <button
              type="button"
              className="chip"
              style={{ padding: '2px 8px' }}
              onClick={() => {
                setIncomeInput(monthIncome ? String(monthIncome) : '');
                setEditingIncome((prev) => !prev);
              }}
            >
              {editingIncome ? 'Fechar' : 'Editar'}
            </button>
          </div>
          {editingIncome ? (
            <form
              onSubmit={handleSaveIncome}
              style={{ display: 'flex', gap: 6, marginTop: 10 }}
            >
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex.: 4500"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  border: '1px solid var(--line)',
                  background: 'var(--input-bg)',
                  borderRadius: 8,
                  padding: '6px 8px',
                  color: 'var(--text)',
                }}
              />
              <button className="btn small" type="submit" disabled={savingIncome}>
                {savingIncome ? '...' : 'OK'}
              </button>
            </form>
          ) : (
            <>
              <strong style={{ color: 'var(--accent)' }}>{formatBRL(monthIncome)}</strong>
              <small>Clique em Editar para definir</small>
            </>
          )}
        </div>

        <div className="stat">
          <div className="stat-top">
            Total de gastos <span className="stat-icon">↘</span>
          </div>
          <strong>{formatBRL(totalExpenses)}</strong>
          <small>
            {monthExpenses.length}{' '}
            {monthExpenses.length === 1 ? 'conta no mês' : 'contas no mês'}
          </small>
        </div>

        <div className="stat">
          <div className="stat-top">
            Saldo previsto <span className="stat-icon">⚖</span>
          </div>
          <strong style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatBRL(balance)}
          </strong>
          <small>{balance >= 0 ? 'Dentro do orçamento' : 'Gastos acima da receita'}</small>
        </div>

        <div className="stat">
          <div className="stat-top">
            Já pago <span className="stat-icon">✓</span>
          </div>
          <strong>{paidPct}%</strong>
          <small>{formatBRL(paidTotal)} pagos</small>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Gastos de {formatMonthLabel(selectedMonth)}</h2>
            <button
              className="btn secondary small"
              type="button"
              onClick={() => setModalOpen(true)}
            >
              ＋ Adicionar
            </button>
          </div>

          <div className="task-list">
            {monthExpenses.length ? (
              monthExpenses.map((exp) => (
                <div key={exp.id} className={`task ${exp.paid ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    className="check"
                    checked={exp.paid}
                    aria-label="Marcar como pago"
                    onChange={() => togglePaid(exp)}
                  />
                  <div className="task-main">
                    <div className="task-title">{exp.title}</div>
                    <div className="task-meta">
                      <span>{exp.category}</span>
                      {exp.due_day && (
                        <>
                          <span>·</span>
                          <span>Dia {exp.due_day}</span>
                        </>
                      )}
                      {exp.installment_index && exp.installment_total && (
                        <span className="tag">
                          {exp.installment_index}/{exp.installment_total}
                        </span>
                      )}
                      {exp.paid && <span className="tag low">Pago</span>}
                    </div>
                  </div>
                  <strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {formatBRL(Number(exp.amount))}
                  </strong>
                  <button
                    className="task-delete"
                    title="Excluir gasto"
                    onClick={() => deleteExpense(exp)}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">
                Nenhum gasto lançado neste mês. Clique em &ldquo;＋ Novo gasto&rdquo; para
                começar.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Receita vs Gastos</h2>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div className="progress-label">
                  <span>Receita estimada</span>
                  <strong>{formatBRL(monthIncome)}</strong>
                </div>
                <div className="progress" style={{ height: 10 }}>
                  <span
                    style={{
                      width: `${Math.round((monthIncome / maxCompare) * 100)}%`,
                      background: 'var(--green)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="progress-label">
                  <span>Total de gastos</span>
                  <strong>{formatBRL(totalExpenses)}</strong>
                </div>
                <div className="progress" style={{ height: 10 }}>
                  <span
                    style={{
                      width: `${Math.round((totalExpenses / maxCompare) * 100)}%`,
                      background:
                        totalExpenses > monthIncome && monthIncome > 0
                          ? 'var(--red)'
                          : 'var(--orange)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Gastos por categoria</h2>
            </div>

            {categoryBreakdown.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {categoryBreakdown.map((item) => (
                  <div key={item.category}>
                    <div className="progress-label">
                      <span>
                        {item.category} ({item.pct}%)
                      </span>
                      <strong>{formatBRL(item.total)}</strong>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <span
                        style={{
                          width: `${item.pct}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: 16 }}>
                Adicione gastos para visualizar o gráfico por categoria.
              </div>
            )}
          </div>
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
              <h2>Novo gasto</h2>
              <button
                className="close"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense}>
              <div className="field">
                <label htmlFor="expTitle">Descrição</label>
                <input
                  id="expTitle"
                  required
                  maxLength={80}
                  autoFocus
                  placeholder="Ex.: Aluguel, Internet, Mercado..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="expAmount">Valor (R$)</label>
                  <input
                    id="expAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Ex.: 199.90"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="expCategory">Categoria</label>
                  <select
                    id="expCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="expDueDay">Dia de vencimento (opcional)</label>
                  <input
                    id="expDueDay"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex.: 10"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="expRecurrence">Repetição</label>
                  <select
                    id="expRecurrence"
                    value={recurrenceMode}
                    onChange={(e) =>
                      setRecurrenceMode(
                        e.target.value as 'single' | 'installments' | 'fixed'
                      )
                    }
                  >
                    <option value="single">Somente este mês</option>
                    <option value="installments">Repetir por X meses</option>
                    <option value="fixed">Conta fixa (12 meses)</option>
                  </select>
                </div>
              </div>

              {recurrenceMode === 'installments' && (
                <div className="field">
                  <label htmlFor="expMonthsCount">Quantidade de meses (X)</label>
                  <input
                    id="expMonthsCount"
                    type="number"
                    min="2"
                    max="60"
                    required
                    value={monthsCount}
                    onChange={(e) => setMonthsCount(e.target.value)}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={savingExpense}>
                  {savingExpense ? 'Salvando...' : 'Salvar gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

