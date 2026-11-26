'use client';

import { useMemo } from 'react';
import type {
  CalendarEvent,
  FinanceExpense,
  FinanceIncome,
  FinanceMonth,
  Task,
} from '@/lib/types';

interface TipsViewProps {
  todayStr: string;
  nowTimeStr: string;
  tasks: Task[];
  events: CalendarEvent[];
  financeMonths: FinanceMonth[];
  financeExpenses: FinanceExpense[];
  financeIncomes: FinanceIncome[];
  onNavigate: (view: 'tasks' | 'calendar' | 'finance') => void;
}

interface TipCard {
  area: 'Financeiro' | 'Tarefas' | 'Agenda';
  level: 'alert' | 'good' | 'info';
  title: string;
  description: string;
  actionLabel?: string;
  target?: 'tasks' | 'calendar' | 'finance';
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function TipsView({
  todayStr,
  nowTimeStr,
  tasks,
  events,
  financeMonths,
  financeExpenses,
  financeIncomes,
  onNavigate,
}: TipsViewProps) {
  const currentMonthKey = todayStr.slice(0, 7);

  const tips = useMemo<TipCard[]>(() => {
    const list: TipCard[] = [];

    // 1. Finance analysis
    const monthExp = financeExpenses.filter((e) => e.month_key === currentMonthKey);
    const monthInc = financeIncomes.filter((i) => i.month_key === currentMonthKey);
    const legacyIncome = Number(
      financeMonths.find((m) => m.month_key === currentMonthKey)?.estimated_income ?? 0
    );
    const totalIncome =
      monthInc.reduce((acc, i) => acc + Number(i.amount), 0) + legacyIncome;
    const totalExp = monthExp.reduce((acc, e) => acc + Number(e.amount), 0);
    const unpaidExp = monthExp.filter((e) => !e.paid);

    if (totalIncome === 0 && totalExp === 0) {
      list.push({
        area: 'Financeiro',
        level: 'info',
        title: 'Comece lançando sua receita e contas do mês',
        description:
          'Adicione seu salário ou entradas recorrentes e seus gastos fixos para enxergar quanto sobra livre no mês.',
        actionLabel: 'Ir para Financeiro',
        target: 'finance',
      });
    } else {
      const balance = totalIncome - totalExp;
      if (balance < 0) {
        list.push({
          area: 'Financeiro',
          level: 'alert',
          title: `Gastos acima da receita em ${formatBRL(Math.abs(balance))}`,
          description:
            'Revise despesas variáveis (lazer, assinaturas ou alimentação) ou adiante parcelas que possam esperar para equilibrar o mês.',
          actionLabel: 'Revisar gastos',
          target: 'finance',
        });
      } else if (totalIncome > 0) {
        const savingsRate = Math.round((balance / totalIncome) * 100);
        if (savingsRate < 15) {
          list.push({
            area: 'Financeiro',
            level: 'info',
            title: `Margem apertada (${savingsRate}% livre)`,
            description: `Seu saldo previsto é de ${formatBRL(balance)}. Tente reservar pelo menos 15% a 20% da receita para imprevistos.`,
            actionLabel: 'Ver panorama',
            target: 'finance',
          });
        } else {
          list.push({
            area: 'Financeiro',
            level: 'good',
            title: `Ótimo fôlego financeiro (${savingsRate}% livre)`,
            description: `Você tem ${formatBRL(balance)} previstos de sobra este mês. Considere separar uma parte para reserva de emergência.`,
            actionLabel: 'Abrir Financeiro',
            target: 'finance',
          });
        }
      }

      if (monthExp.length > 0) {
        const byCat = new Map<string, number>();
        for (const e of monthExp) {
          byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
        }
        const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];
        if (top && totalExp > 0) {
          const pct = Math.round((top[1] / totalExp) * 100);
          if (pct >= 45) {
            list.push({
              area: 'Financeiro',
              level: 'info',
              title: `Categoria "${top[0]}" concentra ${pct}% dos gastos`,
              description: `São ${formatBRL(top[1])} em ${top[0]}. Vale revisar se há assinaturas ou custos que podem ser reduzidos.`,
              actionLabel: 'Analisar categorias',
              target: 'finance',
            });
          }
        }
      }

      if (unpaidExp.length > 0) {
        const currentDay = Number(todayStr.slice(8, 10));
        const dueSoon = unpaidExp.filter(
          (e) => e.due_day && e.due_day <= currentDay + 3
        );
        if (dueSoon.length > 0) {
          list.push({
            area: 'Financeiro',
            level: 'alert',
            title: `${dueSoon.length} ${
              dueSoon.length === 1 ? 'conta vence em breve' : 'contas vencem em breve'
            }`,
            description: `Fique de olho em: ${dueSoon
              .slice(0, 3)
              .map((e) => `${e.title} (dia ${e.due_day})`)
              .join(', ')}.`,
            actionLabel: 'Marcar pagamentos',
            target: 'finance',
          });
        }
      }
    }

    // 2. Tasks analysis
    const overdueTasks = tasks.filter(
      (t) =>
        !t.done &&
        t.due_date &&
        (t.due_date < todayStr ||
          (t.due_date === todayStr &&
            t.due_time &&
            t.due_time.slice(0, 5) < nowTimeStr))
    );
    const highOpen = tasks.filter((t) => !t.done && t.priority === 'high');
    const doneTasks = tasks.filter((t) => t.done);

    if (overdueTasks.length > 0) {
      list.push({
        area: 'Tarefas',
        level: 'alert',
        title: `Você tem ${overdueTasks.length} ${
          overdueTasks.length === 1 ? 'tarefa em atraso' : 'tarefas em atraso'
        }`,
        description: `Resolva primeiro ou reagende: ${overdueTasks
          .slice(0, 3)
          .map((t) => t.title)
          .join(', ')}. Tarefas atrasadas ficam em vermelho para te lembrar.`,
        actionLabel: 'Resolver tarefas',
        target: 'tasks',
      });
    }

    if (highOpen.length >= 3) {
      list.push({
        area: 'Tarefas',
        level: 'info',
        title: `${highOpen.length} tarefas com prioridade Alta em aberto`,
        description:
          'Quando tudo é urgente, nada é urgente. Escolha 1 ou 2 prioridades reais para hoje e mova as demais para Média.',
        actionLabel: 'Organizar prioridades',
        target: 'tasks',
      });
    } else if (tasks.length > 0 && doneTasks.length === tasks.length) {
      list.push({
        area: 'Tarefas',
        level: 'good',
        title: '100% das tarefas concluídas!',
        description:
          'Excelente ritmo! Aproveite o tempo livre para descansar ou planejar os próximos dias sem pressa.',
        actionLabel: 'Ver tarefas',
        target: 'tasks',
      });
    }

    // 3. Agenda analysis
    const todayEvents = events.filter((e) => e.event_date === todayStr);
    const upcoming = events.filter((e) => e.event_date > todayStr);

    if (todayEvents.length >= 4) {
      list.push({
        area: 'Agenda',
        level: 'alert',
        title: `Dia bem cheio hoje (${todayEvents.length} compromissos)`,
        description:
          'Evite encaixar tarefas pesadas hoje. Garanta intervalos de 10-15 minutos entre um compromisso e outro.',
        actionLabel: 'Ver agenda de hoje',
        target: 'calendar',
      });
    } else if (todayEvents.length === 0 && upcoming.length === 0) {
      list.push({
        area: 'Agenda',
        level: 'info',
        title: 'Sua agenda está livre nos próximos dias',
        description:
          'Que tal bloquear um horário para cuidar da saúde, estudos ou um momento especial sem interrupções?',
        actionLabel: 'Abrir Agenda',
        target: 'calendar',
      });
    } else {
      list.push({
        area: 'Agenda',
        level: 'good',
        title: 'Agenda equilibrada',
        description: `Você tem ${todayEvents.length} ${
          todayEvents.length === 1 ? 'compromisso hoje' : 'compromissos hoje'
        } e ${upcoming.length} próximos agendados. Lembretes serão enviados automaticamente.`,
        actionLabel: 'Consultar Agenda',
        target: 'calendar',
      });
    }

    return list;
  }, [
    currentMonthKey,
    events,
    financeExpenses,
    financeIncomes,
    financeMonths,
    nowTimeStr,
    tasks,
    todayStr,
  ]);

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">ANÁLISE INTELIGENTE DA SUA ROTINA</div>
          <h1>Dicas personalizadas</h1>
          <p className="subtitle">
            Sugestões práticas geradas automaticamente com base no seu Financeiro,
            Tarefas e Agenda.
          </p>
        </div>
      </div>

      <div className="tips-grid">
        {tips.map((tip, idx) => (
          <div key={idx} className={`panel tip-card tip-${tip.level}`}>
            <div className="panel-head" style={{ marginBottom: 10 }}>
              <span className={`tag ${tip.level === 'alert' ? 'high' : tip.level === 'good' ? 'low' : ''}`}>
                {tip.area}
              </span>
              <span className="muted" style={{ fontSize: 11 }}>
                {tip.level === 'alert'
                  ? 'Atenção'
                  : tip.level === 'good'
                  ? 'Ponto positivo'
                  : 'Sugestão'}
              </span>
            </div>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>{tip.title}</h2>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>
              {tip.description}
            </p>
            {tip.actionLabel && tip.target && (
              <button
                type="button"
                className="btn secondary small"
                onClick={() => onNavigate(tip.target!)}
              >
                {tip.actionLabel} →
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

