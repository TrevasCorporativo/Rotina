'use client';

import { useMemo, useState } from 'react';
import type {
  CalendarEvent,
  FinanceExpense,
  FinanceIncome,
  FinanceMonth,
  Task,
} from '@/lib/types';

interface TipsViewProps {
  displayName: string;
  todayStr: string;
  nowTimeStr: string;
  tasks: Task[];
  events: CalendarEvent[];
  financeMonths: FinanceMonth[];
  financeExpenses: FinanceExpense[];
  financeIncomes: FinanceIncome[];
  onNavigate: (view: 'tasks' | 'calendar' | 'finance') => void;
}

interface CoachInsight {
  id: string;
  pillar: 'Agenda & Energia' | 'Tarefas & Foco' | 'Financeiro';
  severity: 'alert' | 'warning' | 'good' | 'info';
  title: string;
  analysis: string;
  actions: string[];
  ctaLabel?: string;
  ctaTarget?: 'tasks' | 'calendar' | 'finance';
}

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TipsView({
  displayName,
  todayStr,
  nowTimeStr,
  tasks,
  events,
  financeMonths,
  financeExpenses,
  financeIncomes,
  onNavigate,
}: TipsViewProps) {
  const firstName = displayName.split(' ')[0] || 'Você';
  const currentMonthKey = todayStr.slice(0, 7);

  const [activeTab, setActiveTab] = useState<'chat' | 'diagnosis'>('chat');
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);

  const analysis = useMemo(() => {
    const insights: CoachInsight[] = [];
    let score = 82;

    const monthExp = financeExpenses.filter((e) => e.month_key === currentMonthKey);
    const monthInc = financeIncomes.filter((i) => i.month_key === currentMonthKey);
    const legacyIncome = Number(
      financeMonths.find((m) => m.month_key === currentMonthKey)?.estimated_income ?? 0
    );
    const totalIncome =
      monthInc.reduce((acc, i) => acc + Number(i.amount), 0) + legacyIncome;
    const totalExp = monthExp.reduce((acc, e) => acc + Number(e.amount), 0);
    const unpaidExp = monthExp.filter((e) => !e.paid);
    const balance = totalIncome - totalExp;

    const openTasks = tasks.filter((t) => !t.done);
    const doneTasks = tasks.filter((t) => t.done);
    const overdueTasks = openTasks.filter(
      (t) =>
        t.due_date &&
        (t.due_date < todayStr ||
          (t.due_date === todayStr &&
            t.due_time &&
            t.due_time.slice(0, 5) < nowTimeStr))
    );
    const highOpen = openTasks.filter((t) => t.priority === 'high');

    const todayEvents = events
      .filter((e) => e.event_date === todayStr)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
    const tomorrowStr = addDaysStr(todayStr, 1);
    const tomorrowEvents = events
      .filter((e) => e.event_date === tomorrowStr)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
    const next7DaysEvents = events.filter(
      (e) => e.event_date >= todayStr && e.event_date <= addDaysStr(todayStr, 7)
    );

    let tightGaps = 0;
    for (let i = 1; i < todayEvents.length; i++) {
      const [h1, m1] = todayEvents[i - 1].event_time.split(':').map(Number);
      const [h2, m2] = todayEvents[i].event_time.split(':').map(Number);
      const diffMins = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diffMins >= 0 && diffMins < 60) tightGaps++;
    }

    if (todayEvents.length >= 4 || tomorrowEvents.length >= 4 || tightGaps >= 2) {
      score -= 14;
      insights.push({
        id: 'agenda-heavy',
        pillar: 'Agenda & Energia',
        severity: 'alert',
        title: 'Agenda apertada — cuide do seu descanso',
        analysis: `Você tem ${todayEvents.length} compromisso(s) hoje e ${tomorrowEvents.length} amanhã. Dias muito cheios drenam energia rápido.`,
        actions: [
          'Veja se algo pode ser remarcado ou resolvido por mensagem.',
          'Reserve 30 min livres para respirar e comer sem pressa.',
        ],
        ctaLabel: 'Rever Agenda',
        ctaTarget: 'calendar',
      });
    } else if (next7DaysEvents.length >= 10) {
      score -= 8;
      insights.push({
        id: 'agenda-busy-week',
        pillar: 'Agenda & Energia',
        severity: 'warning',
        title: 'Semana movimentada',
        analysis: `Há ${next7DaysEvents.length} compromissos nos próximos 7 dias. Planeje pausas para não chegar esgotado(a).`,
        actions: ['Escolha uma noite livre esta semana para descansar de verdade.'],
        ctaLabel: 'Ver semana',
        ctaTarget: 'calendar',
      });
    } else {
      insights.push({
        id: 'agenda-ok',
        pillar: 'Agenda & Energia',
        severity: 'good',
        title:
          todayEvents.length === 0
            ? 'Dia livre de compromissos fixos'
            : 'Ritmo equilibrado na agenda',
        analysis:
          todayEvents.length === 0
            ? 'Sua agenda de hoje está aberta — ótimo momento para focar com calma ou descansar.'
            : `Você tem ${todayEvents.length} compromisso(s) hoje e ${tomorrowEvents.length} amanhã, com bom espaço entre eles.`,
        actions: ['Aproveite para manter intervalos leves e dormir bem hoje.'],
        ctaLabel: 'Abrir Agenda',
        ctaTarget: 'calendar',
      });
    }

    if (overdueTasks.length > 0) {
      score -= Math.min(20, overdueTasks.length * 5);
      insights.push({
        id: 'tasks-overdue',
        pillar: 'Tarefas & Foco',
        severity: 'alert',
        title: `${overdueTasks.length} ${
          overdueTasks.length === 1 ? 'tarefa em atraso' : 'tarefas em atraso'
        }`,
        analysis: `Itens atrasados (${overdueTasks
          .slice(0, 2)
          .map((t) => `"${t.title}"`)
          .join(', ')}) ficam pesando na cabeça.`,
        actions: [
          'Resolva a menor delas agora (menos de 10 min) para destravar.',
          'Reagende as que não cabem hoje para uma data real.',
        ],
        ctaLabel: 'Ir para Tarefas',
        ctaTarget: 'tasks',
      });
    } else if (highOpen.length >= 3) {
      score -= 8;
      insights.push({
        id: 'tasks-high',
        pillar: 'Tarefas & Foco',
        severity: 'warning',
        title: 'Muitas prioridades altas juntas',
        analysis: `${highOpen.length} tarefas estão como prioridade Alta. Escolha no máximo 3 essenciais para hoje.`,
        actions: ['Foque em uma de cada vez antes de abrir novas frentes.'],
        ctaLabel: 'Organizar tarefas',
        ctaTarget: 'tasks',
      });
    } else {
      insights.push({
        id: 'tasks-ok',
        pillar: 'Tarefas & Foco',
        severity: 'good',
        title:
          openTasks.length === 0
            ? 'Todas as tarefas concluídas!'
            : `${openTasks.length} tarefa(s) sob controle`,
        analysis:
          openTasks.length === 0
            ? `Você já confirmou ${doneTasks.length} tarefa(s). Excelente ritmo!`
            : 'Volume tranquilo e sem atrasos. Continue no seu ritmo.',
        actions: ['Conclua uma pendência por vez com foco.'],
        ctaLabel: 'Ver tarefas',
        ctaTarget: 'tasks',
      });
    }

    if (totalIncome === 0 && totalExp === 0) {
      score -= 5;
      insights.push({
        id: 'fin-empty',
        pillar: 'Financeiro',
        severity: 'info',
        title: 'Lance sua receita e contas do mês',
        analysis:
          'Com sua receita recorrente e gastos lançados, consigo te mostrar exatamente quanto sobra livre.',
        actions: ['Adicione suas receitas e contas fixas na aba Financeiro.'],
        ctaLabel: 'Abrir Financeiro',
        ctaTarget: 'finance',
      });
    } else if (balance < 0) {
      score -= 20;
      insights.push({
        id: 'fin-negative',
        pillar: 'Financeiro',
        severity: 'alert',
        title: `Orçamento negativo em ${formatBRL(Math.abs(balance))}`,
        analysis: `Os gastos (${formatBRL(totalExp)}) passaram da receita (${formatBRL(
          totalIncome
        )}) neste mês.`,
        actions: [
          'Segure gastos variáveis pelos próximos dias.',
          'Revise assinaturas ou compras parceladas que podem esperar.',
        ],
        ctaLabel: 'Ajustar Financeiro',
        ctaTarget: 'finance',
      });
    } else {
      const savingsRate =
        totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
      const dueSoon = unpaidExp.filter(
        (e) => e.due_day && e.due_day <= Number(todayStr.slice(8, 10)) + 4
      );
      insights.push({
        id: 'fin-status',
        pillar: 'Financeiro',
        severity: dueSoon.length > 0 || (totalIncome > 0 && savingsRate < 15) ? 'warning' : 'good',
        title:
          dueSoon.length > 0
            ? `${dueSoon.length} conta(s) vencem em breve`
            : `Saldo positivo de ${formatBRL(balance)}`,
        analysis:
          dueSoon.length > 0
            ? `Fique de olho em: ${dueSoon
                .slice(0, 2)
                .map((e) => `${e.title} (dia ${e.due_day})`)
                .join(', ')}.`
            : `Você tem ${savingsRate}% da receita livre este mês. Ótimo controle!`,
        actions: [
          dueSoon.length > 0
            ? 'Separe o valor e marque como pago assim que quitar.'
            : 'Considere guardar uma parte desse saldo para sua reserva.',
        ],
        ctaLabel: 'Ver Financeiro',
        ctaTarget: 'finance',
      });
    }

    const clampedScore = Math.max(25, Math.min(100, score));
    const summary =
      clampedScore >= 80
        ? 'Sua rotina está bem equilibrada.'
        : clampedScore >= 60
        ? 'Tudo sob controle, com alguns pontos para ajustar.'
        : 'Dia mais pesado — desacelere e priorize o essencial.';

    return {
      score: clampedScore,
      summary,
      insights,
      metrics: {
        todayEvents,
        tomorrowEvents,
        next7DaysCount: next7DaysEvents.length,
        overdueTasks,
        openTasks,
        doneCount: doneTasks.length,
        balance,
        totalIncome,
        totalExp,
        unpaidExp,
      },
    };
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

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      text: `Oi, ${firstName}! Dei uma olhada na sua rotina de hoje: você tem ${analysis.metrics.todayEvents.length} compromisso(s), ${analysis.metrics.openTasks.length} tarefa(s) aberta(s) e saldo de ${formatBRL(analysis.metrics.balance)} no mês.\n\nPode conversar comigo normalmente — me pergunte o que priorizar, se precisa descansar, ou como estão suas finanças.`,
    },
  ]);

  function buildConversationalReply(promptText: string): string {
    const q = promptText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const {
      todayEvents,
      tomorrowEvents,
      next7DaysCount,
      overdueTasks,
      openTasks,
      balance,
      totalIncome,
      totalExp,
      unpaidExp,
    } = analysis.metrics;

    if (/^(oi|ola|e ai|bom dia|boa tarde|boa noite|tudo bem)/.test(q)) {
      return `Oi, ${firstName}! Tudo ótimo por aqui. Seu índice de equilíbrio hoje está em ${analysis.score}/100. Quer que eu te ajude a organizar o que fazer hoje, revisar a agenda ou olhar o financeiro?`;
    }

    if (q.includes('obrigad') || q.includes('valeu') || q.includes('show')) {
      return `Por nada, ${firstName}! Sempre que precisar colocar a cabeça no lugar ou revisar o dia, é só me chamar aqui.`;
    }

    if (
      q.includes('descans') ||
      q.includes('cansad') ||
      q.includes('estress') ||
      q.includes('pausa') ||
      q.includes('dormir') ||
      q.includes('sobrecar')
    ) {
      if (todayEvents.length >= 3 || overdueTasks.length >= 2) {
        return `Olhando para os seus dados, faz todo sentido você sentir o peso: são ${todayEvents.length} compromisso(s) hoje e ${overdueTasks.length} tarefa(s) atrasada(s). Não tente abraçar tudo hoje. Escolha só 1 coisa importante, resolva, e depois se dê pelo menos 30 a 45 minutos de descanso real sem culpa.`;
      }
      return `Sua carga de hoje está bem leve (${todayEvents.length} compromisso(s) e ${openTasks.length} tarefa(s) aberta(s)). Pode descansar tranquilo(a) sim!`;
    }

    if (
      q.includes('amanha') ||
      q.includes('agenda') ||
      q.includes('compromisso') ||
      q.includes('semana') ||
      q.includes('horario')
    ) {
      const todayTxt = todayEvents.length
        ? todayEvents
            .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
            .join(', ')
        : 'nenhum compromisso marcado';
      const tomorrowTxt = tomorrowEvents.length
        ? tomorrowEvents
            .map((e) => `${e.event_time.slice(0, 5)} ${e.title}`)
            .join(', ')
        : 'dia livre';
      return `Na sua agenda:\n• Hoje: ${todayTxt}.\n• Amanhã: ${tomorrowTxt}.\n• Próximos 7 dias: ${next7DaysCount} compromisso(s) no total.${
        todayEvents.length >= 4 || tomorrowEvents.length >= 4
          ? '\n\nDica: tente deixar um respiro entre eles para não se cansar.'
          : ''
      }`;
    }

    if (
      q.includes('prioriz') ||
      q.includes('tarefa') ||
      q.includes('fazer') ||
      q.includes('hoje') ||
      q.includes('atras')
    ) {
      if (overdueTasks.length > 0) {
        return `Comece tirando da frente o que já passou do prazo: "${overdueTasks[0].title}". Depois, se sobrar energia, escolha mais 1 tarefa aberta (${openTasks.length} no total) e deixe o resto para amanhã sem peso.`;
      }
      if (openTasks.length > 0) {
        return `Você não tem atrasos! Das ${openTasks.length} tarefa(s) em aberto, escolha "${openTasks[0].title}" como foco principal agora. Fazendo uma por vez você rende muito mais.`;
      }
      return `Suas tarefas estão todas em dia! Se quiser, aproveite para descansar ou adiantar algo leve.`;
    }

    if (
      q.includes('gast') ||
      q.includes('financ') ||
      q.includes('dinheiro') ||
      q.includes('sald') ||
      q.includes('receita') ||
      q.includes('conta') ||
      q.includes('pagar')
    ) {
      if (totalIncome === 0 && totalExp === 0) {
        return `Ainda não tem receitas nem gastos lançados neste mês. Assim que você cadastrar no Financeiro, eu analiso seu saldo e te aviso se algo estiver apertado.`;
      }
      return `No Financeiro deste mês:\n• Receitas: ${formatBRL(totalIncome)}\n• Gastos: ${formatBRL(totalExp)}\n• Saldo previsto: ${formatBRL(balance)}\n• Contas em aberto: ${unpaidExp.length}\n\n${
        balance < 0
          ? 'Atenção: o saldo está negativo. Vale segurar gastos extras nos próximos dias.'
          : 'Você está no positivo! Lembre-se de guardar uma parte se puder.'
      }`;
    }

    return `Entendi, ${firstName}! Olhando seu momento atual (equilíbrio ${analysis.score}/100): você tem ${todayEvents.length} compromisso(s) hoje, ${overdueTasks.length} tarefa(s) atrasada(s) e saldo de ${formatBRL(balance)}.\n\nMinha principal sugestão agora: ${analysis.insights[0]?.title.toLowerCase()}. Quer que eu detalhe sua agenda, suas tarefas ou seu financeiro?`;
  }

  async function sendMessage(customPrompt?: string) {
    const text = (customPrompt ?? question).trim();
    if (!text || thinking) return;

    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setThinking(true);

    await new Promise((r) => setTimeout(r, 420));
    const reply = buildConversationalReply(text);

    setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    setThinking(false);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">COPILOTO DE ROTINA</div>
          <h1>Dicas &amp; Bem-estar</h1>
          <p className="subtitle">
            Converse com seu assistente ou veja o diagnóstico organizado da sua rotina.
          </p>
        </div>
      </div>

      {/* Compact Hero */}
      <div className="coach-hero">
        <div className="coach-hero-main">
          <div className="welcome-eyebrow">ÍNDICE DE EQUILÍBRIO</div>
          <h2>
            {analysis.score}/100 · {analysis.summary}
          </h2>
          <div className="coach-pills" style={{ marginTop: 10 }}>
            <span>📅 {analysis.metrics.todayEvents.length} hoje</span>
            <span>☑ {analysis.metrics.openTasks.length} tarefas abertas</span>
            <span>💰 {formatBRL(analysis.metrics.balance)} saldo</span>
          </div>
        </div>
        <div className="coach-score-ring">
          <strong>{analysis.score}</strong>
          <small>pontos</small>
        </div>
      </div>

      {/* Clean 2-tab switcher */}
      <div className="filter-row" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`chip ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          ✦ Conversar com Copiloto
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'diagnosis' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnosis')}
        >
          📊 Diagnóstico &amp; Ações ({analysis.insights.length})
        </button>
      </div>

      {activeTab === 'chat' ? (
        <div className="panel">
          <div className="filter-row">
            {[
              'O que devo priorizar hoje?',
              'Preciso descansar?',
              'Como está minha agenda?',
              'Como está meu financeiro?',
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chip"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="coach-chat">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`coach-msg ${m.role === 'user' ? 'user' : 'bot'}`}
              >
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="coach-msg bot muted">Digitando...</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="coach-input-row"
          >
            <input
              type="text"
              placeholder="Pergunte qualquer coisa sobre seu dia, agenda ou gastos..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="btn" type="submit" disabled={thinking}>
              Enviar
            </button>
          </form>
        </div>
      ) : (
        <div className="tips-grid">
          {analysis.insights.map((item) => (
            <div key={item.id} className={`panel tip-card tip-${item.severity}`}>
              <div className="panel-head" style={{ marginBottom: 10 }}>
                <span
                  className={`tag ${
                    item.severity === 'alert'
                      ? 'high'
                      : item.severity === 'warning'
                      ? 'medium'
                      : item.severity === 'good'
                      ? 'low'
                      : ''
                  }`}
                >
                  {item.pillar}
                </span>
              </div>

              <h2 style={{ fontSize: 16, marginBottom: 8 }}>{item.title}</h2>
              <p
                className="muted"
                style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}
              >
                {item.analysis}
              </p>

              <ul className="tip-actions-list">
                {item.actions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>

              {item.ctaLabel && item.ctaTarget && (
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() => onNavigate(item.ctaTarget!)}
                >
                  {item.ctaLabel} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
