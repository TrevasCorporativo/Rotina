'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FinanceExpense, FinanceIncome, FinanceMonth } from '@/lib/types';

interface FinanceViewProps {
  userId: string;
  initialMonths: FinanceMonth[];
  expenses: FinanceExpense[];
  incomes: FinanceIncome[];
  onExpensesChange: React.Dispatch<React.SetStateAction<FinanceExpense[]>>;
  onIncomesChange: React.Dispatch<React.SetStateAction<FinanceIncome[]>>;
  onToast: (msg: string) => void;
}

const EXPENSE_CATEGORIES = [
  'Moradia',
  'Contas',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Assinaturas',
  'Outros',
];

const INCOME_CATEGORIES = ['Salário', 'Freelance', 'Renda Extra', 'Outros'];

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
  expenses,
  incomes,
  onExpensesChange: setExpenses,
  onIncomesChange: setIncomes,
  onToast,
}: FinanceViewProps) {
  const currentMonthKey = useMemo(() => getMonthKey(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [months] = useState<FinanceMonth[]>(initialMonths);

  // Modal state (expense or income, create or edit)
  const [modalMode, setModalMode] = useState<'expense' | 'income' | null>(null);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [editingIncome, setEditingIncome] = useState<FinanceIncome | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Contas');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [recurrenceMode, setRecurrenceMode] = useState<
    'single' | 'installments' | 'fixed'
  >('single');
  const [monthsCount, setMonthsCount] = useState('3');
  const [saving, setSaving] = useState(false);

  const monthIncomes = useMemo(() => {
    return incomes
      .filter((i) => i.month_key === selectedMonth)
      .sort((a, b) => (a.receive_day ?? 99) - (b.receive_day ?? 99));
  }, [incomes, selectedMonth]);

  const legacyIncome = useMemo(() => {
    const found = months.find((m) => m.month_key === selectedMonth);
    return Number(found?.estimated_income ?? 0);
  }, [months, selectedMonth]);

  const totalIncome = useMemo(
    () =>
      monthIncomes.reduce((acc, i) => acc + Number(i.amount), 0) + legacyIncome,
    [monthIncomes, legacyIncome]
  );

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

  const balance = totalIncome - totalExpenses;
  const paidPct =
    totalExpenses > 0 ? Math.round((paidTotal / totalExpenses) * 100) : 0;

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

  const maxCompare = Math.max(totalIncome, totalExpenses, 1);

  function openNewModal(type: 'expense' | 'income') {
    setEditingExpense(null);
    setEditingIncome(null);
    setTitle('');
    setAmount('');
    setCategory(type === 'expense' ? 'Contas' : 'Salário');
    setDayOfMonth('');
    setRecurrenceMode('single');
    setMonthsCount('3');
    setModalMode(type);
  }

  function openEditExpense(exp: FinanceExpense) {
    setEditingIncome(null);
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setDayOfMonth(exp.due_day ? String(exp.due_day) : '');
    setModalMode('expense');
  }

  function openEditIncome(inc: FinanceIncome) {
    setEditingExpense(null);
    setEditingIncome(inc);
    setTitle(inc.title);
    setAmount(String(inc.amount));
    setCategory(inc.category);
    setDayOfMonth(inc.receive_day ? String(inc.receive_day) : '');
    setModalMode('income');
  }

  async function handleSaveModal(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!trimmed || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      onToast('Preencha descrição e valor válido.');
      return;
    }

    const parsedDay = dayOfMonth
      ? Math.min(31, Math.max(1, Number(dayOfMonth)))
      : null;

    setSaving(true);
    const supabase = createClient();

    try {
      if (modalMode === 'expense') {
        if (editingExpense) {
          const { data, error } = await supabase
            .from('finance_expenses')
            .update({
              title: trimmed,
              amount: parsedAmount,
              category,
              due_day: parsedDay,
            })
            .eq('id', editingExpense.id)
            .select('*')
            .single();

          if (error || !data) {
            onToast('Erro ao atualizar gasto.');
            return;
          }
          setExpenses((prev) =>
            prev.map((item) =>
              item.id === editingExpense.id ? (data as FinanceExpense) : item
            )
          );
          onToast('Gasto atualizado!');
        } else {
          const totalMonths =
            recurrenceMode === 'single'
              ? 1
              : recurrenceMode === 'fixed'
              ? 12
              : Math.min(60, Math.max(2, Number(monthsCount) || 2));

          const groupId = totalMonths > 1 ? crypto.randomUUID() : null;
          const rows = Array.from({ length: totalMonths }, (_, i) => ({
            user_id: userId,
            month_key: addMonthsToKey(selectedMonth, i),
            title: trimmed,
            amount: parsedAmount,
            category,
            due_day: parsedDay,
            paid: false,
            recurrence_group_id: groupId,
            installment_index: totalMonths > 1 ? i + 1 : null,
            installment_total: totalMonths > 1 ? totalMonths : null,
          }));

          const { data, error } = await supabase
            .from('finance_expenses')
            .insert(rows)
            .select('*');

          if (error || !data) {
            onToast('Erro ao salvar gasto.');
            return;
          }
          setExpenses((prev) => [...prev, ...(data as FinanceExpense[])]);
          onToast(
            totalMonths > 1
              ? `Gasto lançado para ${totalMonths} meses!`
              : 'Gasto adicionado!'
          );
        }
      } else if (modalMode === 'income') {
        if (editingIncome) {
          const { data, error } = await supabase
            .from('finance_incomes')
            .update({
              title: trimmed,
              amount: parsedAmount,
              category,
              receive_day: parsedDay,
            })
            .eq('id', editingIncome.id)
            .select('*')
            .single();

          if (error || !data) {
            onToast('Erro ao atualizar receita.');
            return;
          }
          setIncomes((prev) =>
            prev.map((item) =>
              item.id === editingIncome.id ? (data as FinanceIncome) : item
            )
          );
          onToast('Receita atualizada!');
        } else {
          const totalMonths =
            recurrenceMode === 'single'
              ? 1
              : recurrenceMode === 'fixed'
              ? 12
              : Math.min(60, Math.max(2, Number(monthsCount) || 2));

          const groupId = totalMonths > 1 ? crypto.randomUUID() : null;
          const rows = Array.from({ length: totalMonths }, (_, i) => ({
            user_id: userId,
            month_key: addMonthsToKey(selectedMonth, i),
            title: trimmed,
            amount: parsedAmount,
            category,
            receive_day: parsedDay,
            recurrence_group_id: groupId,
            installment_index: totalMonths > 1 ? i + 1 : null,
            installment_total: totalMonths > 1 ? totalMonths : null,
          }));

          const { data, error } = await supabase
            .from('finance_incomes')
            .insert(rows)
            .select('*');

          if (error || !data) {
            onToast('Erro ao salvar receita.');
            return;
          }
          setIncomes((prev) => [...prev, ...(data as FinanceIncome[])]);
          onToast(
            totalMonths > 1
              ? `Receita lançada para ${totalMonths} meses!`
              : 'Receita adicionada!'
          );
        }
      }

      setModalMode(null);
    } finally {
      setSaving(false);
    }
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

  async function deleteIncome(inc: FinanceIncome) {
    const supabase = createClient();

    if (inc.recurrence_group_id) {
      const deleteAllFuture = confirm(
        'Esta receita é recorrente.\n\nOK = Excluir esta e as próximas\nCancelar = Excluir somente este mês'
      );

      if (deleteAllFuture) {
        const { error } = await supabase
          .from('finance_incomes')
          .delete()
          .eq('recurrence_group_id', inc.recurrence_group_id)
          .gte('month_key', inc.month_key);

        if (error) {
          onToast('Erro ao excluir recorrência.');
          return;
        }
        setIncomes((prev) =>
          prev.filter(
            (item) =>
              !(
                item.recurrence_group_id === inc.recurrence_group_id &&
                item.month_key >= inc.month_key
              )
          )
        );
        onToast('Receitas futuras excluídas');
        return;
      }
    } else if (!confirm('Excluir esta receita?')) {
      return;
    }

    const { error } = await supabase
      .from('finance_incomes')
      .delete()
      .eq('id', inc.id);

    if (error) {
      onToast('Erro ao excluir receita.');
      return;
    }

    setIncomes((prev) => prev.filter((item) => item.id !== inc.id));
    onToast('Receita excluída');
  }

  function handleExportPDF() {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      onToast('Permita pop-ups para exportar o PDF.');
      return;
    }

    const monthTitle = formatMonthLabel(selectedMonth);
    const incomeRows = monthIncomes
      .map(
        (i) =>
          `<tr><td>${i.title}</td><td>${i.category}</td><td>${
            i.receive_day ? 'Dia ' + i.receive_day : '—'
          }</td><td style="text-align:right">${formatBRL(Number(i.amount))}</td></tr>`
      )
      .join('');

    const expenseRows = monthExpenses
      .map(
        (e) =>
          `<tr><td>${e.title}${
            e.installment_index && e.installment_total
              ? ` (${e.installment_index}/${e.installment_total})`
              : ''
          }</td><td>${e.category}</td><td>${
            e.due_day ? 'Dia ' + e.due_day : '—'
          }</td><td>${e.paid ? 'Pago' : 'Em aberto'}</td><td style="text-align:right">${formatBRL(
            Number(e.amount)
          )}</td></tr>`
      )
      .join('');

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Panorama Financeiro — ${monthTitle}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; color: #20242c; padding: 32px; }
  h1 { margin: 0 0 4px; color: #268675; text-transform: capitalize; }
  .sub { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
  .card small { color: #6b7280; font-size: 11px; display: block; }
  .card strong { font-size: 18px; margin-top: 4px; display: block; }
  h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #f0f1f4; text-align: left; }
  th { color: #6b7280; font-weight: 600; }
</style>
</head>
<body>
  <h1>Panorama Financeiro · ${monthTitle}</h1>
  <div class="sub">Modo Sobrevivência · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  <div class="cards">
    <div class="card"><small>Receitas</small><strong>${formatBRL(totalIncome)}</strong></div>
    <div class="card"><small>Gastos</small><strong>${formatBRL(totalExpenses)}</strong></div>
    <div class="card"><small>Saldo previsto</small><strong>${formatBRL(balance)}</strong></div>
    <div class="card"><small>Já pago</small><strong>${paidPct}% (${formatBRL(paidTotal)})</strong></div>
  </div>
  <h2>Receitas</h2>
  <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Dia</th><th style="text-align:right">Valor</th></tr></thead><tbody>${
    incomeRows || '<tr><td colspan="4">Nenhuma receita lançada.</td></tr>'
  }</tbody></table>
  <h2>Gastos</h2>
  <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Venc.</th><th>Status</th><th style="text-align:right">Valor</th></tr></thead><tbody>${
    expenseRows || '<tr><td colspan="5">Nenhum gasto lançado.</td></tr>'
  }</tbody></table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">CONTROLE SIMPLES DO MÊS</div>
          <h1>Financeiro</h1>
          <p className="subtitle">
            Lance múltiplas receitas e gastos mensais, parcelados ou fixos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
            className="btn secondary small"
            type="button"
            onClick={handleExportPDF}
          >
            📄 Exportar PDF
          </button>
          <button
            className="btn secondary small"
            type="button"
            onClick={() => openNewModal('income')}
          >
            ＋ Nova receita
          </button>
          <button
            className="btn small"
            type="button"
            onClick={() => openNewModal('expense')}
          >
            ＋ Novo gasto
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-top">
            Receita estimada <span className="stat-icon">↗</span>
          </div>
          <strong style={{ color: 'var(--accent)' }}>{formatBRL(totalIncome)}</strong>
          <small>
            {monthIncomes.length}{' '}
            {monthIncomes.length === 1 ? 'entrada no mês' : 'entradas no mês'}
          </small>
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
        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Receitas de {formatMonthLabel(selectedMonth)}</h2>
              <button
                className="btn secondary small"
                type="button"
                onClick={() => openNewModal('income')}
              >
                ＋ Receita
              </button>
            </div>

            <div className="task-list">
              {monthIncomes.length ? (
                monthIncomes.map((inc) => (
                  <div key={inc.id} className="task">
                    <div className="task-main">
                      <div className="task-title">{inc.title}</div>
                      <div className="task-meta">
                        <span>{inc.category}</span>
                        {inc.receive_day && (
                          <>
                            <span>·</span>
                            <span>Dia {inc.receive_day}</span>
                          </>
                        )}
                        {inc.installment_index && inc.installment_total && (
                          <span className="tag low">
                            {inc.installment_index}/{inc.installment_total}
                          </span>
                        )}
                      </div>
                    </div>
                    <strong style={{ fontSize: 13, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                      + {formatBRL(Number(inc.amount))}
                    </strong>
                    <button
                      className="event-edit"
                      title="Editar receita"
                      onClick={() => openEditIncome(inc)}
                    >
                      ✎
                    </button>
                    <button
                      className="task-delete"
                      title="Excluir receita"
                      onClick={() => deleteIncome(inc)}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty">
                  Nenhuma receita lançada neste mês. Clique em &ldquo;＋ Nova receita&rdquo;.
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Gastos de {formatMonthLabel(selectedMonth)}</h2>
              <button
                className="btn secondary small"
                type="button"
                onClick={() => openNewModal('expense')}
              >
                ＋ Gasto
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
                      className="event-edit"
                      title="Editar gasto"
                      onClick={() => openEditExpense(exp)}
                    >
                      ✎
                    </button>
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
                  Nenhum gasto lançado neste mês. Clique em &ldquo;＋ Novo gasto&rdquo;.
                </div>
              )}
            </div>
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
                  <strong>{formatBRL(totalIncome)}</strong>
                </div>
                <div className="progress" style={{ height: 10 }}>
                  <span
                    style={{
                      width: `${Math.round((totalIncome / maxCompare) * 100)}%`,
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
                        totalExpenses > totalIncome && totalIncome > 0
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

      {modalMode && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <h2>
                {modalMode === 'expense'
                  ? editingExpense
                    ? 'Editar gasto'
                    : 'Novo gasto'
                  : editingIncome
                  ? 'Editar receita'
                  : 'Nova receita'}
              </h2>
              <button
                className="close"
                type="button"
                onClick={() => setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="field">
                <label htmlFor="finTitle">Descrição</label>
                <input
                  id="finTitle"
                  required
                  maxLength={80}
                  autoFocus
                  placeholder={
                    modalMode === 'expense'
                      ? 'Ex.: Aluguel, Internet, Mercado...'
                      : 'Ex.: Salário, Freela, Aluguel recebido...'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="finAmount">Valor (R$)</label>
                  <input
                    id="finAmount"
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
                  <label htmlFor="finCategory">Categoria</label>
                  <select
                    id="finCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {(modalMode === 'expense'
                      ? EXPENSE_CATEGORIES
                      : INCOME_CATEGORIES
                    ).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="finDay">
                    {modalMode === 'expense'
                      ? 'Dia de vencimento (opcional)'
                      : 'Dia de recebimento (opcional)'}
                  </label>
                  <input
                    id="finDay"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex.: 5"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                  />
                </div>

                {!editingExpense && !editingIncome && (
                  <div className="field">
                    <label htmlFor="finRecurrence">Repetição</label>
                    <select
                      id="finRecurrence"
                      value={recurrenceMode}
                      onChange={(e) =>
                        setRecurrenceMode(
                          e.target.value as 'single' | 'installments' | 'fixed'
                        )
                      }
                    >
                      <option value="single">Somente este mês</option>
                      <option value="installments">Repetir por X meses</option>
                      <option value="fixed">
                        {modalMode === 'expense'
                          ? 'Conta fixa (12 meses)'
                          : 'Receita fixa (12 meses)'}
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {!editingExpense &&
                !editingIncome &&
                recurrenceMode === 'installments' && (
                  <div className="field">
                    <label htmlFor="finMonthsCount">Quantidade de meses (X)</label>
                    <input
                      id="finMonthsCount"
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
                  onClick={() => setModalMode(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving
                    ? 'Salvando...'
                    : editingExpense || editingIncome
                    ? 'Atualizar'
                    : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
