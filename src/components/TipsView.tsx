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

  const [pillarFilter, setPillarFilter] = useState<
    'all' | 'Agenda & Energia' | 'Tarefas & Foco' | 'Financeiro'
  >('all');
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const analysis = useMemo(() => {
    const insights: CoachInsight[] = [];
    let score = 82;

    // --- Finance metrics ---
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

    // --- Task metrics ---
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

    // --- Agenda metrics ---
    const todayEvents = events
      .filter((e) => e.event_date === todayStr)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
    const tomorrowStr = addDaysStr(todayStr, 1);
    const tomorrowEvents = events.filter((e) => e.event_date === tomorrowStr);
    const next7DaysEvents = events.filter(
      (e) => e.event_date >= todayStr && e.event_date <= addDaysStr(todayStr, 7)
    );

    // Check tight schedule gaps today
    let tightGaps = 0;
    for (let i = 1; i < todayEvents.length; i++) {
      const [h1, m1] = todayEvents[i - 1].event_time.split(':').map(Number);
      const [h2, m2] = todayEvents[i].event_time.split(':').map(Number);
      const diffMins = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diffMins >= 0 && diffMins < 60) tightGaps++;
    }

    // 1. Agenda & Energia insights
    if (todayEvents.length >= 4 || tomorrowEvents.length >= 4 || tightGaps >= 2) {
      score -= 14;
      insights.push({
        id: 'agenda-heavy',
        pillar: 'Agenda & Energia',
        severity: 'alert',
        title: 'Alerta de sobrecarga: agenda muito apertada',
        analysis: `Você tem ${todayEvents.length} compromisso(s) hoje e ${tomorrowEvents.length} amanhã${
          tightGaps > 0 ? ` (com ${tightGaps} intervalo(s) menor(es) que 1h)` : ''
        }. Dias assim drenam sua energia rápido e aumentam o estresse.`,
        actions: [
          'Reavalie se algum compromisso pode ser remarcado ou resolvido por mensagem.',
          'Bloqueie pelo menos 30 minutos livres para respirar, beber água e almoçar sem pressa.',
          'Evite assumir novas tarefas pesadas hoje.',
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
        title: 'Semana intensa pela frente',
        analysis: `Você já tem ${next7DaysEvents.length} compromissos marcados para os próximos 7 dias. Sem pausas planejadas, o cansaço acumula até o fim de semana.`,
        actions: [
          'Escolha uma noite da semana para desligar de pendências e descansar de verdade.',
          'Prepare roupas/documentos na véspera para reduzir a correria pela manhã.',
        ],
        ctaLabel: 'Ver semana na Agenda',
        ctaTarget: 'calendar',
      });
    } else if (todayEvents.length === 0) {
      insights.push({
        id: 'agenda-free',
        pillar: 'Agenda & Energia',
        severity: 'good',
        title: 'Dia livre de compromissos fixos',
        analysis:
          'Sua agenda de hoje está aberta! Esse é o melhor cenário para focar em algo que você vem adiando ou simplesmente recuperar as energias.',
        actions: [
          'Use 1 bloco de foco de 45 min para matar uma pendência importante.',
          'Reserve um tempo de qualidade para descansar ou fazer algo que te faça bem.',
        ],
        ctaLabel: 'Planejar na Agenda',
        ctaTarget: 'calendar',
      });
    } else {
      insights.push({
        id: 'agenda-balanced',
        pillar: 'Agenda & Energia',
        severity: 'good',
        title: 'Ritmo saudável de compromissos',
        analysis: `Hoje você tem ${todayEvents.length} compromisso(s) e ${tomorrowEvents.length} amanhã. É um volume equilibrado que permite cumprir tudo sem correrias.`,
        actions: [
          'Chegue ou se conecte com 10 min de antecedência para manter a calma.',
        ],
        ctaLabel: 'Abrir Agenda',
        ctaTarget: 'calendar',
      });
    }

    // 2. Tarefas & Foco insights
    if (overdueTasks.length > 0) {
      score -= Math.min(20, overdueTasks.length * 5);
      insights.push({
        id: 'tasks-overdue',
        pillar: 'Tarefas & Foco',
        severity: 'alert',
        title: `${overdueTasks.length} ${
          overdueTasks.length === 1 ? 'tarefa em atraso' : 'tarefas em atraso'
        } pesando na mente`,
        analysis: `Itens atrasados (${overdueTasks
          .slice(0, 2)
          .map((t) => `"${t.title}"`)
          .join(', ')}) geram sensação constante de pendência.`,
        actions: [
          'Escolha a mais rápida (menos de 10 min) e faça agora para ganhar embalo.',
          'Se não der para fazer hoje, atualize a data para um dia realista em vez de deixar no vermelho.',
        ],
        ctaLabel: 'Resolver tarefas',
        ctaTarget: 'tasks',
      });
    }

    if (highOpen.length >= 3) {
      score -= 8;
      insights.push({
        id: 'tasks-high',
        pillar: 'Tarefas & Foco',
        severity: 'warning',
        title: 'Excesso de prioridades altas ao mesmo tempo',
        analysis: `Você marcou ${highOpen.length} tarefas como prioridade Alta. Quando tudo é urgente, o cérebro trava e você sente que não rendeu.`,
        actions: [
          'Aplique a regra do Top 3: escolha no máximo 3 tarefas essenciais para hoje.',
          'Rebaixe as demais para Média até concluir as principais.',
        ],
        ctaLabel: 'Organizar prioridades',
        ctaTarget: 'tasks',
      });
    } else if (tasks.length > 0 && openTasks.length === 0) {
      score += 8;
      insights.push({
        id: 'tasks-clear',
        pillar: 'Tarefas & Foco',
        severity: 'good',
        title: 'Lista zerada! Todas as tarefas confirmadas',
        analysis: `Você concluiu ${doneTasks.length} tarefa(s). Aproveite a sensação de dever cumprido sem inventar trabalho à toa.`,
        actions: ['Descanse ou planeje amanhã com calma antes de encerrar o dia.'],
      });
    } else if (openTasks.length > 0) {
      insights.push({
        id: 'tasks-flow',
        pillar: 'Tarefas & Foco',
        severity: 'info',
        title: `${openTasks.length} ${
          openTasks.length === 1 ? 'tarefa em aberto' : 'tarefas em aberto'
        } no radar`,
        analysis:
          'Você está com um volume controlável. Começar pelo item que mais te incomoda libera energia mental para o resto do dia.',
        actions: [
          'Conclua 1 tarefa antes de abrir várias abas ou distrações.',
        ],
        ctaLabel: 'Ver minhas tarefas',
        ctaTarget: 'tasks',
      });
    }

    // 3. Financeiro insights
    if (totalIncome === 0 && totalExp === 0) {
      score -= 5;
      insights.push({
        id: 'fin-empty',
        pillar: 'Financeiro',
        severity: 'info',
        title: 'Seu panorama financeiro do mês ainda está vazio',
        analysis:
          'Sem lançar sua receita e contas fixas, fica difícil prever quanto realmente pode gastar sem aperto no fim do mês.',
        actions: [
          'Cadastre sua receita fixa mensal em "+ Nova receita".',
          'Lance suas contas recorrentes (aluguel, internet, cartão) em "+ Novo gasto".',
        ],
        ctaLabel: 'Configurar Financeiro',
        ctaTarget: 'finance',
      });
    } else if (balance < 0) {
      score -= 20;
      insights.push({
        id: 'fin-negative',
        pillar: 'Financeiro',
        severity: 'alert',
        title: `Atenção: orçamento negativo em ${formatBRL(Math.abs(balance))}`,
        analysis: `Seus gastos (${formatBRL(totalExp)}) superaram a receita prevista (${formatBRL(
          totalIncome
        )}) neste mês.`,
        actions: [
          'Corte ou adie gastos não essenciais (lazer/assinaturas) pelos próximos 15 dias.',
          'Revise se há alguma renda extra ou ajuste possível para cobrir a diferença.',
        ],
        ctaLabel: 'Ajustar Financeiro',
        ctaTarget: 'finance',
      });
    } else {
      const savingsRate =
        totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

      if (totalIncome > 0 && savingsRate < 15) {
        score -= 8;
        insights.push({
          id: 'fin-tight',
          pillar: 'Financeiro',
          severity: 'warning',
          title: `Margem apertada: apenas ${savingsRate}% livre`,
          analysis: `Sobram ${formatBRL(balance)} após os gastos previstos. Qualquer imprevisto pode deixar o mês no vermelho.`,
          actions: [
            'Evite novas compras parceladas este mês.',
            'Tente guardar pelo menos 10% assim que o dinheiro cair na conta.',
          ],
          ctaLabel: 'Revisar gastos',
          ctaTarget: 'finance',
        });
      } else if (totalIncome > 0) {
        score += 6;
        insights.push({
          id: 'fin-healthy',
          pillar: 'Financeiro',
          severity: 'good',
          title: `Saúde financeira em dia (${savingsRate}% livre)`,
          analysis: `Você tem ${formatBRL(balance)} de saldo previsto este mês. Excelente controle entre receitas e despesas!`,
          actions: [
            'Transfira parte dessa sobra para sua reserva de emergência logo no início do mês.',
          ],
          ctaLabel: 'Ver panorama',
          ctaTarget: 'finance',
        });
      }

      if (unpaidExp.length > 0) {
        const currentDay = Number(todayStr.slice(8, 10));
        const dueSoon = unpaidExp.filter(
          (e) => e.due_day && e.due_day <= currentDay + 4
        );
        if (dueSoon.length > 0) {
          insights.push({
            id: 'fin-bills',
            pillar: 'Financeiro',
            severity: 'warning',
            title: `${dueSoon.length} conta(s) vencendo nos próximos dias`,
            analysis: `Contas pendentes próximas do vencimento: ${dueSoon
              .slice(0, 3)
              .map((e) => `${e.title} (dia ${e.due_day})`)
              .join(', ')}.`,
            actions: [
              'Separe o valor hoje e marque como pago no Financeiro assim que quitar para evitar juros.',
            ],
            ctaLabel: 'Marcar pagamentos',
            ctaTarget: 'finance',
          });
        }
      }
    }

    const clampedScore = Math.max(25, Math.min(100, score));
    const mood =
      clampedScore >= 80
        ? 'Equilíbrio ótimo! Sua rotina está bem encaminhada.'
        : clampedScore >= 60
        ? 'Rotina sob controle, mas há alguns pontos pedindo atenção.'
        : 'Sinal de alerta: desacelere, priorize o essencial e organize os excessos.';

    return {
      score: clampedScore,
      mood,
      insights,
      metrics: {
        todayEventsCount: todayEvents.length,
        tomorrowEventsCount: tomorrowEvents.length,
        overdueCount: overdueTasks.length,
        openTasksCount: openTasks.length,
        balance,
        totalIncome,
        totalExp,
        todayEvents,
        overdueTasks,
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

  function buildSmartReply(promptText: string): string {
    const q = promptText.toLowerCase();
    const {
      todayEventsCount,
      tomorrowEventsCount,
      overdueCount,
      openTasksCount,
      balance,
      totalIncome,
      totalExp,
      todayEvents,
      overdueTasks,
    } = analysis.metrics;

    if (q.includes('descans') || q.includes('cansad') || q.includes('sobrecar')) {
      if (todayEventsCount >= 3 || overdueCount >= 2) {
        return `${firstName}, sendo bem sincero com seus dados: hoje você tem ${todayEventsCount} compromisso(s) e ${overdueCount} tarefa(s) em atraso. Não tente zerar tudo na força! Escolha apenas 1 pendência importante, faça o básico bem feito e reserve pelo menos 30 minutos hoje sem tela nem cobrança para descansar.`;
      }
      return `${firstName}, sua carga hoje está tranquila (${todayEventsCount} compromisso(s) e ${openTasksCount} tarefa(s) aberta(s)). Sim, você pode — e deve — tirar um tempo para descansar sem culpa hoje!`;
    }

    if (q.includes('prioriz') || q.includes('hoje') || q.includes('fazer')) {
      const topTask = overdueTasks[0]?.title;
      const nextEv = todayEvents[0]
        ? `${todayEvents[0].event_time.slice(0, 5)} (${todayEvents[0].title})`
        : null;
      return `Plano prático para hoje, ${firstName}:\n1) ${
        nextEv
          ? `Fique atento ao compromisso às ${nextEv}.`
          : 'Você está livre de compromissos fixos hoje.'
      }\n2) ${
        topTask
          ? `Mate primeiro a pendência "${topTask}" para aliviar a cabeça.`
          : `Você tem ${openTasksCount} tarefa(s) aberta(s) — escolha no máximo 2 para concluir hoje.`
      }\n3) Faça pausas curtas entre uma entrega e outra.`;
    }

    if (q.includes('gast') || q.includes('dinheiro') || q.includes('financ') || q.includes('sald')) {
      if (totalIncome === 0 && totalExp === 0) {
        return `Ainda não encontrei lançamentos neste mês, ${firstName}. Vá em Financeiro, cadastre sua receita fixa e suas contas do mês que eu analiso seu saldo na hora.`;
      }
      return `Resumo financeiro do mês: você tem ${formatBRL(
        totalIncome
      )} de receita prevista contra ${formatBRL(
        totalExp
      )} de gastos, deixando um saldo de ${formatBRL(balance)}. ${
        balance < 0
          ? 'Vale segurar gastos variáveis agora e revisar assinaturas.'
          : 'Mantenha as contas em dia e tente guardar uma parte desse saldo.'
      }`;
    }

    return `Aqui está meu diagnóstico rápido para você, ${firstName}: seu índice de equilíbrio hoje está em ${analysis.score}/100. Você tem ${todayEventsCount} compromisso(s) hoje, ${tomorrowEventsCount} amanhã, ${overdueCount} tarefa(s) atrasada(s) e saldo previsto de ${formatBRL(
      balance
    )}. Minha recomendação principal: ${
      analysis.insights[0]?.title || 'mantenha a constância sem se cobrar perfeição.'
    }`;
  }

  async function askCoach(customPrompt?: string) {
    const text = (customPrompt ?? question).trim();
    if (!text || thinking) return;

    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setThinking(true);

    await new Promise((r) => setTimeout(r, 480));
    const reply = buildSmartReply(text);

    setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    setThinking(false);
  }

  const filteredInsights =
    pillarFilter === 'all'
      ? analysis.insights
      : analysis.insights.filter((i) => i.pillar === pillarFilter);

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">COPILOTO DE ROTINA</div>
          <h1>Dicas &amp; Bem-estar</h1>
          <p className="subtitle">
            Análise realista da sua agenda, tarefas e finanças com sugestões práticas.
          </p>
        </div>
      </div>

      {/* Hero Score & Diagnosis */}
      <div className="coach-hero">
        <div className="coach-hero-main">
          <div className="welcome-eyebrow">DIAGNÓSTICO EM TEMPO REAL</div>
          <h2>
            {firstName}, seu índice de equilíbrio hoje é{' '}
            <span style={{ color: 'var(--accent)' }}>{analysis.score}/100</span>
          </h2>
          <p>{analysis.mood}</p>
          <div className="coach-pills">
            <span>📅 {analysis.metrics.todayEventsCount} hoje</span>
            <span>☑ {analysis.metrics.openTasksCount} abertas</span>
            <span>
              💰 {formatBRL(analysis.metrics.balance)} saldo do mês
            </span>
          </div>
        </div>
        <div className="coach-score-ring" aria-label={`Índice ${analysis.score} de 100`}>
          <strong>{analysis.score}</strong>
          <small>de 100</small>
        </div>
      </div>

      {/* Interactive AI Assistant Box */}
      <div className="panel">
        <div className="panel-head">
          <h2>✦ Pergunte ao seu Copiloto</h2>
          <span className="muted" style={{ fontSize: 11 }}>
            Respostas baseadas nos seus dados reais
          </span>
        </div>

        <div className="filter-row">
          {[
            'O que devo priorizar hoje?',
            'Preciso descansar?',
            'Como está meu financeiro?',
            'Resumo da minha semana',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chip"
              onClick={() => askCoach(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        {messages.length > 0 && (
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
              <div className="coach-msg bot muted">
                Analisando sua agenda, tarefas e finanças...
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            askCoach();
          }}
          style={{ display: 'flex', gap: 8, marginTop: 10 }}
        >
          <input
            type="text"
            placeholder="Ex.: Estou com muita coisa hoje, o que corto primeiro?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{
              flex: 1,
              border: '1px solid var(--line)',
              background: 'var(--input-bg)',
              borderRadius: 11,
              padding: '10px 12px',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
          <button className="btn" type="submit" disabled={thinking}>
            {thinking ? 'Pensando...' : 'Perguntar'}
          </button>
        </form>
      </div>

      {/* Filter by Pillar */}
      <div className="filter-row" style={{ marginBottom: 16 }}>
        {(
          ['all', 'Agenda & Energia', 'Tarefas & Foco', 'Financeiro'] as const
        ).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`chip ${pillarFilter === tab ? 'active' : ''}`}
            onClick={() => setPillarFilter(tab)}
          >
            {tab === 'all' ? 'Todas as áreas' : tab}
          </button>
        ))}
      </div>

      {/* Structured Insights Grid */}
      <div className="tips-grid">
        {filteredInsights.map((item) => (
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
              <span className="muted" style={{ fontSize: 11 }}>
                {item.severity === 'alert'
                  ? 'Prioridade alta'
                  : item.severity === 'warning'
                  ? 'Atenção'
                  : item.severity === 'good'
                  ? 'Tudo certo'
                  : 'Sugestão'}
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
    </section>
  );
}
